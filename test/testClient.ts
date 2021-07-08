/**
 * Script for quick testing of server sessions
 */

import assert from 'assert'
import { io } from 'socket.io-client'
import {
  SessionStart,
  SessionJoin,
  SessionCreated,
  SessionCreatedArgs,
  SessionJoinSuccess,
  SessionJoinArgs,
  SessionJoinFailed,
} from 'session/event'
assert(process.argv.length == 3)

let sessionId: string | undefined

// Waits for and returns the created Session's id
async function getSessionId(): Promise<string> {
  return new Promise((resolve, reject) => {
    let interval: NodeJS.Timer
    let timeout: NodeJS.Timeout

    interval = setInterval(() => {
      if (sessionId != null) {
        clearInterval(interval)
        clearTimeout(timeout)
        resolve(sessionId)
      }
    }, 1000 /* 1 second */)

    timeout = setTimeout(() => {
      if (sessionId == null) {
        clearInterval(interval)
        reject()
      }
    }, 10 * 1000 /* 10 seconds */)
  })
}

{
  console.log('Starting client to create session')

  const socket = io(`http://localhost:${process.argv[2]}`)

  socket.on('connect', () => {
    console.log(`connected with id ${socket.id}`)
    socket.emit(SessionStart)
  })

  socket.on(SessionCreated, (args: SessionCreatedArgs) => {
    console.log(`created session with id ${args.id} `)
    sessionId = args.id
  })

  socket.connect()
}

;(async () => {
  console.log('Starting client to join session')

  const socket = io(`http://localhost:${process.argv[2]}`)

  socket.on('connect', () => {
    console.log(`connected with id ${socket.id}`)
  })

  socket.on(SessionJoinSuccess, () => {
    console.log(`joined session ${sessionId}`)
  })

  socket.on(SessionJoinFailed, () => {
    console.log(`failed to join session ${sessionId}`)
  })

  socket.connect()

  try {
    const id = await getSessionId()
    const args: SessionJoinArgs = {
      id,
      name: 'user',
    }
    socket.emit(SessionJoin, args)
  } catch (e) {
    console.log(`could not get session id`)
  }
})()
