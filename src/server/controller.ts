import { Map } from 'immutable'
import * as requests from 'requests'
import * as responses from 'responses'
import { Result } from 'result'
import { Session } from 'session'
import {
  Feedback,
  Question,
  responseToString,
  ResponseType,
  validateResponse,
} from 'session/quiz'
import { User } from 'session/user'
import { Server, Socket } from 'socket.io'

const debug = require('debug')('app:controller')

type SessionEventArgs<T> = Partial<T>
type SessionEventHandler<T> = (args?: SessionEventArgs<T>) => void

/**
 * Manages sessions - adding, removing, and handling specific actions
 * requested by clients.
 */
export class SessionController {
  private _sessions = Map<string, Session>()

  /**
   * Creates a new SessionController instance
   * @param io the socket.io Server instance to use for handlers
   */
  constructor(private io: Server) {}

  /**
   * The current Sessions, keyed on Session.id
   */
  get sessions(): Map<string, Session> {
    return this._sessions
  }

  /**
   * Adds a Session
   * @param session Session to add
   */
  private addSession(session: Session) {
    this._sessions = this._sessions.set(session.id, session)
  }

  /**
   * Removes a Session
   * @param session Session to remove
   */
  private removeSession(session: Session) {
    this._sessions = this._sessions.delete(session.id)
  }

  /**
   * Creates a new Session with `socket` as its owner
   * @param socket Client socket creating the Session
   */
  createSession(
    socket: Socket
  ): SessionEventHandler<requests.CreateNewSession> {
    return () => {
      const session = new Session(socket.id)
      debug(`client ${socket.id} creating session with id ${session.id}`)

      this.addSession(session)

      socket.join(session.id)
      this.emit(socket, new responses.CreateSessionSuccess(session.id))
    }
  }

  /**
   * Adds a client socket to a Session, if it exists, and if the
   * client id is not the owner
   * @param socket Client socket joining the Session
   */
  addUserToSession(socket: Socket): SessionEventHandler<requests.JoinSession> {
    return (args?: SessionEventArgs<requests.JoinSession>) => {
      if (args == null) {
        debug('no args passed to addUserToSession')
        this.emit(socket, new responses.JoinSessionFailed())
        return
      }

      debug(
        `client ${socket.id} joining session ${args.id} with name ${args.name}`
      )
      const session = this.sessions.get(args.id ?? '')
      if (session == null || args.name == null) {
        this.emit(socket, new responses.JoinSessionFailed())
      } else {
        if (session.addUser(new User(args.name, socket.id))) {
          // Add to room
          socket.join(session.id)

          // Broadcast that a user has joined
          this.emit(
            session.id,
            new responses.JoinSessionSuccess(session.id, args.name)
          )
        } else {
          this.emit(socket, new responses.JoinSessionFailed(session.id))
        }
      }
    }
  }

  /**
   * Adds a question to the Session's quiz
   * @param socket Client socket owning the Session
   */
  addQuestionToSession(
    socket: Socket
  ): SessionEventHandler<requests.AddQuestion> {
    return (args?: SessionEventArgs<requests.AddQuestion>) => {
      if (args == null) {
        debug('no args passed to addQuestionToSession')
        this.emit(socket, new responses.AddQuestionFailed())
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(`client ${socket.id} was not owner of any session`)
        this.emit(socket, new responses.AddQuestionFailed())
      } else {
        debug(`client owns session ${session.id}`)
        if (
          args.question == null ||
          args.question.text == null ||
          args.question.body == null ||
          args.question.timeLimit == null
        ) {
          debug('question was missing or missing fields')
          this.emit(socket, new responses.AddQuestionFailed(session.id))
          return
        }

        const { text, body, timeLimit } = args.question
        const result = Question.parse(text, body, timeLimit)
        if (result.type === Result.Failure) {
          debug('question has invalid format')
          this.emit(socket, new responses.AddQuestionFailed(session.id))
        } else {
          debug('question added')
          const { data: question } = result
          question.onTimeout = () => {
            // End the question
            question.end()

            // Broadcast to users that question ended
            this.emit(
              session.id,
              new responses.QuestionEndedSuccess(session.id, question.index)
            )
          }
          session.quiz.addQuestion(question)
          this.emit(socket, new responses.AddQuestionSuccess(session.id))
        }
      }
    }
  }

