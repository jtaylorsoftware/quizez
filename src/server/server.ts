import { createServer, Server as HttpServer } from 'http'
import { Session } from 'session'
import { Join, CreateNew, AddQuestion } from 'session/event'
import { Server } from 'socket.io'
import {
  addUserToSession,
  createSession,
  addQuestionToSession,
} from './handlers'

// All created Sessions
const sessions: Session[] = []

const debug = require('debug')('server')

// Sets up the socket.io server event handlers
function configure(io: Server) {
  io.on('connection', (socket) => {
    debug('received socket connection')

    socket.on(CreateNew, createSession(socket, sessions))

    socket.on(Join, addUserToSession(socket, sessions))

    socket.on(AddQuestion, addQuestionToSession(socket, sessions))
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
