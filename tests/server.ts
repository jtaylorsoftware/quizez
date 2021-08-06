import { Server } from 'http'
import { nanoid } from 'nanoid'
import { AddressInfo } from 'net'
import { createSocketServer } from 'server'
import { Feedback, QuestionFormat, Question, Rating } from 'session/quiz'
import SessionEvent from 'event'
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
        sessionOwner.emit(SessionEvent.CreateNewSession)
      })
      user.connect()

      sessionOwner.on(
        SessionEvent.CreatedSession,
        (res: responses.CreateSessionSuccess) => {
          id = res.session
          name = nanoid(4)
          const joinArgs: requests.JoinSession = {
            id,
            name,
          }
          user.emit(SessionEvent.JoinSession, joinArgs)
        }
      )

      user.on(SessionEvent.JoinSessionSuccess, () => {
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
        const joinArgs: requests.JoinSession = {
          id,
          name: testName,
        }
        testUser.emit(SessionEvent.JoinSession, joinArgs)
      })
      testUser.connect()

      testUser.on(
        SessionEvent.JoinSessionSuccess,
        (res: responses.JoinSessionSuccess) => {
          expect(res.session).toBe(id)
          expect(res.name).toBe(testName)
          testUser.close()
          done()
        }
      )
      testUser.on(SessionEvent.JoinSessionFailed, () => {
        expect(`JoinFailed, session id: ${id}`).toBe('JoinSessionSuccess')
        testUser.close()
        done()
      })
    })

    it('should allow the session owner to add questions', (done) => {
      sessionOwner.on(SessionEvent.AddQuestionFailed, () => {
        expect('AddQuestionFailed').toBe('AddQuestionSuccess')
        done()
      })
      sessionOwner.on(SessionEvent.AddQuestionSuccess, () => {
        done()
      })

      const question: Question = new Question('Question', {
        type: QuestionFormat.MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 0,
      })
      sessionOwner.emit(SessionEvent.AddQuestion, {
        session: id,
        question,
      })
    })

    it('should NOT allow other users to add questions', (done) => {
      user.on(SessionEvent.AddQuestionFailed, () => {
        done()
      })
      user.on(SessionEvent.AddQuestionSuccess, () => {
        expect('AddQuestionSuccess').toBe('AddQuestionFailed')
        done()
      })

      const question: Question = new Question('Question', {
        type: QuestionFormat.MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 1,
      })

      user.emit(SessionEvent.AddQuestion, {
        session: id,
        question,
      })
    })

    it('should broadcast to all users when owner kicks user', (done) => {
      sessionOwner.on(SessionEvent.SessionKickFailed, () => {
        expect('SessionKickFailed').toBe('SessionKickSuccess')
        done()
      })

      let eventTimeout: NodeJS.Timeout
      let ownerReceive: boolean = false
      sessionOwner.on(
        SessionEvent.SessionKickSuccess,
        (res: responses.SessionKickSuccess) => {
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
        SessionEvent.SessionKickSuccess,
        (res: responses.SessionKickSuccess) => {
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

      const kickArgs: requests.SessionKick = {
        name,
        session: id,
      }
      sessionOwner.emit(SessionEvent.SessionKick, kickArgs)
    })

    it('should NOT allow other users to kick users', (done) => {
      user.on(SessionEvent.SessionKickFailed, () => {
        done()
      })

      user.on(SessionEvent.SessionKickSuccess, () => {
        expect('SessionKickSuccess').toEqual('SessionKickFailed')
        done()
      })

      const kickArgs: requests.SessionKick = {
        name,
        session: id,
      }
      user.emit(SessionEvent.SessionKick, kickArgs)
    })

    it('should broadcast to all users when owner starts session', (done) => {
      // Fail if SessionStarted is not received after a timeout
      let eventTimeout = setTimeout(() => {
        expect('No Event').toEqual('SessionStarted')
        done()
      }, 2000)

      user.on(SessionEvent.SessionStarted, () => {
        clearTimeout(eventTimeout)
        done()
      })

      sessionOwner.emit(SessionEvent.StartSession, { session: id })
    })

    it('should broadcast next question to all users', (done) => {
      let eventTimeout: NodeJS.Timeout
      let userReceived = false
      let ownerReceived = false
      user.on(SessionEvent.SessionStarted, () => {
        sessionOwner.emit(SessionEvent.NextQuestion, {
          session: id,
        })

        // Fail if NextQuestion is not received
        eventTimeout = setTimeout(() => {
          expect('No Event').toBe('NextQuestion')
        }, 2000)
      })

      const question: Question = new Question('Question', {
        type: QuestionFormat.MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 1,
      })

      user.on(SessionEvent.NextQuestion, (res: responses.NextQuestion) => {
        if (res.question.text === question.text) {
          userReceived = true
          if (userReceived && ownerReceived) {
            clearTimeout(eventTimeout)
            done()
          }
        }
      })

      sessionOwner.on(SessionEvent.AddQuestionSuccess, () => {
        sessionOwner.emit(SessionEvent.StartSession, { session: id })
      })
      sessionOwner.on(
        SessionEvent.NextQuestion,
        (res: responses.NextQuestion) => {
          if (res.question.text === question.text) {
            ownerReceived = true
            if (userReceived && ownerReceived) {
              clearTimeout(eventTimeout)
              done()
            }
          }
        }
      )
      sessionOwner.emit(SessionEvent.AddQuestion, {
        session: id,
        question,
      })
    })

    it('should grade responses and send results', (done) => {
      sessionOwner.on(SessionEvent.AddQuestionSuccess, () => {
        sessionOwner.emit(SessionEvent.StartSession, { session: id })
      })
      sessionOwner.on(SessionEvent.SessionStarted, () => {
        sessionOwner.emit(SessionEvent.NextQuestion, { session: id })
      })

      user.on(SessionEvent.NextQuestion, () => {
        const response: requests.QuestionResponse = {
          session: id,
          name,
          index: 0,
          response: {
            type: QuestionFormat.MultipleChoiceFormat,
            answer: 1,
            submitter: name,
          },
        }
        user.emit(SessionEvent.QuestionResponse, response)
      })

      user.on(SessionEvent.QuestionResponseFailed, () => {
        expect('QuestionResponseFailed').toBe('QuestionResponseSuccess')
        done()
      })

      let userReceived = false
      let ownerReceived = false
      user.on(
        SessionEvent.QuestionResponseSuccess,
        (res: responses.QuestionResponseSuccess) => {
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
        SessionEvent.QuestionResponseAdded,
        (res: responses.QuestionResponseAdded) => {
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
        type: QuestionFormat.MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 1,
      })

      sessionOwner.emit(SessionEvent.AddQuestion, {
        session: id,
        question,
      })
    })

    it('should notify all users of session ending', (done) => {
      let ownerReceived = false
      let userReceived = false

      sessionOwner.on(
        SessionEvent.SessionEnded,
        (res: responses.SessionEndedSuccess) => {
          ownerReceived = true
          expect(res.session).toBe(id)
          if (ownerReceived && userReceived) {
            done()
          }
        }
      )
      user.on(
        SessionEvent.SessionEnded,
        (res: responses.SessionEndedSuccess) => {
          userReceived = true
          expect(res.session).toBe(id)
          if (ownerReceived && userReceived) {
            done()
          }
        }
      )
      sessionOwner.on(SessionEvent.SessionEndFailed, () => {
        expect('SessionEndFailed').toBe('SessionEnded')
        done()
      })
      user.on(SessionEvent.SessionEndFailed, () => {
        expect('SessionEndFailed').toBe('SessionEnded')
        done()
      })

      const args: requests.EndSession = {
        session: id,
      }
      sessionOwner.emit(SessionEvent.EndSession, args)
    })

    it('should notify users when owner disconnects', (done) => {
      let eventTimeout: NodeJS.Timeout

      user.on(SessionEvent.SessionEnded, () => {
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
        SessionEvent.UserDisconnected,
        (res: responses.UserDisconnected) => {
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

    it('should not send SessionEvent to users that have left', (done) => {
      let eventTimeout: NodeJS.Timeout
      user.on(SessionEvent.SessionEnded, () => {
        clearTimeout(eventTimeout)
        expect('SessionEnded').toBe('No Event')
        done()
      })
      user.on(SessionEvent.NextQuestion, () => {
        clearTimeout(eventTimeout)
        expect('NextQuestion').toBe('No Event')
        done()
      })

      user.disconnect()

      sessionOwner.emit(SessionEvent.StartSession, { session: id })

      eventTimeout = setTimeout(() => {
        done()
      }, 750)

      const question: Question = new Question('Question', {
        type: QuestionFormat.MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 1,
      })

      sessionOwner.on(SessionEvent.AddQuestionSuccess, () => {
        sessionOwner.emit(SessionEvent.NextQuestion, { session: id })
      })

      sessionOwner.emit(SessionEvent.AddQuestion, {
        session: id,
        question,
      })
    })

    it('should allow session owner to end question', (done) => {
      let eventTimeout: NodeJS.Timeout
      let userReceived = false
      let ownerReceived = false

      user.on(SessionEvent.SessionStarted, () => {
        sessionOwner.emit(SessionEvent.NextQuestion, {
          session: id,
        })
      })

      const question: Question = new Question('Question', {
        type: QuestionFormat.MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 1,
      })

      user.on(SessionEvent.QuestionEnded, () => {
        userReceived = true
        if (userReceived && ownerReceived) {
          clearTimeout(eventTimeout)
          done()
        }
      })

      sessionOwner.on(SessionEvent.AddQuestionSuccess, () => {
        sessionOwner.emit(SessionEvent.StartSession, { session: id })
      })
      sessionOwner.on(SessionEvent.NextQuestion, () => {
        const args: requests.EndQuestion = {
          session: id,
          question: 0,
        }
        sessionOwner.emit(SessionEvent.EndQuestion, args)

        // Fail if QuestionEnded is not received
        eventTimeout = setTimeout(() => {
          expect('No Event').toBe('QuestionEnded')
        }, 2000)
      })

      sessionOwner.on(SessionEvent.QuestionEnded, () => {
        ownerReceived = true
        if (userReceived && ownerReceived) {
          clearTimeout(eventTimeout)
          done()
        }
      })

      sessionOwner.emit(SessionEvent.AddQuestion, {
        session: id,
        question,
      })
    })

    it('should allow users to submit feedback', (done) => {
      let eventTimeout: NodeJS.Timeout
      let userReceived = false
      let ownerReceived = false

      const question: Question = new Question('Question', {
        type: QuestionFormat.MultipleChoiceFormat,
        choices: [{ text: 'Choice One' }, { text: 'Choice Two' }],
        answer: 1,
      })

      const feedbackSubmission: requests.SubmitFeedback = {
        session: id,
        name,
        question: 0,
        feedback: new Feedback(Rating.Easy, 'It is too easy'),
      }

      sessionOwner.on(SessionEvent.AddQuestionSuccess, () => {
        sessionOwner.emit(SessionEvent.StartSession, { session: id })
      })
      sessionOwner.on(SessionEvent.NextQuestion, () => {
        user.emit(SessionEvent.SubmitFeedback, feedbackSubmission)

        // Fail if Feedback is not received
        eventTimeout = setTimeout(() => {
          expect('No Event').toBe('FeedbackSubmitted and SubmitFeedbackSuccess')
        }, 2000)
      })

      user.on(SessionEvent.SubmitFeedbackSuccess, () => {
        userReceived = true
        if (userReceived && ownerReceived) {
          clearTimeout(eventTimeout)
          done()
        }
      })

      sessionOwner.on(
        SessionEvent.FeedbackSubmitted,
        (res: responses.FeedbackSubmitted) => {
          expect(res.feedback).toEqual(feedbackSubmission.feedback)
          expect(res.user).toBe(feedbackSubmission.name)
          ownerReceived = true
          if (userReceived && ownerReceived) {
            clearTimeout(eventTimeout)
            done()
          }
        }
      )

      user.on(SessionEvent.SessionStarted, () => {
        sessionOwner.emit(SessionEvent.NextQuestion, {
          session: id,
        })
      })

      sessionOwner.emit(SessionEvent.AddQuestion, {
        session: id,
        question,
      })
    })
  })
})