  /**
   * Removes a user from the owner's Session
   * @param socket Client socket owning the Session
   */
  removeUserFromSession(
    socket: Socket
  ): SessionEventHandler<requests.SessionKick> {
    return (args?: SessionEventArgs<requests.SessionKick>) => {
      if (args == null) {
        debug('no args passed to removeUserFromSession')
        this.emit(socket, new responses.SessionKickFailed())
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(`could not find session ${args.session} with owner ${socket.id}`)
        this.emit(socket, new responses.SessionKickFailed(session?.id))
      } else if (args.name == null) {
        debug('missing name field')
        this.emit(socket, new responses.SessionKickFailed(session?.id))
      } else {
        const user = session.removeUser(args.name)
        if (user == null) {
          debug(`could not remove user ${args.name}`)
          this.emit(socket, new responses.SessionKickFailed(session.id))
          return
        }

        debug(`removed user ${args.name}`)

        // Broadcast the kick event
        this.emit(
          session.id,
          new responses.SessionKickSuccess(session.id, args.name)
        )

        // Force remove the kicked user
        this.io.in(user.id).socketsLeave(session.id)
      }
    }
  }

  /**
   * Starts the owner's Session
   * @param socket Client socket owning the Session
   */
  startSession(socket: Socket): SessionEventHandler<requests.SessionStart> {
    return (args?: SessionEventArgs<requests.SessionStart>) => {
      if (args == null) {
        debug('no args passed to startSession')
        this.emit(socket, new responses.SessionStartFailed())
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(`could not find session ${args.session} with owner ${socket.id}`)
        this.emit(socket, new responses.SessionStartFailed(args.session))
        return
      }

      if (session.isStarted) {
        debug(`session ${session.id} is already started`)
        this.emit(socket, new responses.SessionStartFailed(session.id))
        return
      }

      debug(`session ${session.id} starting`)

      // Start session and broadcast event
      session.start()
      this.emit(session.id, new responses.SessionStartedSuccess(session.id))
    }
  }

  /**
   * Pushes the next question to users
   * @param socket Client socket owning the Session
   */
  pushNextQuestion(socket: Socket): SessionEventHandler<requests.NextQuestion> {
    return (args?: SessionEventArgs<requests.NextQuestion>) => {
      if (args == null) {
        debug('no args passed to pushNextQuestion')
        this.emit(socket, new responses.NextQuestionFailed())
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(`could not find session with owner ${socket.id}`)
        this.emit(socket, new responses.NextQuestionFailed(session?.id))
        return
      }

      if (!session.isStarted) {
        debug(`session ${session.id} is not started, not sending next question`)
        this.emit(socket, new responses.NextQuestionFailed(session.id))
        return
      }

      const nextQuestion = session.quiz.advanceToNextQuestion()
      if (nextQuestion == null) {
        debug(`session ${session.id} - quiz has no more questions`)
        this.emit(
          socket,
          new responses.NextQuestionFailed(
            session.id,
            session.quiz.numQuestions,
            session.quiz.currentQuestionIndex
          )
        )
        return
      }

      debug(`session ${session.id} sending next question`)

      // Broadcast the next question
      this.emit(
        session.id,
        new responses.NextQuestion(
          session.id,
          session.quiz.currentQuestionIndex,
          nextQuestion
        )
      )
    }
  }

  /**
   * Checks and adds a user's response to a Quiz Question
   * @param socket Client socket submitting response
   */
  addQuestionResponse(
    socket: Socket
  ): SessionEventHandler<requests.QuestionResponse> {
    return (args?: SessionEventArgs<requests.QuestionResponse>) => {
      if (args == null) {
        debug('no args passed to addQuestionResponse')
        this.emit(socket, new responses.QuestionResponseFailed())
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null) {
        debug(`could not find session ${args.session} to respond to`)
        this.emit(socket, new responses.QuestionResponseFailed())
        return
      }

      const user = session.findUserByName(args.name ?? '')
      if (user == null || user.id !== socket.id) {
        debug(`could not add response by unknown user`)
        this.emit(socket, new responses.QuestionResponseFailed(session.id))
        return
      }

      if (session.quiz.currentQuestion == null) {
        debug(
          `could not respond to session ${session.id} - not started (question null)`
        )
        this.emit(socket, new responses.QuestionResponseFailed(session.id))
        return
      }

      if (
        args.index == null ||
        args.index !== session.quiz.currentQuestionIndex
      ) {
        debug(
          `could not respond to session ${session.id} - args.index (${args.index}) out of range`
        )
        this.emit(socket, new responses.QuestionResponseFailed(session.id))
        return
      }

      if (!validateResponse(args.response)) {
        debug(`could not respond to session ${session.id} - args.response null`)
        this.emit(socket, new responses.QuestionResponseFailed(session.id))
        return
      }
      const response = <ResponseType>args.response

      const question = session.quiz.questionAt(args.index)!
      let isCorrect: boolean

      try {
        isCorrect = question.addResponse(response)
      } catch (error) {
        debug(`failed to add response to ${session.id} question ${args.index}`)
        this.emit(socket, new responses.QuestionResponseFailed(session.id))
        return
      }

      debug(
        `successfully added response to ${session.id} question ${args.index}`
      )

      const firstCorrect = question.firstCorrect ?? ''

      // Send statistics to owner
      this.emit(
        session.owner,
        new responses.QuestionResponseAdded(
          session.id,
          args.index,
          user.name,
          responseToString(response),
          isCorrect,
          firstCorrect,
          question.frequencyOf(response),
          question.relativeFrequencyOf(response)
        )
      )

      // Send grade to user
      this.emit(
        socket,
        new responses.QuestionResponseSuccess(
          session.id,
          args.index,
          firstCorrect === user.name,
          isCorrect
        )
      )
    }
  }

