import { Question, Session, User } from 'session'
import {
  AddQuestionArgs,
  AddQuestionFailed,
  AddQuestionSuccess,
  CreatedSession,
  CreatedSessionResponse,
  JoinSessionArgs,
  JoinSessionFailed,
  JoinSessionSuccess,
  SessionKickArgs,
  SessionKickFailed,
  SessionKickSuccess,
  SessionKickSuccessResponse,
  SessionStartArgs,
  SessionStarted,
} from 'session/event'
import { Socket } from 'socket.io'

const debug = require('debug')('server')

type SocketEventHandler<T> = (args: T) => void

/**
 * Creates a new Session with `socket` as its owner
 * @param socket Client socket creating the Session
 * @param sessions List of created sessions
 */
export function createSession(
  socket: Socket,
  sessions: Session[]
): SocketEventHandler<void> {
  return () => {
    const session = new Session(socket.id)
    debug(`client creating session with id ${session.id}`)
    const res: CreatedSessionResponse = {
      id: session.id,
    }
    sessions.push(session)
    socket.join(session.id)
    socket.emit(CreatedSession, res)
  }
}

/**
 * Adds a client socket to a Session, if it exists, and if the
 * client id is not the owner
 * @param socket Client socket joining the Session
 * @param sessions List of created Sessions
 */
export function addUserToSession(
  socket: Socket,
  sessions: Session[]
): SocketEventHandler<JoinSessionArgs> {
  return (args: JoinSessionArgs) => {
    debug(`client joining session ${args.id} with name ${args.name}`)
    const session = sessions.find((session) => session.id === args.id)
    if (session == null) {
      socket.emit(JoinSessionFailed)
    } else if (args.name == null) {
      socket.emit(JoinSessionFailed)
    } else {
      if (session.addUser(new User(args.name, socket.id))) {
        socket.join(session.id)
        socket.emit(JoinSessionSuccess)
      } else {
        socket.emit(JoinSessionFailed)
      }
    }
  }
}

/**
 * Adds a question to the Session's quiz
 * @param socket Client socket owning the Session
 * @param sessions List of created Sessions
 */
export function addQuestionToSession(
  socket: Socket,
  sessions: Session[]
): SocketEventHandler<AddQuestionArgs> {
  return (args: AddQuestionArgs) => {
    debug(`client ${socket.id} (presumably owner) adding question to a session`)
    debug(args)
    const session = sessions.find((session) => session.owner === socket.id)
    if (session == null) {
      debug(`client ${socket.id} was not owner of any session`)
      socket.emit(AddQuestionFailed)
    } else {
      debug(`client owns session ${session.id}`)
      if (args.text == null || args.body == null) {
        debug('question has missing fields')
        socket.emit(AddQuestionFailed)
        return
      }

      const question = new Question(args.text, args.body)
      if (!Question.validateQuestion(question)) {
        debug('question has invalid format')
        socket.emit(AddQuestionFailed)
      } else {
        debug('question added')
        session.quiz.addQuestion(question)
        socket.emit(AddQuestionSuccess)
        // if (session.isStarted) {
        //   socket.broadcast.to(session.id).emit(QuestionAdded, { question })
        // }
      }
    }
  }
}

/**
 * Removes a user from the owner's Session
 * @param socket Client socket owning the Session
 * @param sessions List of current Sessions
 */
export function removeUserFromSession(
  socket: Socket,
  sessions: Session[]
): SocketEventHandler<SessionKickArgs> {
  return (args: SessionKickArgs) => {
    const session = sessions.find((session) => session.owner === socket.id)
    if (session == null) {
      debug(`could not find session with owner ${socket.id}`)
      socket.emit(SessionKickFailed)
    } else if (args.name == null) {
      debug('missing name field')
      socket.emit(SessionKickFailed)
    } else if (!session.removeUser(args.name)) {
      debug(`could not remove user ${args.name}`)
      socket.emit(SessionKickFailed)
    } else {
      debug(`removed user ${args.name}`)
      const res: SessionKickSuccessResponse = {
        name: args.name,
      }
      socket.leave(session.id)
      socket.emit(SessionKickSuccess, res)
    }
  }
}

/**
 * Starts the owner's Session
 * @param socket Client socket owning the Session
 * @param sessions List of current Sessions
 */
export function startSession(
  socket: Socket,
  sessions: Session[]
): SocketEventHandler<SessionStartArgs> {
  return () => {
    const session = sessions.find((session) => session.owner === socket.id)
    if (session == null) {
      debug(`could not find session with owner ${socket.id}`)
      socket.emit(SessionKickFailed)
      return
    }

    debug(`session ${session.id} starting`)
    socket.broadcast.to(session.id).emit(SessionStarted)
  }
}
