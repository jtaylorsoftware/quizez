import { Question, Session } from 'session'
import {
  AddQuestionArgs,
  AddQuestionFailed,
  AddQuestionSuccess,
  Created,
  CreatedArgs,
  JoinArgs,
  JoinFailed,
  JoinSuccess,
  QuestionAdded,
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
    debug(`client starting session with id ${session.id}`)
    const args: CreatedArgs = {
      id: session.id,
    }
    sessions.push(session)
    socket.emit(Created, args)
  }
}

/**
 * Adds a client socket to a Session, if it exists
 * @param socket Client socket joining the Session
 * @param sessions List of created Sessions
 */
export function addUserToSession(
  socket: Socket,
  sessions: Session[]
): SocketEventHandler<JoinArgs> {
  return (args: JoinArgs) => {
    debug(`client joining session ${args.id} with name ${args.name}`)
    const session = sessions.find((session) => session.id === args.id)
    if (session == null) {
      socket.emit(JoinFailed)
    } else {
      socket.join(session.id)
      session.addUser(socket.id)
      socket.emit(JoinSuccess)
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
        //if (session.isStarted) {
        socket.broadcast.to(session.id).emit(QuestionAdded, { question })
        //}
      }
    }
  }
}
