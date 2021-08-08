jest.mock('socket.io')
jest.mock('socket.io/dist/client')
import { QuestionFormat } from 'api/question'
import { QuestionEndedSuccess } from 'api/response'
import { SessionController } from 'server/controller'
import { Session } from 'session'
import { Namespace, Server, Socket } from 'socket.io'
import { Client } from 'socket.io/dist/client'

describe('SessionController', () => {
  // SUT
  let controller: SessionController

  // Mocks
  let server: Server
  let socket: Socket
  let session: Session

  beforeEach(() => {
    server = new Server()

    socket = new Socket(
      new Namespace(server, 'namespace'),
      new Client(server, {}),
      {}
    )

    controller = new SessionController(server)

    // Mock utility function wrapping all socket.io `emit` calls
    // because it's easier to do than figuring out how to construct a mock
    // BroadcastOperator

    // @ts-ignore
    controller.emit = jest.fn((target: string, response: any) => {})

    session = new Session(socket.id)
    // @ts-ignore
    controller._sessions = controller._sessions.set('session', session)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('addQuestionToSession', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    it('should add a Question with a timeout to emit QuestionEnded', () => {
      // Add question
      const handler = controller.addQuestionToSession(socket)
      handler({
        session: 'session',
        question: {
          text: 'Question',
          body: {
            type: QuestionFormat.FillInFormat,
            answers: [
              { text: 'One', points: 200 },
              { text: 'Two', points: 200 },
            ],
          },
          timeLimit: 60,
        },
      })

      // Get question and check it has an onTimeout
      const question = session.quiz.questionAt(0)!
      // @ts-ignore
      expect(question.onTimeout).toBeDefined()

      // @ts-ignore
      question.onTimeout()

      // Calling onTimeout should have caused emit to happen
      // @ts-ignore
      expect(controller.emit).toHaveBeenNthCalledWith(
        2,
        session.id,
        new QuestionEndedSuccess(session.id, 0)
      )
    })
  })
})