  /**
   * Ends a Session
   * @param socket Client socket that owns the Session
   */
  endSession(socket: Socket): SessionEventHandler<requests.EndSession> {
    return (args?: SessionEventArgs<requests.EndSession>) => {
      if (args == null) {
        debug('no args passed to endSession')
        this.emit(socket, new responses.SessionEndFailed())
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(
          `could not find session ${args.session} with owner ${socket.id} to end`
        )
        this.emit(socket, new responses.SessionEndFailed(session?.id))
        return
      }

      if (session.hasEnded) {
        debug(`session ${args.session} already ended`)
        this.emit(socket, new responses.SessionEndFailed(session.id))
        return
      }

      debug(`session ${session.id} ending`)
      session.end()

      // Broadcast to all users Session has ended
      this.emit(session.id, new responses.SessionEndedSuccess(session.id))

      // Remove all except owner from Session (so they can request data until they disconnect)
      this.io.except(session.owner).socketsLeave(session.id)
    }
  }

  /**
   * Ends the current Question, making it so users cannot respond.
   * @param socket The socket that owns the Session and sent the event.
   */
  endCurrentQuestion(
    socket: Socket
  ): SessionEventHandler<requests.EndQuestion> {
    return (args?: SessionEventArgs<requests.EndQuestion>) => {
      if (args == null) {
        debug('no args passed to endCurrentQuestion')
        this.emit(socket, new responses.EndQuestionFailed())
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(
          `could not find session ${args.session} with owner ${socket.id} to end question`
        )
        this.emit(socket, new responses.EndQuestionFailed(session?.id))
        return
      }

      if (!session.isStarted || session.hasEnded) {
        debug(`session ${args.session} is not ready`)
        this.emit(socket, new responses.EndQuestionFailed(session.id))
        return
      }

      const currentQuestion = session.quiz.currentQuestion
      const currentIndex = session.quiz.currentQuestionIndex
      if (currentQuestion == null || currentIndex !== args.question) {
        debug(
          `session ${args.session} quiz is not on the argument question index ${args.question}`
        )
        this.emit(socket, new responses.EndQuestionFailed(session.id))
        return
      }

      debug(
        `successfully ended question ${currentIndex} in session ${session.id}`
      )

      // End the question
      currentQuestion.end()

      // Broadcast to users that question ended
      this.emit(
        session.id,
        new responses.QuestionEndedSuccess(session.id, currentIndex)
      )
    }
  }

  /**
   * Adds feedback to a question.
   * @param socket  The socket that has joined a session and is submitting feedback.
   * @returns
   */
  submitQuestionFeedback(
    socket: Socket
  ): SessionEventHandler<requests.SubmitFeedback> {
    return (args?: SessionEventArgs<requests.SubmitFeedback>) => {
      if (args == null) {
        debug('no args passed to submitQuestionFeedback')
        this.emit(socket, new responses.SubmitFeedbackFailed())
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null) {
        debug(`could not find session ${args.session} to submit feedback to`)
        this.emit(socket, new responses.SubmitFeedbackFailed(args.session))
        return
      }

      // Check name and validate user exists
      const user = session.findUserByName(args.name ?? '')
      if (user == null || user.id !== socket.id) {
        debug(
          `could not submit feedback from unknown user ${args.name} to ${args.session}`
        )
        this.emit(socket, new responses.SubmitFeedbackFailed(args.session))
        return
      }

      // Check question index - any index that has been seen is valid
      if (
        args.question == null ||
        args.question < 0 ||
        args.question > session.quiz.currentQuestionIndex
      ) {
        debug(
          `could not submit feedback from ${args.name} to ${session.id} with bad question index ${args.question}`
        )
        this.emit(socket, new responses.SubmitFeedbackFailed(args.session))
        return
      }

      // Check feedback
      if (args.feedback == null) {
        debug(`could not submit feedback with empty body`)
        this.emit(socket, new responses.SubmitFeedbackFailed(args.session))
        return
      }

      // Ensure feedback passes constraints
      if (Feedback.validate(args.feedback).length !== 0) {
        debug(`could not validate feedback: ${args.feedback}`)
        this.emit(socket, new responses.SubmitFeedbackFailed(args.session))
        return
      }
      const feedback = new Feedback(
        args.feedback.rating!,
        args.feedback.message!
      )

      // Ensure feedback is not duplicated
      const question = session.quiz.questionAt(args.question)
      if (question == null || !question.addFeedback(user.name, feedback)) {
        debug(
          `could add feedback for user ${user.name} to ${session.id}: duplicate`
        )
        this.emit(socket, new responses.SubmitFeedbackFailed(args.session))
        return
      }

      debug(
        `received feedback for question ${question.index} in session ${session.id}`,
        feedback
      )

      // Tell session owner that feedback added
      this.emit(
        session.owner,
        new responses.FeedbackSubmitted(
          session.id,
          user.name,
          args.question,
          feedback
        )
      )

      // Tell submitter that operation succeeded
      this.emit(socket.id, new responses.SubmitFeedbackSuccess(session.id))
    }
  }

