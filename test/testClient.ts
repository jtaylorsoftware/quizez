/**
 * Script for quick testing of server sessions
 */

import assert from 'assert'
import { io, Socket } from 'socket.io-client'
import {
  CreateNew,
  Join,
  Created,
  CreatedArgs,
  JoinSuccess,
  JoinArgs,
  JoinFailed,
  AddQuestion,
  QuestionAdded,
  QuestionAddedArgs,
} from 'session/event'
import { MultipleChoiceFormat, Question } from 'session'
assert(process.argv.length == 3)

let sessionId: string | undefined
let sessionOwner: Socket

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

// Testing creating Session
;(async () => {
  console.log('Starting client to create session')

  const socket = io(`http://localhost:${process.argv[2]}`)

  socket.on('connect', () => {
    console.log(`connected with id ${socket.id}`)
    sessionOwner = socket
    socket.emit(CreateNew)
  })

  socket.on(Created, (args: CreatedArgs) => {
    console.log(`created session with id ${args.id} `)
    sessionId = args.id
  })

  socket.connect()
})()

// Testing joining Session
;(async () => {
  console.log('Starting client to join session')

  const socket = io(`http://localhost:${process.argv[2]}`)

  socket.on('connect', () => {
    console.log(`connected with id ${socket.id}`)
  })

  socket.on(JoinSuccess, () => {
    console.log(`joined session ${sessionId}`)
  })

  socket.on(JoinFailed, () => {
    console.log(`failed to join session ${sessionId}`)
  })

  socket.on(QuestionAdded, (args: QuestionAddedArgs) => {
    console.log(`question added to Session`)
    console.log(args)
  })

  socket.connect()

  try {
    // Wait to join session
    const id = await getSessionId()
    const args: JoinArgs = {
      id,
      name: 'user',
    }
    socket.emit(Join, args)

    // After user joins session, have owner add question
    sessionOwner!.emit(
      AddQuestion,
      new Question('First Question', {
        type: MultipleChoiceFormat,
        choices: [
          {
            text: 'First Answer',
            isCorrect: false,
          },
          {
            text: 'Second Answer',
            isCorrect: true,
          },
        ],
      })
    )
  } catch (e) {
    console.log('could not get session id')
  }
})()
