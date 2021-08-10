jest.mock('socket.io')
jest.mock('socket.io/dist/client')
import SessionEvent from 'api/event'
import { QuestionFormat } from 'api/question'
import { JoinSession } from 'api/request'
import { EventResponse, ResponseStatus } from 'api/response'
import { nanoid } from 'nanoid'
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
  let socketId: string

  beforeEach(() => {
    server = new Server()
    ;(server.in as jest.Mock).mockReturnValue({
      socketsLeave: jest.fn(() => {}),
    })
    socket = new Socket(
      new Namespace(server, 'namespace'),
      new Client(server, {}),
      {}
    )
    socketId = nanoid()
    // @ts-ignore
    socket.id = socketId

    controller = new SessionController(server)

    // Mock utility function wrapping all socket.io `emit` calls
    // because it's easier to do than figuring out how to construct a mock
    // BroadcastOperator

    // @ts-ignore
    controller.emit = jest.fn((target: string, response: any) => {})
    // @ts-ignore
    controller.emitExcept = jest.fn(
      (target: string, except: string, response: any) => {}
    )

    session = new Session(socketId)
    // @ts-ignore
    controller._sessions = controller._sessions.set(session.id, session)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('createSession', () => {
    it('should not create session if there is no callback', () => {
      controller.createSession(socket)()
      expect(controller.sessions.size).toBe(1) // only the session added in setup
    })
  })

  describe('addUserToSession', () => {
    let userSocket: Socket
    beforeEach(() => {
      userSocket = new Socket(
        new Namespace(server, 'namespace'),
        new Client(server, {}),
        {}
      )
      // @ts-ignore
      userSocket.id = nanoid()
    })
    it('should not add user if no callback', () => {
      const name = nanoid()
      controller.addUserToSession(userSocket)(<JoinSession>{
        id: session.id,
        name,
      })
      expect(session.findUserByName(name)).toBeUndefined()
    })

    it('should add user if there is a callback', () => {
      const name = nanoid()
      controller.addUserToSession(userSocket)(
        <JoinSession>{
          id: session.id,
          name,
        },
        () => {}
      )
      expect(session.findUserByName(name)).not.toBeUndefined()
    })

    it('should not add same socket twice', () => {
      const name = nanoid()
      const testName = nanoid()
      let res!: EventResponse
      controller.addUserToSession(userSocket)(
        <JoinSession>{
          id: session.id,
          name,
        },
        () => {}
      )
      controller.addUserToSession(userSocket)(
        <JoinSession>{
          id: session.id,
          name: testName,
        },
        (response: EventResponse) => {
          res = response
        }
      )
      expect(res.status).toBe(ResponseStatus.Failure)
    })

    it('should not add same username twice', () => {
      const name = nanoid()
      let res!: EventResponse
      let testSocket = { ...userSocket }
      testSocket.id = nanoid()
      controller.addUserToSession(userSocket)(
        <JoinSession>{
          id: session.id,
          name,
        },
        () => {}
      )
      controller.addUserToSession(testSocket as Socket)(
        <JoinSession>{
          id: session.id,
          name,
        },
        (response: EventResponse) => {
          res = response
        }
      )
      expect(res.status).toBe(ResponseStatus.Failure)
    })
  })

  describe('addQuestionToSession', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    it('should not add a Question if socket does not own session', () => {
      const userSocket = new Socket(
        new Namespace(server, 'namespace'),
        new Client(server, {}),
        {}
      )
      // @ts-ignore
      userSocket.id = nanoid()

      let res!: EventResponse
      controller.addQuestionToSession(userSocket)(
        {
          session: session.id,
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
        },
        (response: EventResponse) => {
          res = response
        }
      )

      expect(res.status).toBe(ResponseStatus.Failure)
    })

    it('should not add anything if there is no Question arg', () => {
      let res!: EventResponse
      controller.addQuestionToSession(socket)(
        {
          session: session.id,
        },
        (response: EventResponse) => {
          res = response
        }
      )

      expect(res.status).toBe(ResponseStatus.Failure)
    })

    it('should add a Question with a timeout to emit QuestionEnded', () => {
      // Add question
      const handler = controller.addQuestionToSession(socket)
      handler(
        {
          session: session.id,
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
        },
        () => {}
      )

      // Get question and check it has an onTimeout
      const question = session.quiz.questionAt(0)!
      // @ts-ignore
      expect(question.onTimeout).toBeDefined()

      // @ts-ignore
      question.onTimeout()

      // Calling onTimeout should have caused emit to happen
      // @ts-ignore
      expect(controller.emit).toHaveBeenNthCalledWith(1, session.id, {
        status: ResponseStatus.Success,
        event: SessionEvent.QuestionEnded,
        session: session.id,
        data: {
          question: 0,
        },
      })
    })
  })

  describe('removeUserFromSession', () => {
    let userSocket: Socket
    let username = 'user'
    beforeEach((done) => {
      userSocket = new Socket(
        new Namespace(server, 'namespace'),
        new Client(server, {}),
        {}
      )
      // @ts-ignore
      userSocket.id = nanoid()

      controller.addUserToSession(userSocket)(
        { id: session.id, name: username },
        () => {
          done()
        }
      )
    })

    it('should not remove user if socket does not own session', () => {
      let res!: EventResponse
      controller.removeUserFromSession(userSocket)(
        {
          session: session.id,
          name: username,
        },
        (response: EventResponse) => {
          res = response
        }
      )

      expect(res.status).toBe(ResponseStatus.Failure)
      expect(session.findUserByName(username)).not.toBeUndefined()
    })

    it('should actually remove user if socket owns session', () => {
      let res!: EventResponse
      controller.removeUserFromSession(socket)(
        {
          session: session.id,
          name: username,
        },
        (response: EventResponse) => {
          res = response
        }
      )

      expect(res.status).toBe(ResponseStatus.Success)
      expect(session.findUserByName(username)).toBeUndefined()
    })
  })
})
