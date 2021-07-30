import { createServer, Server as HttpServer } from 'http'
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
import { SessionController } from './controller'

const debug = require('debug')('server')

/**
 * Sets up the socket.io server event handlers
 */
// prettier-ignore
function configure(io: Server) {
  const sessionController = new SessionController(io)
  io.on('connection', (socket) => {
    debug('received socket connection')

    socket.on(CreateNewSession, sessionController.createSession(socket))

    socket.on(JoinSession, sessionController.addUserToSession(socket))

    socket.on(AddQuestion, sessionController.addQuestionToSession(socket))

    socket.on(SessionKick, sessionController.removeUserFromSession(socket))

    socket.on(StartSession, sessionController.startSession(socket))

    socket.on(EndSession, sessionController.endSession(socket))

    socket.on(NextQuestion, sessionController.pushNextQuestion(socket))

    socket.on(QuestionResponse, sessionController.addQuestionResponse(socket))

    socket.on('disconnecting', sessionController.handleDisconnect(socket))
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
