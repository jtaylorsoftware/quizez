import { Question, responseToString, Session, User } from 'session'
import * as events from 'session/events'
import { Socket, Server } from 'socket.io'
import { Map } from 'immutable'

const debug = require('debug')('controller')

type SocketEventHandler<T> = (args?: T) => void

/**
 * Manages adding and removing sessions
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
  ): SocketEventHandler<events.CreateNewSessionArgs> {
    return () => {
      const session = new Session(socket.id)
      debug(`client ${socket.id} creating session with id ${session.id}`)
      const res: events.CreatedSessionResponse = {
        id: session.id,
      }
      this.addSession(session)
      socket.join(session.id)
      socket.emit(events.CreatedSession, res)
    }
  }

  /**
   * Adds a client socket to a Session, if it exists, and if the
   * client id is not the owner
   * @param socket Client socket joining the Session
   */
  addUserToSession(socket: Socket): SocketEventHandler<events.JoinSessionArgs> {
    return (args?: events.JoinSessionArgs) => {
      if (args == null) {
        debug('no args passed to addUserToSession')
        socket.emit(events.JoinSessionFailed)
        return
      }

      debug(
        `client ${socket.id} joining session ${args.id} with name ${args.name}`
      )
      const session = this.sessions.get(args.id ?? '')
      if (session == null) {
        socket.emit(events.JoinSessionFailed)
      } else if (args.name == null) {
        socket.emit(events.JoinSessionFailed)
      } else {
        if (session.addUser(new User(args.name, socket.id))) {
          socket.join(session.id)
          // Broadcast that a user has joined
          const res: events.JoinSessionSuccessResponse = {
            session: session.id,
            name: args.name,
          }
          this.io.to(session.id).emit(events.JoinSessionSuccess, res)
        } else {
          socket.emit(events.JoinSessionFailed)
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
  ): SocketEventHandler<events.AddQuestionArgs> {
    return (args?: events.AddQuestionArgs) => {
      if (args == null) {
        debug('no args passed to addQuestionToSession')
        socket.emit(events.AddQuestionFailed)
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(`client ${socket.id} was not owner of any session`)
        socket.emit(events.AddQuestionFailed)
      } else {
        debug(`client owns session ${session.id}`)
        if (
          args.question == null ||
          args.question.text == null ||
          args.question.body == null
        ) {
          debug('question was missing or missing fields')
          socket.emit(events.AddQuestionFailed)
          return
        }

        const { text, body } = args.question
        const question = new Question(text, body)
        if (!Question.validateQuestion(question)) {
          debug('question has invalid format')
          socket.emit(events.AddQuestionFailed)
        } else {
          debug('question added')
          session.quiz.addQuestion(question)
          socket.emit(events.AddQuestionSuccess)
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
  ): SocketEventHandler<events.SessionKickArgs> {
    return (args?: events.SessionKickArgs) => {
      if (args == null) {
        debug('no args passed to removeUserFromSession')
        socket.emit(events.SessionKickFailed)
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(`could not find session ${args.session} with owner ${socket.id}`)
        socket.emit(events.SessionKickFailed)
      } else if (args.name == null) {
        debug('missing name field')
        socket.emit(events.SessionKickFailed)
      } else {
        const user = session.removeUser(args.name)
        if (user == null) {
          debug(`could not remove user ${args.name}`)
          socket.emit(events.SessionKickFailed)
          return
        }

        debug(`removed user ${args.name}`)
        const res: events.SessionKickSuccessResponse = {
          session: session.id,
          name: args.name,
        }

        this.io.to(session.id).emit(events.SessionKickSuccess, res)
        this.io.in(user.id).socketsLeave(session.id)
      }
    }
  }

  /**
   * Starts the owner's Session
   * @param socket Client socket owning the Session
   */
  startSession(socket: Socket): SocketEventHandler<events.SessionStartArgs> {
    return (args?: events.SessionStartArgs) => {
      if (args == null) {
        debug('no args passed to startSession')
        const res: events.SessionStartFailedResponse = {
          session: '',
        }
        socket.emit(events.SessionStartFailed, res)
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(`could not find session ${args.session} with owner ${socket.id}`)
        const res: events.SessionStartFailedResponse = {
          session: args.session,
        }
        socket.emit(events.SessionStartFailed, res)
        return
      }

      if (session.isStarted) {
        debug(`session ${session.id} is already started`)
        const res: events.SessionStartFailedResponse = {
          session: args.session,
        }
        socket.emit(events.SessionStartFailed, res)
        return
      }

      debug(`session ${session.id} starting`)
      session.start()

      const res: events.SessionStartedResponse = {
        session: session.id,
      }
      this.io.to(session.id).emit(events.SessionStarted, res)
    }
  }

  /**
   * Pushes the next question to users
   * @param socket Client socket owning the Session
   */
  pushNextQuestion(
    socket: Socket
  ): SocketEventHandler<events.NextQuestionArgs> {
    return (args?: events.NextQuestionArgs) => {
      if (args == null) {
        debug('no args passed to pushNextQuestion')
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(`could not find session with owner ${socket.id}`)
        return
      }

      if (!session.isStarted) {
        debug(`session ${session.id} is not started, not sending next question`)
        return
      }

      const nextQuestion = session.quiz.advanceToNextQuestion()
      if (nextQuestion == null) {
        debug(`session ${session.id} - quiz has no more questions`)
        return
      }

      debug(`session ${session.id} sending next question`)
      const res: events.NextQuestionResponse = {
        index: session.quiz.currentQuestionIndex,
        session: session.id,
        question: nextQuestion,
      }

      this.io.to(session.id).emit(events.NextQuestion, res)
    }
  }

  /**
   * Checks and adds a user's response to a Quiz Question
   * @param socket Client socket submitting response
   */
  addQuestionResponse(
    socket: Socket
  ): SocketEventHandler<events.QuestionResponseArgs> {
    return (args?: events.QuestionResponseArgs) => {
      if (args == null) {
        debug('no args passed to addQuestionResponse')
        socket.emit(events.QuestionResponseFailed)
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null) {
        debug(`could not find session ${args.session} to respond to`)
        socket.emit(events.QuestionResponseFailed)
        return
      }

      const user = session.findUserByName(args.name ?? '')
      if (user == null || user.id !== socket.id) {
        debug(`could not add response by unknown user`)
        socket.emit(events.QuestionResponseFailed)
        return
      }

      if (session.quiz.currentQuestion == null) {
        debug(
          `could not respond to session ${session.id} - not started (question null)`
        )
        socket.emit(events.QuestionResponseFailed)
        return
      }

      if (
        args.index == null ||
        args.index < 0 ||
        args.index >= session.quiz.numQuestions ||
        args.index > session.quiz.currentQuestionIndex
      ) {
        debug(
          `could not respond to session ${session.id} - args.index (${args.index}) out of range`
        )
        socket.emit(events.QuestionResponseFailed)
        return
      }

      if (args.response == null) {
        debug(`could not respond to session ${session.id} - args.response null`)
        socket.emit(events.QuestionResponseFailed)
        return
      }

      const question = session.quiz.questionAt(args.index)!
      let isCorrect: boolean

      try {
        isCorrect = question.addResponse(args.response)
      } catch (error) {
        debug(`failed to add response to ${session.id} question ${args.index}`)
        socket.emit(events.QuestionResponseFailed)
        return
      }

      debug(
        `successfully added response to ${session.id} question ${args.index}`
      )

      const firstCorrect = question.firstCorrect ?? ''

      // Send statistics to owner
      const ownerRes: events.QuestionResponseAddedResponse = {
        index: args.index,
        session: session.id,
        user: user.name,
        response: responseToString(args.response),
        isCorrect,
        firstCorrect,
        frequency: question.frequencyOf(args.response),
        relativeFrequency: question.relativeFrequencyOf(args.response),
      }
      this.io.to(session.owner).emit(events.QuestionResponseAdded, ownerRes)

      // Send grade to user
      const userRes: events.QuestionResponseSuccessResponse = {
        index: args.index,
        session: session.id,
        firstCorrect: firstCorrect === user.name,
        isCorrect,
      }
      socket.emit(events.QuestionResponseSuccess, userRes)
    }
  }

  /**
   * Ends a Session
   * @param socket Client socket that owns the Session
   */
  endSession(socket: Socket): SocketEventHandler<events.EndSessionArgs> {
    return (args?: events.EndSessionArgs) => {
      if (args == null) {
        debug('no args passed to endSession')
        const res: events.SessionEndFailedResponse = {
          session: '',
        }
        socket.emit(events.SessionEndFailed, res)
        return
      }

      const session = this.sessions.get(args.session ?? '')
      if (session == null || session.owner !== socket.id) {
        debug(
          `could not find session ${args.session} with owner ${socket.id} to end`
        )
        const res: events.SessionEndFailedResponse = {
          session: args.session,
        }
        socket.emit(events.SessionEndFailed, res)
        return
      }

      if (session.hasEnded) {
        debug(`session ${args.session} already ended`)
        const res: events.SessionEndFailedResponse = {
          session: args.session,
        }
        socket.emit(events.SessionEndFailed, res)
        return
      }

      debug(`session ${session.id} ending`)
      session.end()

      const res: events.SessionEndedResponse = {
        session: session.id,
      }

      // Tell all users Session has ended
      this.io.to(session.id).emit(events.SessionEnded, res)

      // Remove all except owner from Session (so they can request data until they disconnect)
      this.io.except(session.owner).socketsLeave(session.id)
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
        this.removeSession(session)

        const res: events.SessionEndedResponse = {
          session: session.id,
        }

        this.io.to(session.id).emit(events.SessionEnded, res)
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
              const res: events.UserDisconnectedResponse = {
                session: session.id,
                name: user.name,
              }
              session.removeUser(user.name)
              this.io.to(room).emit(events.UserDisconnected, res)
            }
          }
        })
      }
    }
  }
}
