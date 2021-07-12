import { Server } from 'http'
import { AddressInfo } from 'net'
import { createSocketServer } from 'server'
import { Question } from 'session'
import {
  AddQuestion,
  AddQuestionFailed,
  AddQuestionSuccess,
  CreatedSession,
  CreatedSessionResponse,
  CreateNewSession,
  JoinSession,
  JoinSessionArgs,
  JoinSessionFailed,
  JoinSessionSuccess,
  SessionKick,
  SessionKickFailed,
  SessionKickSuccess,
  SessionStarted,
  StartSession,
} from 'session/event'
import { io, Socket } from 'socket.io-client'

describe('Server', () => {
  let httpServer: Server
  let port: Number
  let sessionOwner: Socket

  beforeAll((done) => {
    httpServer = createSocketServer()
    port = (httpServer.listen().address() as AddressInfo).port
    done()
  })

  afterAll((done) => {
    httpServer.close()
    done()
  })

  beforeEach((done) => {
    sessionOwner = io(`http://localhost:${port}`)
    sessionOwner.on('connect', () => {
      done()
    })
    sessionOwner.connect()
  })

  afterEach((done) => {
    sessionOwner.close()
    done()
  })

  describe('when managing sessions', () => {
    let user: Socket
    let timeout: NodeJS.Timeout

    beforeEach((done) => {
      user = io(`http://localhost:${port}`)
      user.on('connect', () => {
        done()
      })
      user.connect()
    })

    afterEach((done) => {
      user.close()
      clearTimeout(timeout)
      done()
    })

    it('should return session id to client', (done) => {
      sessionOwner.on(CreatedSession, (res: CreatedSessionResponse) => {
        expect(res.id.length).not.toEqual(0)
        done()
      })
      sessionOwner.emit(CreateNewSession)
    })

    it('should allow clients to join using existing id', (done) => {
      let id: string
      sessionOwner.on(CreatedSession, (res: CreatedSessionResponse) => {
        id = res.id
      })
      sessionOwner.emit(CreateNewSession)
      user.on(JoinSessionSuccess, () => {
        done()
      })
      user.on(JoinSessionFailed, () => {
        expect(`JoinFailed, session id: ${id}`).toBe('JoinSessionSuccess')
      })

      timeout = joinSession(user, () => id!, 2000)
    })

    it('should allow the session owner to add questions', (done) => {
      sessionOwner.emit(CreateNewSession)

      sessionOwner.on(AddQuestionFailed, () => {
        expect('AddQuestionFailed').toBe('AddQuestionSuccess')
      })
      sessionOwner.on(AddQuestionSuccess, () => {
        done()
      })

      const question: Question = {
        text: 'Question',
        body: {
          type: 'MultipleChoice',
          choices: [
            { text: 'Choice One', isCorrect: false },
            { text: 'Choice Two', isCorrect: true },
          ],
        },
      }
      sessionOwner.emit(AddQuestion, question)
    })

    it('should NOT allow other users to add questions', (done) => {
      let id: string
      sessionOwner.on(CreatedSession, (res: CreatedSessionResponse) => {
        id = res.id
      })
      sessionOwner.emit(CreateNewSession)

      timeout = joinSession(user, () => id!, 2000)

      user.on(AddQuestionFailed, () => {
        done()
      })
      user.on(AddQuestionSuccess, () => {
        expect('AddQuestionSuccess').toBe('AddQuestionFailed')
      })

      const question: Question = {
        text: 'Question',
        body: {
          type: 'MultipleChoice',
          choices: [
            { text: 'Choice One', isCorrect: false },
            { text: 'Choice Two', isCorrect: true },
          ],
        },
      }
      user.emit(AddQuestion, question)
    })

    it('should allow owner to kick users', (done) => {
      let id: string
      sessionOwner.on(CreatedSession, (res: CreatedSessionResponse) => {
        id = res.id
      })
      sessionOwner.emit(CreateNewSession)

      sessionOwner.on(SessionKickFailed, () => {
        expect('SessionKickFailed').toBe('SessionKickSuccess')
      })

      sessionOwner.on(SessionKickSuccess, () => {
        done()
      })

      user.on(JoinSessionSuccess, () => {
        // owner kicks the only user
        sessionOwner.emit(SessionKick, { name: 'user' })
      })

      timeout = joinSession(user, () => id!, 2000)
    })

    it('should NOT allow other users to kick users', (done) => {
      let id: string
      sessionOwner.on(CreatedSession, (res: CreatedSessionResponse) => {
        id = res.id
      })
      sessionOwner.emit(CreateNewSession)

      user.on(SessionKickFailed, () => {
        done()
      })

      user.on(SessionKickSuccess, () => {
        expect('SessionKickSuccess').toEqual('SessionKickFailed')
      })

      user.on(JoinSessionSuccess, () => {
        // user kicks someone (in this case, themself)
        user.emit(SessionKick, { name: 'user' })
      })

      timeout = joinSession(user, () => id!, 2000)
    })

    it('should broadcast to all users when owner starts session', (done) => {
      let id: string
      sessionOwner.on(CreatedSession, (res: CreatedSessionResponse) => {
        id = res.id
      })
      sessionOwner.emit(CreateNewSession)

      let eventTimeout: NodeJS.Timeout
      user.on(JoinSessionSuccess, () => {
        sessionOwner.emit(StartSession)
        eventTimeout = setTimeout(() => {
          expect('No Event').toEqual('SessionStarted')
        }, 3000)
      })

      user.on(SessionStarted, () => {
        clearTimeout(eventTimeout)
        done()
      })

      timeout = joinSession(user, () => id!, 2000)
    })
  })
})

const joinSession = (
  socket: Socket,
  session: () => string,
  timeout: number
): NodeJS.Timeout => {
  return setTimeout(() => {
    const joinArgs: JoinSessionArgs = {
      id: session(),
      name: 'user',
    }
    socket.emit(JoinSession, joinArgs)
  }, timeout)
}
