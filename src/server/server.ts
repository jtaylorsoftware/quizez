import { createServer, Server as HttpServer } from 'http'
import { Session } from 'session'
import {
  JoinSession,
  CreateNewSession,
  AddQuestion,
  SessionKick,
  StartSession,
  NextQuestion,
  QuestionResponse,
  EndSession,
} from 'session/events'
import { Server } from 'socket.io'
import {
  addUserToSession,
  createSession,
  addQuestionToSession,
  removeUserFromSession,
  startSession,
  pushNextQuestion,
  addQuestionResponse,
  endSession,
  handleDisconnect,
} from './handlers'
import { Map } from 'immutable'

/**
 * Manages adding and removing sessions
 */
export class SessionController {
  private _sessions = Map<string, Session>()

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
  addSession(session: Session) {
    this._sessions = this._sessions.set(session.id, session)
  }

  /**
   * Removes a Session
   * @param session Session to remove
   */
  removeSession(session: Session) {
    this._sessions = this._sessions.delete(session.id)
  }
}

const sessionController = new SessionController()

const debug = require('debug')('server')

/**
 * Sets up the socket.io server event handlers
 */
// prettier-ignore
function configure(io: Server) {
  io.on('connection', (socket) => {
    debug('received socket connection')

    socket.on(CreateNewSession, createSession(socket, sessionController))

    socket.on(JoinSession, addUserToSession(socket, sessionController))

    socket.on(AddQuestion, addQuestionToSession(socket, sessionController))

    socket.on(SessionKick, removeUserFromSession(io, socket, sessionController))

    socket.on(StartSession, startSession(io, socket, sessionController))

    socket.on(EndSession, endSession(io, socket, sessionController))

    socket.on(NextQuestion, pushNextQuestion(socket, sessionController))

    socket.on(QuestionResponse, addQuestionResponse(io, socket, sessionController))

    socket.on('disconnecting', handleDisconnect(io, socket, sessionController))
  })
}

/**
 * Creates and configures a socket.io server
 * @returns http Server object that has been configured with an associated socket.io Server
 */
export function createSocketServer(): HttpServer {
  const server = createServer()
  const io = new Server(server)
  configure(io)
  return server
}
