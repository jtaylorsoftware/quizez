import { Server } from 'http'
import { nanoid } from 'nanoid'
import { AddressInfo } from 'net'
import { createSocketServer } from 'server'
import { MultipleChoiceFormat, Question } from 'session'
import {
  AddQuestion,
  AddQuestionFailed,
  AddQuestionSuccess,
  CreatedSession,
  CreatedSessionResponse,
  CreateNewSession,
  EndSession,
  EndSessionArgs,
  JoinSession,
  JoinSessionArgs,
  JoinSessionFailed,
  JoinSessionSuccess,
  NextQuestion,
  NextQuestionResponse,
  QuestionResponse,
  QuestionResponseAdded,
  QuestionResponseAddedResponse,
  QuestionResponseArgs,
  QuestionResponseFailed,
  QuestionResponseSuccess,
  QuestionResponseSuccessResponse,
  SessionEnded,
  SessionEndedResponse,
  SessionEndFailed,
  SessionKick,
  SessionKickArgs,
  SessionKickFailed,
  SessionKickSuccess,
  SessionKickSuccessResponse,
  SessionStarted,
  StartSession,
} from 'session/events'
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
    // id of the session
    let id: string
    // user joining session
    let user: Socket
    // name of user joining session
    let name: string

    beforeEach((done) => {
      user = io(`http://localhost:${port}`)
      user.on('connect', () => {
        sessionOwner.emit(CreateNewSession)
      })
      user.connect()

      sessionOwner.on(CreatedSession, (res: CreatedSessionResponse) => {
        id = res.id
        name = nanoid()
        const joinArgs: JoinSessionArgs = {
          id,
          name,
        }
        user.emit(JoinSession, joinArgs)
      })

      user.on(JoinSessionSuccess, () => {
        done()
      })
    })

    afterEach((done) => {
      user.close()
      done()
    })

    it('should return session id to client', () => {
      expect(id).not.toBeUndefined()
      expect(id.length).not.toBe(0)
    })

    it('should allow clients to join using existing id', (done) => {
      const testUser = io(`http://localhost:${port}`)
      testUser.on('connect', () => {
        const testName = nanoid()
        const joinArgs: JoinSessionArgs = {
          id,
          name: testName,
        }
        testUser.emit(JoinSession, joinArgs)
      })
      testUser.connect()

      testUser.on(JoinSessionSuccess, () => {
        testUser.close()
        done()
      })
      testUser.on(JoinSessionFailed, () => {
        expect(`JoinFailed, session id: ${id}`).toBe('JoinSessionSuccess')
        testUser.close()
        done()
      })
    })

    it('should allow the session owner to add questions', (done) => {
      sessionOwner.on(AddQuestionFailed, () => {
        expect('AddQuestionFailed').toBe('AddQuestionSuccess')
        done()
      })
      sessionOwner.on(AddQuestionSuccess, () => {
        done()
      })

      const question: Question = new Question('Question', {
        type: MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 0,
      })
      sessionOwner.emit(AddQuestion, {
        session: id,
        ...question,
      })
    })

    it('should NOT allow other users to add questions', (done) => {
      user.on(AddQuestionFailed, () => {
        done()
      })
      user.on(AddQuestionSuccess, () => {
        expect('AddQuestionSuccess').toBe('AddQuestionFailed')
        done()
      })

      const question: Question = new Question('Question', {
        type: MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 1,
      })

      user.emit(AddQuestion, {
        session: id,
        ...question,
      })
    })

    it('should broadcast to all users when owner kicks user', (done) => {
      sessionOwner.on(SessionKickFailed, () => {
        expect('SessionKickFailed').toBe('SessionKickSuccess')
        done()
      })

      let eventTimeout: NodeJS.Timeout
      let ownerReceive: boolean = false
      sessionOwner.on(SessionKickSuccess, (res: SessionKickSuccessResponse) => {
        ownerReceive = true
        expect(res.name).toBe(name)
        expect(res.session).toBe(id)
        if (ownerReceive && userReceive) {
          clearTimeout(eventTimeout)
          done()
        }
      })

      let userReceive: boolean = false
      user.on(SessionKickSuccess, (res: SessionKickSuccessResponse) => {
        userReceive = true
        expect(res.name).toBe(name)
        expect(res.session).toBe(id)
        if (ownerReceive && userReceive) {
          clearTimeout(eventTimeout)
          done()
        }
      })

      // Fail if both sockets did not receive SessionKickSuccess
      eventTimeout = setTimeout(() => {
        if (!ownerReceive || !userReceive) {
          expect('No Event').toEqual('SessionKickSuccess')
        }
        done()
      }, 5000)

      const kickArgs: SessionKickArgs = {
        name,
        session: id,
      }
      sessionOwner.emit(SessionKick, kickArgs)
    })

    it('should NOT allow other users to kick users', (done) => {
      user.on(SessionKickFailed, () => {
        done()
      })

      user.on(SessionKickSuccess, () => {
        expect('SessionKickSuccess').toEqual('SessionKickFailed')
        done()
      })

      const kickArgs: SessionKickArgs = {
        name,
        session: id,
      }
      user.emit(SessionKick, kickArgs)
    })

    it('should broadcast to all users when owner starts session', (done) => {
      // Fail if SessionStarted is not received after a timeout
      let eventTimeout = setTimeout(() => {
        expect('No Event').toEqual('SessionStarted')
        done()
      }, 3000)

      user.on(SessionStarted, () => {
        clearTimeout(eventTimeout)
        done()
      })

      sessionOwner.emit(StartSession, { session: id })
    })

    it('should broadcast next question to all users', (done) => {
      let eventTimeout: NodeJS.Timeout
      user.on(SessionStarted, () => {
        sessionOwner.emit(NextQuestion, {
          session: id,
        })

        // Fail if NextQuestion is not received
        eventTimeout = setTimeout(() => {
          expect('No Event').toBe('NextQuestion')
        }, 4000)
      })
      user.on(NextQuestion, (args: NextQuestionResponse) => {
        if (args.question.text === question.text) {
          clearTimeout(eventTimeout)
          done()
        }
      })

      const question: Question = new Question('Question', {
        type: MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 1,
      })

      sessionOwner.emit(AddQuestion, {
        session: id,
        ...question,
      })
      sessionOwner.on(AddQuestionSuccess, () => {
        sessionOwner.emit(StartSession, { session: id })
      })
    })

    it('should grade responses and send results', (done) => {
      sessionOwner.on(AddQuestionSuccess, () => {
        sessionOwner.emit(StartSession, { session: id })
      })
      sessionOwner.on(SessionStarted, () => {
        sessionOwner.emit(NextQuestion, { session: id })
      })

      user.on(NextQuestion, () => {
        const response: QuestionResponseArgs = {
          session: id,
          name,
          index: 0,
          response: {
            type: MultipleChoiceFormat,
            choice: 1,
            submitter: name,
          },
        }
        user.emit(QuestionResponse, response)
      })

      user.on(QuestionResponseFailed, () => {
        expect('QuestionResponseFailed').toBe('QuestionResponseSuccess')
        done()
      })

      let userReceived = false
      let ownerReceived = false
      user.on(
        QuestionResponseSuccess,
        (res: QuestionResponseSuccessResponse) => {
          userReceived = true
          expect(res.index).toBe(0)
          expect(res.session).toBe(id)
          expect(res.firstCorrect).toBe(true)
          expect(res.isCorrect).toBe(true)
          if (userReceived && ownerReceived) {
            done()
          }
        }
      )
      sessionOwner.on(
        QuestionResponseAdded,
        (res: QuestionResponseAddedResponse) => {
          ownerReceived = true
          expect(res.index).toBe(0)
          expect(res.session).toBe(id)
          expect(res.user).toBe(name)
          expect(res.response).toBe('1')
          expect(res.isCorrect).toBe(true)
          expect(res.firstCorrect).toBe(name)
          expect(res.frequency).toBe(1)
          expect(res.relativeFrequency).toBe(1)
          if (userReceived && ownerReceived) {
            done()
          }
        }
      )

      const question: Question = new Question('Question', {
        type: MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 1,
      })

      sessionOwner.emit(AddQuestion, {
        session: id,
        ...question,
      })
    })

    it('should notify all users of session ending', (done) => {
      let ownerReceived = false
      let userReceived = false

      sessionOwner.on(SessionEnded, (args: SessionEndedResponse) => {
        ownerReceived = true
        expect(args.session).toBe(id)
        if (ownerReceived && userReceived) {
          done()
        }
      })
      user.on(SessionEnded, (args: SessionEndedResponse) => {
        userReceived = true
        expect(args.session).toBe(id)
        if (ownerReceived && userReceived) {
          done()
        }
      })
      sessionOwner.on(SessionEndFailed, () => {
        expect('SessionEndFailed').toBe('SessionEnded')
        done()
      })
      user.on(SessionEndFailed, () => {
        expect('SessionEndFailed').toBe('SessionEnded')
        done()
      })

      const args: EndSessionArgs = {
        session: id,
      }
      sessionOwner.emit(EndSession, args)
    })
  })
})
