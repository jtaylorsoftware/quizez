import SessionEvent from 'api/event'
import { ResponseType } from 'api/question'
import {
  AddQuestion,
  CreateNewSession,
  EditQuestion,
  EndQuestion,
  EndSession,
  JoinSession,
  NextQuestion,
  QuestionResponse,
  RemoveQuestion,
  SendHint,
  SessionKick,
  StartSession,
  SubmitFeedback,
} from 'api/request'
import { EventCallback, EventResponse, ResponseStatus } from 'api/response'
import { Map } from 'immutable'
import { Result } from 'result'
import { Session } from 'session'
import {
  Feedback,
  fromSubmission,
  responseToString,
  validateResponse,
} from 'session/quiz'
import { User } from 'session/user'
import { Server, Socket } from 'socket.io'

const debug = require('debug')('app:controller')

// Handler for session related requests
type SessionEventHandler<T> = (
  args?: SessionEventArgs<T> | EventCallback | undefined,
  callback?: EventCallback | undefined
) => void
type SessionEventArgs<T> = Partial<T>

// Handler for socket related events (connect, disconnect)
type SocketEventHandler<T> = (args: T) => void

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
  createSession(socket: Socket): SessionEventHandler<CreateNewSession> {
    return (args, callback) => {
      if (args instanceof Function) {
        // not called with event arguments, so any arguments received should be the callback
        callback = args
      }
      if (callback == null || !(callback instanceof Function)) {
        debug('callback was null')
        return
      }

      const session = new Session(socket.id)
      debug(`client ${socket.id} creating session with id ${session.id}`)

      this.addSession(session)

      socket.join(session.id)
      // this.emit(socket, new CreateSessionSuccess(session.id))
      callback?.({
        status: ResponseStatus.Success,
        event: SessionEvent.CreatedSession,
        session: session.id,
        data: session.id,
      })
    }
  }

  /**
   * Adds a client socket to a Session, if it exists, and if the
   * client id is not the owner
   * @param socket Client socket joining the Session
   */
  addUserToSession(socket: Socket): SessionEventHandler<JoinSession> {
    return (args, callback) => {
      if (args == null || args instanceof Function) {
        debug('no args passed to addUserToSession')
        args?.({
          status: ResponseStatus.Failure,
          event: SessionEvent.JoinSession,
          session: null,
          errors: null,
        })
        return
      }

      if (callback == null || !(callback instanceof Function)) {
        debug('callback was null or not a function')
        return
      }

      debug(
        `client ${socket.id} joining session ${args.id} with name ${args.name}`
      )
      const session = this.sessions.get(args.id ?? '')
      if (session == null) {
        debug(`could not find session ${args.id ?? ''} for user to join`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.JoinSession,
          session: args.id == null ? null : args.id,
          errors: [
            { field: 'session', value: args.id == null ? null : args.id },
          ],
        })
        return
      } else if (args.name == null) {
        debug(`user joining name was null`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.JoinSession,
          session: session.id,
          errors: [
            { field: 'name', value: args.name == null ? null : args.name },
          ],
        })
        return
      } else {
        if (session.addUser(new User(args.name, socket.id))) {
          debug(`user ${args.name} added to session ${session.id}`)

          // Add to room
          socket.join(session.id)

          // Notify user of join success
          callback({
            status: ResponseStatus.Success,
            event: SessionEvent.JoinSession,
            session: session.id,
            data: null,
          })

          // Broadcast that a user has joined
          this.emitExcept(session.id, socket.id, {
            status: ResponseStatus.Success,
            event: SessionEvent.UserJoinedSession,
            session: session.id,
            data: {
              name: args.name,
            },
          })
        } else {
          debug(`user ${args.name} could not join session ${session.id}`)
          callback({
            status: ResponseStatus.Failure,
            event: SessionEvent.JoinSession,
            session: session.id,
            errors: [{ field: 'name', value: args.name }],
          })
        }
      }
    }
  }

  /**
   * Adds a question to the Session's quiz
   * @param socket Client socket owning the Session
   */
  addQuestionToSession(socket: Socket): SessionEventHandler<AddQuestion> {
    return (args, callback) => {
      if (args == null || args instanceof Function) {
        debug('no args passed to addQuestionToSession')
        args?.({
          status: ResponseStatus.Failure,
          event: SessionEvent.AddQuestion,
          session: null,
          errors: null,
        })
        return
      }
      if (callback == null || !(callback instanceof Function)) {
        debug('callback was null or not a function')
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(`client ${socket.id} was not owner of any session`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.AddQuestion,
          session: session == null ? null : session.id,
          errors: [
            { field: 'session', value: session == null ? null : session.id },
          ],
        })
      } else {
        debug(`client owns session ${session.id}`)

        if (
          args.question == null ||
          args.question.text == null ||
          args.question.body == null ||
          args.question.timeLimit == null
        ) {
          debug('question was missing or missing fields')
          callback({
            status: ResponseStatus.Failure,
            event: SessionEvent.AddQuestion,
            session: session.id,
            errors: [{ field: 'question', value: null }],
          })
          return
        }

        const result = fromSubmission(args.question)
        if (result.type === Result.Failure) {
          debug('question has invalid format')
          callback({
            status: ResponseStatus.Failure,
            event: SessionEvent.AddQuestion,
            session: session.id,
            errors: result.errors,
          })
        } else {
          debug('question added')
          const { data: question } = result

          session.quiz.addQuestion(question)

          // Use callback to notify session owner of success
          callback({
            status: ResponseStatus.Success,
            event: SessionEvent.AddQuestion,
            session: session.id,
            data: null,
          })

          // Set up the Question's timeout for when it ends
          question.onTimeout = () => {
            // End the question
            question.end()

            // Broadcast to users that question ended
            this.emit(session.id, {
              status: ResponseStatus.Success,
              event: SessionEvent.QuestionEnded,
              session: session.id,
              data: {
                question: question.index,
              },
            })
          }
        }
      }
    }
  }

  /**
   * Removes a question from the Session's quiz
   * @param socket Client socket owning the Session
   */
  removeQuestionFromSession(
    socket: Socket
  ): SessionEventHandler<RemoveQuestion> {
    return (args, callback) => {
      if (args == null || args instanceof Function) {
        debug('no args passed to addQuestionToSession')
        args?.({
          status: ResponseStatus.Failure,
          event: SessionEvent.RemoveQuestion,
          session: null,
          errors: null,
        })
        return
      }
      if (callback == null || !(callback instanceof Function)) {
        debug('callback was null or not a function')
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(`client ${socket.id} was not owner of any session`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.RemoveQuestion,
          session: session == null ? null : session.id,
          errors: [
            { field: 'session', value: session == null ? null : session.id },
          ],
        })
      } else {
        debug(`client owns session ${session.id}`)

        if (args.index == null) {
          debug('index was null')
          callback({
            status: ResponseStatus.Failure,
            event: SessionEvent.RemoveQuestion,
            session: session.id,
            errors: [{ field: 'index', value: null }],
          })
          return
        }

        if (
          session.isStarted &&
          session.quiz.currentQuestionIndex === args.index
        ) {
          debug('cannot remove current question')
          callback({
            status: ResponseStatus.Failure,
            event: SessionEvent.RemoveQuestion,
            session: session.id,
            errors: [{ field: 'index', value: args.index }],
          })
          return
        }

        if (session.quiz.removeQuestion(args.index) == null) {
          debug('could not remove question')
          callback({
            status: ResponseStatus.Failure,
            event: SessionEvent.RemoveQuestion,
            session: session.id,
            errors: [{ field: 'index', value: args.index }],
          })
          return
        }

        debug('question removed')

        // Use callback to notify session owner of success
        callback({
          status: ResponseStatus.Success,
          event: SessionEvent.RemoveQuestion,
          session: session.id,
          data: {
            index: args.index,
          },
        })
      }
    }
  }

  /**
   * Edits a question in the Session's quiz
   * @param socket Client socket owning the Session
   */
  editQuestionInSession(socket: Socket): SessionEventHandler<EditQuestion> {
    return (args, callback) => {
      if (args == null || args instanceof Function) {
        debug('no args passed to addQuestionToSession')
        args?.({
          status: ResponseStatus.Failure,
          event: SessionEvent.EditQuestion,
          session: null,
          errors: null,
        })
        return
      }
      if (callback == null || !(callback instanceof Function)) {
        debug('callback was null or not a function')
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(`client ${socket.id} was not owner of any session`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.EditQuestion,
          session: session == null ? null : session.id,
          errors: [
            { field: 'session', value: session == null ? null : session.id },
          ],
        })
      } else {
        debug(`client owns session ${session.id}`)
        if (
          args.question == null ||
          args.question.text == null ||
          args.question.body == null ||
          args.question.timeLimit == null
        ) {
          debug('question was missing or missing fields')
          callback({
            status: ResponseStatus.Failure,
            event: SessionEvent.EditQuestion,
            session: session.id,
            errors: [{ field: 'question', value: null }],
          })
          return
        }

        if (
          args.index == null ||
          args.index < 0 ||
          args.index >= session.quiz.numQuestions
        ) {
          debug('index was null or out of range')
          callback({
            status: ResponseStatus.Failure,
            event: SessionEvent.EditQuestion,
            session: session.id,
            errors: [
              { field: 'index', value: args.index == null ? null : args.index },
            ],
          })
          return
        }

        if (
          session.isStarted &&
          session.quiz.currentQuestionIndex === args.index
        ) {
          debug('cannot edit current question')
          callback({
            status: ResponseStatus.Failure,
            event: SessionEvent.EditQuestion,
            session: session.id,
            errors: [{ field: 'index', value: args.index }],
          })
          return
        }

        const result = fromSubmission(args.question)
        if (result.type === Result.Failure) {
          debug('question has invalid format')
          callback({
            status: ResponseStatus.Failure,
            event: SessionEvent.EditQuestion,
            session: session.id,
            errors: result.errors,
          })
        } else {
          const { data: question } = result

          if (session.quiz.replaceQuestion(args.index, question) == null) {
            debug('could not edit question')
            callback({
              status: ResponseStatus.Failure,
              event: SessionEvent.EditQuestion,
              session: session.id,
              errors: [{ field: 'type', value: question.body.type }],
            })
            return
          }

          debug('question edited')

          // Use callback to notify session owner of success
          callback({
            status: ResponseStatus.Success,
            event: SessionEvent.AddQuestion,
            session: session.id,
            data: null,
          })

          // Set up the Question's timeout for when it ends
          question.onTimeout = () => {
            // End the question
            question.end()

            // Broadcast to users that question ended
            this.emit(session.id, {
              status: ResponseStatus.Success,
              event: SessionEvent.QuestionEnded,
              session: session.id,
              data: {
                question: question.index,
              },
            })
          }
        }
      }
    }
  }

  /**
   * Removes a user from the owner's Session
   * @param socket Client socket owning the Session
   */
  removeUserFromSession(socket: Socket): SessionEventHandler<SessionKick> {
    return (args, callback) => {
      if (args == null || args instanceof Function) {
        debug('no args passed to removeUserFromSession')
        args?.({
          status: ResponseStatus.Failure,
          event: SessionEvent.SessionKick,
          session: null,
          errors: null,
        })
        return
      }
      if (callback == null || !(callback instanceof Function)) {
        debug('callback was null or not a function')
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(`could not find session ${args.session} with owner ${socket.id}`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.SessionKick,
          session: session == null ? null : session.id,
          errors: [
            { field: 'session', value: session == null ? null : session.id },
          ],
        })
      } else if (args.name == null) {
        debug('missing name field')
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.SessionKick,
          session: session.id,
          errors: [{ field: 'name', value: null }],
        })
      } else {
        const user = session.removeUser(args.name)
        if (user == null) {
          debug(`could not remove user ${args.name}`)
          callback({
            status: ResponseStatus.Failure,
            event: SessionEvent.SessionKick,
            session: session.id,
            errors: [{ field: 'name', value: args.name }],
          })
          return
        }

        debug(`removed user ${args.name}`)

        // Notify session owner the kick was successful
        callback({
          status: ResponseStatus.Success,
          event: SessionEvent.SessionKick,
          session: session.id,
          data: {
            name: args.name,
          },
        })

        // Broadcast the kick event
        this.emitExcept(session.id, session.owner, {
          status: ResponseStatus.Success,
          event: SessionEvent.UserKicked,
          session: session.id,
          data: {
            name: args.name,
          },
        })

        // Force remove the kicked user
        this.io.in(user.id).socketsLeave(session.id)
      }
    }
  }

  /**
   * Starts the owner's Session
   * @param socket Client socket owning the Session
   */
  startSession(socket: Socket): SessionEventHandler<StartSession> {
    return (args, callback) => {
      if (args == null || args instanceof Function) {
        debug('no args passed to startSession')
        args?.({
          status: ResponseStatus.Failure,
          event: SessionEvent.StartSession,
          session: null,
          errors: null,
        })
        return
      }
      if (callback == null || !(callback instanceof Function)) {
        debug('callback was null or not a function')
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(`could not find session ${args.session} with owner ${socket.id}`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.StartSession,
          session: session == null ? null : session.id,
          errors: [
            { field: 'session', value: session == null ? null : session.id },
          ],
        })
        return
      }

      if (session.isStarted) {
        debug(`session ${session.id} is already started`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.StartSession,
          session: session.id,
          errors: null,
        })
        return
      }

      debug(`session ${session.id} starting`)

      session.start()

      // Notify session owner of success
      callback({
        status: ResponseStatus.Success,
        event: SessionEvent.StartSession,
        session: session.id,
        data: null,
      })

      // Broadcast start to users
      this.emitExcept(session.id, session.owner, {
        status: ResponseStatus.Success,
        event: SessionEvent.SessionStarted,
        session: session.id,
        data: null,
      })
    }
  }

  /**
   * Pushes the next question to users
   * @param socket Client socket owning the Session
   */
  pushNextQuestion(socket: Socket): SessionEventHandler<NextQuestion> {
    return (args, callback) => {
      if (args == null || args instanceof Function) {
        debug('no args passed to pushNextQuestion')
        args?.({
          status: ResponseStatus.Failure,
          event: SessionEvent.NextQuestion,
          session: null,
          errors: null,
        })
        return
      }
      if (callback == null || !(callback instanceof Function)) {
        debug('callback was null or not a function')
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(`could not find session with owner ${socket.id}`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.NextQuestion,
          session: session == null ? null : session.id,
          errors: [
            { field: 'session', value: session == null ? null : session.id },
          ],
        })
        return
      }

      if (!session.isStarted) {
        debug(`session ${session.id} is not started, not sending next question`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.NextQuestion,
          session: session.id,
          errors: null,
        })
        return
      }

      const nextQuestion = session.quiz.advanceToNextQuestion()
      if (nextQuestion == null) {
        debug(`session ${session.id} - quiz has no more questions`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.NextQuestion,
          session: session.id,
          errors: [
            { field: 'numQuestions', value: session.quiz.numQuestions },
            {
              field: 'currentQuestion',
              value: session.quiz.currentQuestionIndex,
            },
          ],
        })
        return
      }

      debug(`session ${session.id} sending next question`)

      const index = session.quiz.currentQuestionIndex
      const question = nextQuestion.data

      // Notify session owner of success
      callback({
        status: ResponseStatus.Success,
        event: SessionEvent.NextQuestion,
        session: session.id,
        data: { index, question },
      })

      // Broadcast the next question to users
      this.emitExcept(session.id, session.owner, {
        status: ResponseStatus.Success,
        event: SessionEvent.NextQuestion,
        session: session.id,
        data: { index, question },
      })
    }
  }

  /**
   * Checks and adds a user's response to a Quiz Question
   * @param socket Client socket submitting response
   */
  addQuestionResponse(socket: Socket): SessionEventHandler<QuestionResponse> {
    return (args, callback) => {
      if (args == null || args instanceof Function) {
        debug('no args passed to addQuestionResponse')
        args?.({
          status: ResponseStatus.Failure,
          event: SessionEvent.QuestionResponse,
          session: null,
          errors: null,
        })
        return
      }
      if (callback == null || !(callback instanceof Function)) {
        debug('callback was null or not a function')
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null) {
        debug(`could not find session ${args.session} to respond to`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.QuestionResponse,
          session: args.session == null ? null : args.session,
          errors: [{ field: 'session', value: null }],
        })
        return
      }

      const user = session.findUserByName(args.name ?? '')
      if (user == null || user.id !== socket.id) {
        debug(`could not add response by unknown user`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.QuestionResponse,
          session: session.id,
          errors: [{ field: 'name', value: args.name ?? null }],
        })
        return
      }

      if (session.quiz.currentQuestion == null) {
        debug(
          `could not respond to session ${session.id} - not started (question null)`
        )
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.QuestionResponse,
          session: session.id,
          errors: [{ field: 'currentQuestionIndex', value: null }],
        })
        return
      }

      if (
        args.index == null ||
        args.index !== session.quiz.currentQuestionIndex
      ) {
        debug(
          `could not respond to session ${session.id} - args.index (${args.index}) out of range`
        )
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.QuestionResponse,
          session: session.id,
          errors: [
            { field: 'index', value: args.index == null ? null : args.index },
          ],
        })
        return
      }

      if (!validateResponse(args.response)) {
        debug(`could not respond to session ${session.id} - args.response null`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.QuestionResponse,
          session: session.id,
          errors: [{ field: 'response', value: null }],
        })
        return
      }
      const response = <ResponseType>args.response

      const question = session.quiz.questionAt(args.index)!
      let points: number = 0

      try {
        points = question.addResponse(response)
      } catch (error) {
        debug(`failed to add response to ${session.id} question ${args.index}`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.QuestionResponse,
          session: session.id,
          errors: [{ field: 'response', value: null }],
        })
        return
      }

      debug(
        `successfully added response to ${session.id} question ${args.index}`
      )

      const firstCorrect = question.firstCorrect ?? ''

      // Send statistics to owner
      this.emit(session.owner, {
        status: ResponseStatus.Success,
        event: SessionEvent.QuestionResponseAdded,
        session: session.id,
        data: {
          index: args.index,
          user: user.name,
          response: responseToString(response),
          points,
          firstCorrect,
          frequency: question.frequencyOf(response),
          relativeFrequency: question.relativeFrequencyOf(response),
        },
      })

      // Send grade to user
      callback({
        status: ResponseStatus.Success,
        event: SessionEvent.QuestionResponse,
        session: session.id,
        data: {
          index: args.index,
          firstCorrect: firstCorrect === user.name,
          points,
        },
      })
    }
  }

  /**
   * Ends a Session
   * @param socket Client socket that owns the Session
   */
  endSession(socket: Socket): SessionEventHandler<EndSession> {
    return (args, callback) => {
      if (args == null || args instanceof Function) {
        debug('no args passed to endSession')
        args?.({
          status: ResponseStatus.Failure,
          event: SessionEvent.EndSession,
          session: null,
          errors: null,
        })
        return
      }
      if (callback == null || !(callback instanceof Function)) {
        debug('callback was null or not a function')
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(
          `could not find session ${args.session} with owner ${socket.id} to end`
        )
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.EndSession,
          session: session == null ? null : session.id,
          errors: [
            { field: 'session', value: session == null ? null : session.id },
          ],
        })
        return
      }

      if (session.hasEnded) {
        debug(`session ${args.session} already ended`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.EndSession,
          session: session.id,
          errors: null,
        })
        return
      }

      debug(`session ${session.id} ending`)
      session.end()

      // Notify owner of success
      callback({
        status: ResponseStatus.Success,
        event: SessionEvent.EndSession,
        session: session.id,
        data: null,
      })

      // Broadcast to all users Session has ended
      this.emitExcept(session.id, session.owner, {
        status: ResponseStatus.Success,
        event: SessionEvent.SessionEnded,
        session: session.id,
        data: null,
      })

      // Remove all except owner from Session (so they can request data until they disconnect)
      this.io.except(session.owner).socketsLeave(session.id)
    }
  }

  /**
   * Ends the current Question, making it so users cannot respond.
   * @param socket The socket that owns the Session and sent the event.
   */
  endCurrentQuestion(socket: Socket): SessionEventHandler<EndQuestion> {
    return (args, callback) => {
      if (args == null || args instanceof Function) {
        debug('no args passed to endCurrentQuestion')
        args?.({
          status: ResponseStatus.Failure,
          event: SessionEvent.EndQuestion,
          session: null,
          errors: null,
        })
        return
      }
      if (callback == null || !(callback instanceof Function)) {
        debug('callback was null or not a function')
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(
          `could not find session ${args.session} with owner ${socket.id} to end question`
        )
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.EndQuestion,
          session: session == null ? null : session.id,
          errors: [
            { field: 'session', value: session == null ? null : session.id },
          ],
        })
        return
      }

      if (!session.isStarted || session.hasEnded) {
        debug(`session ${args.session} is not ready`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.EndQuestion,
          session: session.id,
          errors: null,
        })
        return
      }

      const currentQuestion = session.quiz.currentQuestion
      const currentIndex = session.quiz.currentQuestionIndex
      if (currentQuestion == null || currentIndex !== args.question) {
        debug(
          `session ${args.session} quiz is not on the argument question index ${args.question}`
        )
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.EndQuestion,
          session: session.id,
          errors: [{ field: 'question', value: args.question ?? null }],
        })
        return
      }

      debug(
        `successfully ended question ${currentIndex} in session ${session.id}`
      )

      // End the question
      currentQuestion.end()

      // Notify owner of success
      callback({
        status: ResponseStatus.Success,
        event: SessionEvent.EndQuestion,
        session: session.id,
        data: null,
      })

      // Broadcast to users that question ended
      this.emitExcept(session.id, session.owner, {
        status: ResponseStatus.Success,
        event: SessionEvent.QuestionEnded,
        session: session.id,
        data: {
          question: currentIndex,
        },
      })
    }
  }

  /**
   * Adds feedback to a question.
   * @param socket  The socket that has joined a session and is submitting feedback.
   * @returns
   */
  submitQuestionFeedback(socket: Socket): SessionEventHandler<SubmitFeedback> {
    return (args, callback) => {
      if (args == null || args instanceof Function) {
        debug('no args passed to submitQuestionFeedback')
        args?.({
          status: ResponseStatus.Failure,
          event: SessionEvent.SubmitFeedback,
          session: null,
          errors: null,
        })
        return
      }
      if (callback == null || !(callback instanceof Function)) {
        debug('callback was null or not a function')
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null) {
        debug(`could not find session ${args.session} to submit feedback to`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.SubmitFeedback,
          session: args.session == null ? null : args.session,
          errors: [{ field: 'session', value: null }],
        })
        return
      }

      // Check name and validate user exists
      const user = session.findUserByName(args.name ?? '')
      if (user == null || user.id !== socket.id) {
        debug(
          `could not submit feedback from unknown user ${args.name} to ${args.session}`
        )
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.SubmitFeedback,
          session: session.id,
          errors: [
            { field: 'name', value: args.name == null ? null : args.name },
          ],
        })
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
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.SubmitFeedback,
          session: session.id,
          errors: [
            {
              field: 'question',
              value: args.question == null ? null : args.question,
            },
          ],
        })
        return
      }

      // Check feedback
      if (args.feedback == null) {
        debug(`could not submit feedback with empty body`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.SubmitFeedback,
          session: session.id,
          errors: [{ field: 'feedback', value: null }],
        })
        return
      }

      // Ensure feedback passes constraints
      const errors = Feedback.validate(args.feedback)
      if (errors.length !== 0) {
        debug(`could not validate feedback: ${args.feedback}`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.SubmitFeedback,
          session: session.id,
          errors,
        })
        return
      }
      const feedback = new Feedback(
        args.feedback.rating!,
        args.feedback.message!
      )

      // Ensure feedback is not duplicated
      const question = session.quiz.questionAt(args.question)!
      if (!question.addFeedback(user.name, feedback)) {
        debug(
          `could add feedback for user ${user.name} to ${session.id}: duplicate`
        )
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.SubmitFeedback,
          session: session.id,
          errors: [{ field: 'feedback', value: 'duplicate' }],
        })
        return
      }

      debug(
        `received feedback for question ${question.index} in session ${session.id}`,
        feedback
      )

      // Tell session owner that feedback added
      this.emit(session.owner, {
        status: ResponseStatus.Success,
        event: SessionEvent.FeedbackSubmitted,
        session: session.id,
        data: {
          user: user.name,
          question: question.index,
          feedback,
        },
      })

      // Tell submitter that operation succeeded
      callback({
        status: ResponseStatus.Success,
        event: SessionEvent.SubmitFeedback,
        session: session.id,
        data: null,
      })
    }
  }

  /**
   * Sends a hint for a question to users in the session.
   * @param socket The client socket that owns the session.
   */
  sendQuestionHint(socket: Socket): SessionEventHandler<SendHint> {
    return (args, callback) => {
      if (args == null || args instanceof Function) {
        debug('no args passed to sendQuestionHint')
        args?.({
          status: ResponseStatus.Failure,
          event: SessionEvent.SendHint,
          session: null,
          errors: null,
        })
        return
      }
      if (callback == null || !(callback instanceof Function)) {
        debug('callback was null or not a function')
        return
      }

      // Check session exists and this socket created it
      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(
          `could not find session ${args.session} with owner ${socket.id} to end question`
        )
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.SendHint,
          session: args.session == null ? null : args.session,
          errors: [{ field: 'session', value: null }],
        })
        return
      }

      // Can only send non-empty hint
      if (args.hint == null || args.hint.length === 0) {
        debug('hint null or empty')
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.SendHint,
          session: session.id,
          errors: [
            {
              field: 'hint',
              value: args.hint == null ? null : args.hint.length,
            },
          ],
        })
        return
      }

      // Can only send hints if quiz has started
      if (!session.isStarted || session.hasEnded) {
        debug(`session ${args.session} is not ready`)
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.SendHint,
          session: session.id,
          errors: [{ field: 'session', value: null }],
        })
        return
      }

      // Can only send hint for the current question
      const currentQuestion = session.quiz.currentQuestion
      const currentIndex = session.quiz.currentQuestionIndex
      if (currentQuestion == null || currentIndex !== args.question) {
        debug(
          `session ${args.session} quiz is not on the argument question index ${args.question}`
        )
        callback({
          status: ResponseStatus.Failure,
          event: SessionEvent.SubmitFeedback,
          session: session.id,
          errors: [
            {
              field: 'question',
              value: args.question == null ? null : args.question,
            },
          ],
        })
        return
      }

      debug(`${socket.id} sent hint to session ${session.id}`, args.hint)

      // Notify sender of success
      callback({
        status: ResponseStatus.Success,
        event: SessionEvent.SendHint,
        session: session.id,
        data: null,
      })

      // Send hint to room
      this.emitExcept(session.id, socket.id, {
        status: ResponseStatus.Success,
        event: SessionEvent.HintReceived,
        session: session.id,
        data: {
          question: currentIndex,
          hint: args.hint,
        },
      })
    }
  }

  /**
   * Cleans up resources owned by the client, removing users from Session
   * if an owner disconnects
   * @param socket Client socket that's disconnecting
   */
  handleDisconnect(socket: Socket): SocketEventHandler<string> {
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
        this.emit(session.id, {
          status: ResponseStatus.Success,
          event: SessionEvent.SessionEnded,
          session: session.id,
          data: null,
        })
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
              this.emit(room, {
                status: ResponseStatus.Success,
                event: SessionEvent.UserDisconnected,
                session: session.id,
                data: {
                  name: user.name,
                },
              })
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
  private emit<Response extends EventResponse>(
    target: string | Socket,
    response: Response
  ) {
    const event = response.event
    if (target instanceof Socket) {
      target.emit(event, response)
    } else {
      this.io.to(target).emit(event, response)
    }
  }

  /**
   * Emits a response to a target ID, except for a specific ID.
   * @param target an ID string to emit to
   * @param except an ID string to not emit to
   * @param response the response to the client
   */
  private emitExcept<Response extends EventResponse>(
    room: string,
    except: string,
    response: Response
  ) {
    const event = response.event
    this.io.to(room).except(except).emit(event, response)
  }
}
