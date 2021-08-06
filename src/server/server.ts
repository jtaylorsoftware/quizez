import { createServer, Server as HttpServer } from 'http'
import SessionEvent from 'event'
import { Server } from 'socket.io'
import { SessionController } from './controller'

const debug = require('debug')('app:server')

/**
 * Sets up the socket.io server event handlers
 */
// prettier-ignore
function configure(io: Server) {
  const sessionController = new SessionController(io)
  io.on('connection', (socket) => {
    debug('received socket connection')

    socket.on(SessionEvent.CreateNewSession, sessionController.createSession(socket))

    socket.on(SessionEvent.JoinSession, sessionController.addUserToSession(socket))

    socket.on(SessionEvent.AddQuestion, sessionController.addQuestionToSession(socket))

    socket.on(SessionEvent.SessionKick, sessionController.removeUserFromSession(socket))

    socket.on(SessionEvent.StartSession, sessionController.startSession(socket))

    socket.on(SessionEvent.EndSession, sessionController.endSession(socket))

    socket.on(SessionEvent.NextQuestion, sessionController.pushNextQuestion(socket))

    socket.on(SessionEvent.QuestionResponse, sessionController.addQuestionResponse(socket))

    socket.on(SessionEvent.EndQuestion, sessionController.endCurrentQuestion(socket))

    socket.on(SessionEvent.SubmitFeedback, sessionController.submitQuestionFeedback(socket))

    socket.on(SessionEvent.SendHint, sessionController.sendQuestionHint(socket))

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
