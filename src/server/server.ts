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
} from './handlers'

// All created Sessions, keyed on Session id
const sessions = new Map<string, Session>()

const debug = require('debug')('server')

// Sets up the socket.io server event handlers
function configure(io: Server) {
  io.on('connection', (socket) => {
    debug('received socket connection')

    socket.on(CreateNewSession, createSession(socket, sessions))

    socket.on(JoinSession, addUserToSession(socket, sessions))

    socket.on(AddQuestion, addQuestionToSession(socket, sessions))

    socket.on(SessionKick, removeUserFromSession(io, socket, sessions))

    socket.on(StartSession, startSession(io, socket, sessions))

    socket.on(NextQuestion, pushNextQuestion(socket, sessions))

    socket.on(QuestionResponse, addQuestionResponse(io, socket, sessions))
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