  /**
   * Sends a hint for a question to users in the session.
   * @param socket The client socket that owns the session.
   */
  sendQuestionHint(socket: Socket): SessionEventHandler<requests.SendHint> {
    return (args?: SessionEventArgs<requests.SendHint>) => {
      if (args == null) {
        debug('no args passed to sendQuestionHint')
        this.emit(socket, new responses.SendHintFailed())
        return
      }

      // Can only send non-empty hint
      if (args.hint == null || args.hint.length === 0) {
        debug('hint null or empty')
        this.emit(socket, new responses.SendHintFailed())
        return
      }

      // Check session exists and this socket created it
      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(
          `could not find session ${args.session} with owner ${socket.id} to end question`
        )
        this.emit(socket, new responses.SendHintFailed(session?.id))
        return
      }

      // Can only send hints if quiz has started
      if (!session.isStarted || session.hasEnded) {
        debug(`session ${args.session} is not ready`)
        this.emit(socket, new responses.SendHintFailed(session.id))
        return
      }

      // Can only send hint for the current question
      const currentQuestion = session.quiz.currentQuestion
      const currentIndex = session.quiz.currentQuestionIndex
      if (currentQuestion == null || currentIndex !== args.question) {
        debug(
          `session ${args.session} quiz is not on the argument question index ${args.question}`
        )
        this.emit(socket, new responses.SendHintFailed(session.id))
        return
      }

      debug(`${socket.id} sent hint to session ${session.id}`, args.hint)

      // Notify sender of success
      this.emit(socket, new responses.SendHintSuccess(session.id))

      // Send hint to room
      this.emitExcept(
        session.id,
        socket.id,
        new responses.HintReceived(session.id, args.question, args.hint)
      )
    }
  }

  /**
   * Cleans up resources owned by the client, removing users from Session
   * if an owner disconnects
   * @param socket Client socket that's disconnecting
   */
  handleDisconnect(socket: Socket): SessionEventHandler<string> {
    return (reason?: string) => {
      const session = this.sessions.find(
        (session) => session.owner === socket.id
      )
      debug(`client ${socket.id} is disconnecting; reason: ${reason}`)
      if (session != null) {
        debug(`disconnecting client ${socket.id} owns session ${session.id}`)

        // Allow session cleanup by invoking end
        session.end()
        this.removeSession(session)

        // Broadcast that session has ended (because the owner left),
        // and force disconnect all users in the session's room
        this.emit(session.id, new responses.SessionEndedSuccess(session.id))
        this.io.to(session.id).socketsLeave(session.id)

        this.removeSession(session)
        debug(
          `session ${session.id} removed, sessions remaining:`,
          this.sessions.count()
        )
      } else {
        debug(`client ${socket.id} does not own a session`)
        socket.rooms.forEach((room) => {
          if (room !== socket.id && this.sessions.has(room)) {
            const session = this.sessions.get(room)!
            const user = session.findUserById(socket.id)
            if (user != null) {
              debug(`client ${socket.id} leaving room ${room}`)

              // Remove the user from the session instance
              session.removeUser(user.name)

              // Notify room that a user disconnected
              this.emit(
                room,
                new responses.UserDisconnected(session.id, user.name)
              )
            }
          }
        })
      }
    }
  }

  /**
   * Emits a response to a target session, socket, or room.
   * @param target either an ID string or Socket to emit to
   * @param response the response to the client
   */
  private emit<Response extends responses.EventResponse>(
    target: string | Socket,
    response: Response
  ) {
    if (target instanceof Socket) {
      target.emit(response.event, response)
    } else {
      this.io.to(target).emit(response.event, response)
    }
  }

  /**
   * Emits a response to a target ID, except for a specific ID.
   * @param target an ID string to emit to
   * @param except an ID string to not emit to
   * @param response the response to the client
   */
  private emitExcept<Response extends responses.EventResponse>(
    room: string,
    except: string,
    response: Response
  ) {
    this.io.to(room).except(except).emit(response.event, response)
  }
}
