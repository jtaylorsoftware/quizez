import SessionEvent from 'api/event'
import { Rating } from 'api/feedback'
import { QuestionFormat, QuestionSubmission } from 'api/question'
import * as requests from 'api/request'
import * as responses from 'api/response'
import { EventResponse, ResponseStatus } from 'api/response'
import { Server } from 'http'
import { nanoid } from 'nanoid'
import { AddressInfo } from 'net'
import { createSocketServer } from 'server'
import { Feedback, Question } from 'session/quiz'
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
        // Create a new session once the user has connected to the server
        sessionOwner.emit(
          SessionEvent.CreateNewSession,
          (res: EventResponse) => {
            if (res.status === ResponseStatus.Success) {
              id = res.session
              name = nanoid(4)
              const joinArgs: requests.JoinSession = {
                id,
                name,
              }

              // Once the session is created, have user join
              user.emit(
                SessionEvent.JoinSession,
                joinArgs,
                (res: EventResponse) => {
                  if (res.status === ResponseStatus.Success) {
                    done()
                  }
                }
              )
            }
          }
        )
      })
      user.connect()
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
        // Join session once connected to server
        testUser.emit(
          SessionEvent.JoinSession,
          joinArgs,
          (res: EventResponse) => {
            expect(res.status).toBe(ResponseStatus.Success)
            expect(res.session).toBe(id)
            testUser.close()
            done()
          }
        )
      })
      testUser.connect()
    })

    it('should allow the session owner to add questions', (done) => {
      const question: QuestionSubmission = {
        text: 'Question',
        body: {
          type: QuestionFormat.MultipleChoiceFormat,
          choices: [
            { text: 'Choice One', points: 200 },
            { text: 'Choice Two', points: 200 },
          ],
          answer: 0,
        },
        timeLimit: Question.minTimeLimit,
      }
      sessionOwner.emit(
        SessionEvent.AddQuestion,
        {
          session: id,
          question,
        },
        (res: EventResponse) => {
          expect(res.status).toBe(ResponseStatus.Success)
          expect(res.event).toBe(SessionEvent.AddQuestion)
          done()
        }
      )
    })

    it('should NOT allow other users to add questions', (done) => {
      const question: QuestionSubmission = {
        text: 'Question',
        body: {
          type: QuestionFormat.MultipleChoiceFormat,
          choices: [
            { text: 'Choice One', points: 200 },
            { text: 'Choice Two', points: 200 },
          ],
          answer: 0,
        },
        timeLimit: Question.minTimeLimit,
      }

      user.emit(
        SessionEvent.AddQuestion,
        {
          session: id,
          question,
        },
        (res: EventResponse) => {
          expect(res.status).toBe(ResponseStatus.Failure)
          done()
        }
      )
    })

    it('should broadcast to all users when owner kicks user', (done) => {
      let ownerReceive: boolean = false
      let userReceive: boolean = false

      user.on(SessionEvent.UserKicked, (res: responses.UserKicked) => {
        expect(res.data.name).toBe(name)
        expect(res.session).toBe(id)
        userReceive = true
        if (ownerReceive && userReceive) {
          done()
        }
      })

      const kickArgs: requests.SessionKick = {
        name,
        session: id,
      }
      sessionOwner.emit(
        SessionEvent.SessionKick,
        kickArgs,
        (res: EventResponse) => {
          if (res.status === ResponseStatus.Success) {
            ownerReceive = true
            if (ownerReceive && userReceive) {
              done()
            }
          } else {
            expect(res.status).toBe(ResponseStatus.Success)
            expect(res.event).toBe(SessionEvent.SessionKick)
            done()
          }
        }
      )
    })

    it('should NOT allow other users to kick users', (done) => {
      const kickArgs: requests.SessionKick = {
        name,
        session: id,
      }
      user.emit(SessionEvent.SessionKick, kickArgs, (res: EventResponse) => {
        expect(res.status).toBe(ResponseStatus.Failure)
        expect(res.event).toBe(SessionEvent.SessionKick)
        done()
      })
    })

    it('should broadcast to all users when owner starts session', (done) => {
      let userReceive = false
      let ownerReceive = false
      user.on(SessionEvent.SessionStarted, () => {
        userReceive = true
        if (ownerReceive && userReceive) {
          done()
        }
      })

      sessionOwner.emit(
        SessionEvent.StartSession,
        { session: id },
        (res: EventResponse) => {
          expect(res.status).toBe(ResponseStatus.Success)
          expect(res.event).toBe(SessionEvent.StartSession)
          ownerReceive = true
          if (ownerReceive && userReceive) {
            done()
          }
        }
      )
    })

    it('should notify all users of session ending', (done) => {
      let ownerReceived = false
      let userReceived = false

      user.on(SessionEvent.SessionEnded, (res: responses.SessionEnded) => {
        expect(res.status).toBe(ResponseStatus.Success)
        expect(res.event).toBe(SessionEvent.SessionEnded)
        expect(res.session).toBe(id)
        userReceived = true
        if (ownerReceived && userReceived) {
          done()
        }
      })

      // Emit the end session request
      sessionOwner.emit(
        SessionEvent.EndSession,
        {
          session: id,
        },
        (res: EventResponse) => {
          expect(res.status).toBe(ResponseStatus.Success)
          expect(res.event).toBe(SessionEvent.EndSession)
          expect(res.session).toBe(id)
          ownerReceived = true
          if (ownerReceived && userReceived) {
            done()
          }
        }
      )
    })

    it('should notify users that session ends when owner disconnects', (done) => {
      user.on(SessionEvent.SessionEnded, () => {
        done()
      })

      sessionOwner.disconnect()
    })

    it('should notify users when another user disconnects', (done) => {
      sessionOwner.on(
        SessionEvent.UserDisconnected,
        (res: responses.UserDisconnected) => {
          expect(res.status).toBe(ResponseStatus.Success)
          expect(res.event).toBe(SessionEvent.UserDisconnected)
          expect(res.session).toBe(id)
          const data = (<responses.UserDisconnected>res).data
          expect(data).toEqual({
            name: name,
          })

          done()
        }
      )

      user.disconnect()
    })

    it('should not send any events to users that have left', (done) => {
      let timeout: NodeJS.Timeout

      user.on(SessionEvent.SessionStarted, () => {
        expect('SessionStarted').toBe('No Event')
        clearTimeout(timeout)
        done()
      })
      user.on(SessionEvent.SessionEnded, () => {
        expect('SessionEnded').toBe('No Event')
        clearTimeout(timeout)
        done()
      })

      // Disconnect immediately after setting up handlers, no events should
      // be received
      user.disconnect()

      // Start session & immediately end it
      sessionOwner.emit(SessionEvent.StartSession, { session: id }, () => {
        sessionOwner.emit(SessionEvent.EndSession, { session: id }, () => {
          // Test passes if no events received
          timeout = setTimeout(() => {
            done()
          }, 500)
        })
      })
    })

    describe('and interacting with questions', () => {
      const question: QuestionSubmission = {
        text: 'Question',
        body: {
          type: QuestionFormat.MultipleChoiceFormat,
          choices: [
            { text: 'Choice One', points: 200 },
            { text: 'Choice Two', points: 200 },
          ],
          answer: 1,
        },
        timeLimit: Question.minTimeLimit,
      }

      beforeEach((done) => {
        // Add a question to the session since each test needs a question
        sessionOwner.emit(
          SessionEvent.AddQuestion,
          {
            session: id,
            question,
          },
          () => {
            // Start the session too since most operations tests require
            // session started
            sessionOwner.emit(
              SessionEvent.StartSession,
              { session: id },
              () => {
                done()
              }
            )
          }
        )
      })

      it('should broadcast next question to all users', (done) => {
        let userReceived = false
        let ownerReceived = false

        user.on(SessionEvent.NextQuestion, (res: responses.NextQuestion) => {
          const { index, question: resQuestion } = res.data
          if (resQuestion.text === question.text && index === 0) {
            userReceived = true
            // If both pushing question and receiving question worked, pass test
            if (userReceived && ownerReceived) {
              done()
            }
          }
        })

        // Push next question
        sessionOwner.emit(
          SessionEvent.NextQuestion,
          { session: id },
          (res: EventResponse) => {
            // Fail test if NextQuestion failed
            if (res.status !== ResponseStatus.Success) {
              expect(res.status).toBe(ResponseStatus.Success)
              done()
            }

            ownerReceived = true
            // If both pushing question and receiving question worked, pass test
            if (userReceived && ownerReceived) {
              done()
            }
          }
        )
      })

      it('should grade responses and send results', (done) => {
        let userReceived = false
        let ownerReceived = false

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
          // When user receives next question, add their response
          // and check if it worked
          user.emit(
            SessionEvent.QuestionResponse,
            response,
            (res: EventResponse) => {
              expect(res.status).toBe(ResponseStatus.Success)
              expect(res.event).toBe(SessionEvent.QuestionResponse)
              const data = (<responses.QuestionResponseSuccess>res).data
              expect(data).toEqual({
                index: 0,
                firstCorrect: true,
                points: 200,
              })
              userReceived = true
              // If both session owner and user have received response confirmation, pass test
              if (userReceived && ownerReceived) {
                done()
              }
            }
          )
        })

        sessionOwner.on(
          SessionEvent.QuestionResponseAdded,
          (res: EventResponse) => {
            // Validate that the session owner received correct statistics data
            expect(res.status).toBe(ResponseStatus.Success)
            expect(res.event).toBe(SessionEvent.QuestionResponseAdded)
            const data = (<responses.QuestionResponseAdded>res).data
            expect(data).toEqual({
              index: 0,
              user: name,
              response: '1',
              points: 200,
              firstCorrect: name,
              frequency: 1,
              relativeFrequency: 1,
            })

            ownerReceived = true
            // If both session owner and user have received response confirmation, pass test
            if (userReceived && ownerReceived) {
              done()
            }
          }
        )

        // push next question
        sessionOwner.emit(SessionEvent.NextQuestion, { session: id }, () => {})
      })

      it('should allow session owner to end question', (done) => {
        let userReceived = false
        let ownerReceived = false

        user.on(SessionEvent.QuestionEnded, (res: responses.QuestionEnded) => {
          // Verify response is formatted correctly
          expect(res.status).toBe(ResponseStatus.Success)
          expect(res.event).toBe(SessionEvent.QuestionEnded)
          expect(res.session).toBe(id)
          const data = (<responses.QuestionEnded>res).data
          // Verify question index is correct
          expect(data.question).toBe(0)
          userReceived = true
          // If both user & owner received, test passes
          if (userReceived && ownerReceived) {
            done()
          }
        })

        // Push next question, starting the quiz/first question
        sessionOwner.emit(SessionEvent.NextQuestion, { session: id }, () => {
          // End Question
          sessionOwner.emit(
            SessionEvent.EndQuestion,
            {
              session: id,
              question: 0,
            },
            (res: EventResponse) => {
              // Check that it was done successfully
              expect(res.status).toBe(ResponseStatus.Success)
              expect(res.event).toBe(SessionEvent.EndQuestion)
              expect(res.session).toBe(id)

              ownerReceived = true
              // If both user & owner received, test passes
              if (userReceived && ownerReceived) {
                done()
              }
            }
          )
        })
      })

      it('should allow users to submit feedback', (done) => {
        let userReceived = false
        let ownerReceived = false

        // The feedback being submitted for test
        const feedbackSubmission: requests.SubmitFeedback = {
          session: id,
          name,
          question: 0,
          feedback: new Feedback(Rating.Easy, 'It is too easy'),
        }

        sessionOwner.on(
          SessionEvent.FeedbackSubmitted,
          (res: responses.FeedbackSubmitted) => {
            // Verify received feedback matches submitted feedback
            expect(res.data.feedback).toEqual(feedbackSubmission.feedback)
            expect(res.data.user).toBe(feedbackSubmission.name)
            expect(res.data.question).toBe(0)

            ownerReceived = true
            // If both user and owner received confirmation, test passes
            if (userReceived && ownerReceived) {
              done()
            }
          }
        )

        // Push next question
        sessionOwner.emit(SessionEvent.NextQuestion, { session: id }, () => {
          // User submits feedback
          user.emit(
            SessionEvent.SubmitFeedback,
            feedbackSubmission,
            (res: EventResponse) => {
              // Check that it was done successfully
              expect(res.status).toBe(ResponseStatus.Success)
              expect(res.event).toBe(SessionEvent.SubmitFeedback)
              expect(res.session).toBe(id)

              userReceived = true
              // If both user & owner received, test passes
              if (userReceived && ownerReceived) {
                done()
              }
            }
          )
        })
      })

      it('should allow quiz owner to send hints', (done) => {
        let userReceived = false
        let ownerReceived = false

        const hint: requests.SendHint = {
          session: id,
          question: 0,
          hint: 'Hint',
        }

        user.on(SessionEvent.HintReceived, (res: responses.HintReceived) => {
          expect(res.status).toBe(ResponseStatus.Success)
          expect(res.event).toBe(SessionEvent.HintReceived)
          expect(res.session).toBe(id)
          const data = (<responses.HintReceived>res).data
          expect(data).toEqual({
            question: hint.question,
            hint: hint.hint,
          })

          userReceived = true
          // If both user & owner received, test passes
          if (userReceived && ownerReceived) {
            done()
          }
        })

        // Push next question
        sessionOwner.emit(SessionEvent.NextQuestion, { session: id }, () => {
          // Send hint
          sessionOwner.emit(
            SessionEvent.SendHint,
            hint,
            (res: EventResponse) => {
              // Check that it was done successfully
              expect(res.status).toBe(ResponseStatus.Success)
              expect(res.event).toBe(SessionEvent.SendHint)
              expect(res.session).toBe(id)

              ownerReceived = true
              // If both user & owner received, test passes
              if (userReceived && ownerReceived) {
                done()
              }
            }
          )
        })
      })
    })
  })
})
