import { createServer, Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import {
  SessionCreated,
  SessionCreatedArgs,
  SessionJoin,
  SessionJoinArgs,
  SessionJoinFailed,
  SessionJoinSuccess,
  SessionStart,
} from 'session/event'
import { Session } from 'session'

const debug = require('debug')('server')

// All created Sessions
const sessions: Session[] = []

// Sets up the socket.io server event handlers
function configure(io: Server) {
  io.on('connection', (socket) => {
    debug('received socket connection')

    socket.on(SessionStart, () => {
      const session = new Session(socket.id)
      debug(`client starting session with id ${session.id}`)
      const args: SessionCreatedArgs = {
        id: session.id,
      }
      sessions.push(session)
      socket.emit(SessionCreated, args)
    })

    socket.on(SessionJoin, (args: SessionJoinArgs) => {
      debug(`client joining session ${args.id} with name ${args.name}`)
      const sessionIndex = sessions.findIndex(
        (session) => session.id === args.id
      )
      if (sessionIndex === -1) {
        socket.emit(SessionJoinFailed)
      } else {
        socket.emit(SessionJoinSuccess)
      }
    })
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
