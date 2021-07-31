import { Server } from 'http'
import { nanoid } from 'nanoid'
import { AddressInfo } from 'net'
import { createSocketServer } from 'server'
import { MultipleChoiceFormat, Question } from 'session/quiz'
import * as events from 'event'
import * as requests from 'requests'
import * as responses from 'responses'
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
        sessionOwner.emit(events.CreateNewSession)
      })
      user.connect()

      sessionOwner.on(
        events.CreatedSession,
        (res: responses.CreatedSessionResponse) => {
          id = res.session
          name = nanoid(4)
          const joinArgs: requests.JoinSessionArgs = {
            id,
            name,
          }
          user.emit(events.JoinSession, joinArgs)
        }
      )

      user.on(events.JoinSessionSuccess, () => {
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
      const testName = nanoid(4)
      testUser.on('connect', () => {
        const joinArgs: requests.JoinSessionArgs = {
          id,
          name: testName,
        }
        testUser.emit(events.JoinSession, joinArgs)
      })
      testUser.connect()

      testUser.on(
        events.JoinSessionSuccess,
        (res: responses.JoinSessionSuccessResponse) => {
          expect(res.session).toBe(id)
          expect(res.name).toBe(testName)
          testUser.close()
          done()
        }
      )
      testUser.on(events.JoinSessionFailed, () => {
        expect(`JoinFailed, session id: ${id}`).toBe('JoinSessionSuccess')
        testUser.close()
        done()
      })
    })

    it('should allow the session owner to add questions', (done) => {
      sessionOwner.on(events.AddQuestionFailed, () => {
        expect('AddQuestionFailed').toBe('AddQuestionSuccess')
        done()
      })
      sessionOwner.on(events.AddQuestionSuccess, () => {
        done()
      })

      const question: Question = new Question('Question', {
        type: MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 0,
      })
      sessionOwner.emit(events.AddQuestion, {
        session: id,
        question,
      })
    })

    it('should NOT allow other users to add questions', (done) => {
      user.on(events.AddQuestionFailed, () => {
        done()
      })
      user.on(events.AddQuestionSuccess, () => {
        expect('AddQuestionSuccess').toBe('AddQuestionFailed')
        done()
      })

      const question: Question = new Question('Question', {
        type: MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 1,
      })

      user.emit(events.AddQuestion, {
        session: id,
        question,
      })
    })

    it('should broadcast to all users when owner kicks user', (done) => {
      sessionOwner.on(events.SessionKickFailed, () => {
        expect('SessionKickFailed').toBe('SessionKickSuccess')
        done()
      })

      let eventTimeout: NodeJS.Timeout
      let ownerReceive: boolean = false
      sessionOwner.on(
        events.SessionKickSuccess,
        (res: responses.SessionKickSuccessResponse) => {
          ownerReceive = true
          expect(res.name).toBe(name)
          expect(res.session).toBe(id)
          if (ownerReceive && userReceive) {
            clearTimeout(eventTimeout)
            done()
          }
        }
      )

      let userReceive: boolean = false
      user.on(
        events.SessionKickSuccess,
        (res: responses.SessionKickSuccessResponse) => {
          userReceive = true
          expect(res.name).toBe(name)
          expect(res.session).toBe(id)
          if (ownerReceive && userReceive) {
            clearTimeout(eventTimeout)
            done()
          }
        }
      )

      // Fail if both sockets did not receive SessionKickSuccess
      eventTimeout = setTimeout(() => {
        if (!ownerReceive || !userReceive) {
          expect('No Event').toEqual('SessionKickSuccess')
        }
        done()
      }, 2000)

      const kickArgs: requests.SessionKickArgs = {
        name,
        session: id,
      }
      sessionOwner.emit(events.SessionKick, kickArgs)
    })

    it('should NOT allow other users to kick users', (done) => {
      user.on(events.SessionKickFailed, () => {
        done()
      })

      user.on(events.SessionKickSuccess, () => {
        expect('SessionKickSuccess').toEqual('SessionKickFailed')
        done()
      })

      const kickArgs: requests.SessionKickArgs = {
        name,
        session: id,
      }
      user.emit(events.SessionKick, kickArgs)
    })

    it('should broadcast to all users when owner starts session', (done) => {
      // Fail if SessionStarted is not received after a timeout
      let eventTimeout = setTimeout(() => {
        expect('No Event').toEqual('SessionStarted')
        done()
      }, 2000)

      user.on(events.SessionStarted, () => {
        clearTimeout(eventTimeout)
        done()
      })

      sessionOwner.emit(events.StartSession, { session: id })
    })

    it('should broadcast next question to all users', (done) => {
      let eventTimeout: NodeJS.Timeout
      let userReceived = false
      let ownerReceived = false
      user.on(events.SessionStarted, () => {
        sessionOwner.emit(events.NextQuestion, {
          session: id,
        })

        // Fail if NextQuestion is not received
        eventTimeout = setTimeout(() => {
          expect('No Event').toBe('NextQuestion')
        }, 2000)
      })

      const question: Question = new Question('Question', {
        type: MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 1,
      })

      user.on(events.NextQuestion, (res: responses.NextQuestionResponse) => {
        if (res.question.text === question.text) {
          userReceived = true
          if (userReceived && ownerReceived) {
            clearTimeout(eventTimeout)
            done()
          }
        }
      })

      sessionOwner.on(events.AddQuestionSuccess, () => {
        sessionOwner.emit(events.StartSession, { session: id })
      })
      sessionOwner.on(
        events.NextQuestion,
        (res: responses.NextQuestionResponse) => {
          if (res.question.text === question.text) {
            ownerReceived = true
            if (userReceived && ownerReceived) {
              clearTimeout(eventTimeout)
              done()
            }
          }
        }
      )
      sessionOwner.emit(events.AddQuestion, {
        session: id,
        question,
      })
    })

    it('should grade responses and send results', (done) => {
      sessionOwner.on(events.AddQuestionSuccess, () => {
        sessionOwner.emit(events.StartSession, { session: id })
      })
      sessionOwner.on(events.SessionStarted, () => {
        sessionOwner.emit(events.NextQuestion, { session: id })
      })

      user.on(events.NextQuestion, () => {
        const response: requests.QuestionResponseArgs = {
          session: id,
          name,
          index: 0,
          response: {
            type: MultipleChoiceFormat,
            answer: 1,
            submitter: name,
          },
        }
        user.emit(events.QuestionResponse, response)
      })

      user.on(events.QuestionResponseFailed, () => {
        expect('QuestionResponseFailed').toBe('QuestionResponseSuccess')
        done()
      })

      let userReceived = false
      let ownerReceived = false
      user.on(
        events.QuestionResponseSuccess,
        (res: responses.QuestionResponseSuccessResponse) => {
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
        events.QuestionResponseAdded,
        (res: responses.QuestionResponseAddedResponse) => {
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

      sessionOwner.emit(events.AddQuestion, {
        session: id,
        question,
      })
    })

    it('should notify all users of session ending', (done) => {
      let ownerReceived = false
      let userReceived = false

      sessionOwner.on(
        events.SessionEnded,
        (res: responses.SessionEndedResponse) => {
          ownerReceived = true
          expect(res.session).toBe(id)
          if (ownerReceived && userReceived) {
            done()
          }
        }
      )
      user.on(events.SessionEnded, (res: responses.SessionEndedResponse) => {
        userReceived = true
        expect(res.session).toBe(id)
        if (ownerReceived && userReceived) {
          done()
        }
      })
      sessionOwner.on(events.SessionEndFailed, () => {
        expect('SessionEndFailed').toBe('SessionEnded')
        done()
      })
      user.on(events.SessionEndFailed, () => {
        expect('SessionEndFailed').toBe('SessionEnded')
        done()
      })

      const args: requests.EndSessionArgs = {
        session: id,
      }
      sessionOwner.emit(events.EndSession, args)
    })

    it('should notify users when owner disconnects', (done) => {
      let eventTimeout: NodeJS.Timeout

      user.on(events.SessionEnded, () => {
        clearTimeout(eventTimeout)
        done()
      })

      eventTimeout = setTimeout(() => {
        expect('No Event').toBe('SessionEnded')
      }, 500)

      sessionOwner.disconnect()
    })

    it('should notify users when another user disconnects', (done) => {
      let eventTimeout: NodeJS.Timeout

      sessionOwner.on(
        events.UserDisconnected,
        (res: responses.UserDisconnectedResponse) => {
          expect(res.name).toBe(name)
          expect(res.session).toBe(id)
          clearTimeout(eventTimeout)
          done()
        }
      )

      eventTimeout = setTimeout(() => {
        expect('No Event').toBe('UserDisconnected')
      }, 500)

      user.disconnect()
    })

    it('should not send events to users that have left', (done) => {
      let eventTimeout: NodeJS.Timeout
      user.on(events.SessionEnded, () => {
        clearTimeout(eventTimeout)
        expect('SessionEnded').toBe('No Event')
        done()
      })
      user.on(events.NextQuestion, () => {
        clearTimeout(eventTimeout)
        expect('NextQuestion').toBe('No Event')
        done()
      })

      user.disconnect()

      sessionOwner.emit(events.StartSession, { session: id })

      eventTimeout = setTimeout(() => {
        done()
      }, 750)

      const question: Question = new Question('Question', {
        type: MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 1,
      })

      sessionOwner.on(events.AddQuestionSuccess, () => {
        sessionOwner.emit(events.NextQuestion, { session: id })
      })

      sessionOwner.emit(events.AddQuestion, {
        session: id,
        question,
      })
    })

    it('should allow session owner to end question', (done) => {
      let eventTimeout: NodeJS.Timeout
      let userReceived = false
      let ownerReceived = false

      user.on(events.SessionStarted, () => {
        sessionOwner.emit(events.NextQuestion, {
          session: id,
        })
      })

      const question: Question = new Question('Question', {
        type: MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 1,
      })

      user.on(events.QuestionEnded, () => {
        userReceived = true
        if (userReceived && ownerReceived) {
          clearTimeout(eventTimeout)
          done()
        }
      })

      sessionOwner.on(events.AddQuestionSuccess, () => {
        sessionOwner.emit(events.StartSession, { session: id })
      })
      sessionOwner.on(events.NextQuestion, () => {
        const args: requests.EndQuestionArgs = {
          session: id,
          question: 0,
        }
        sessionOwner.emit(events.EndQuestion, args)

        // Fail if QuestionEnded is not received
        eventTimeout = setTimeout(() => {
          expect('No Event').toBe('QuestionEnded')
        }, 2000)
      })

      sessionOwner.on(events.QuestionEnded, () => {
        ownerReceived = true
        if (userReceived && ownerReceived) {
          clearTimeout(eventTimeout)
          done()
        }
      })

      sessionOwner.emit(events.AddQuestion, {
        session: id,
        question,
      })
    })
  })
})
