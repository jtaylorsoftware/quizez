import { Question, Session, User } from 'session'
import {
  AddQuestionArgs,
  AddQuestionFailed,
  AddQuestionSuccess,
  CreatedSession,
  CreatedSessionResponse,
  JoinSessionArgs,
  JoinSessionFailed,
  JoinSessionSuccess,
  NextQuestion,
  NextQuestionArgs,
  NextQuestionResponse,
  QuestionResponseAdded,
  QuestionResponseAddedResponse,
  QuestionResponseArgs,
  QuestionResponseFailed,
  QuestionResponseSuccess,
  QuestionResponseSuccessResponse,
  SessionKickArgs,
  SessionKickFailed,
  SessionKickSuccess,
  SessionKickSuccessResponse,
  SessionStartArgs,
  SessionStarted,
} from 'session/events'
import { Socket, Server } from 'socket.io'

const debug = require('debug')('server')

type SocketEventHandler<T> = (args: T) => void

/**
 * Creates a new Session with `socket` as its owner
 * @param socket Client socket creating the Session
 * @param sessions List of created sessions
 */
export function createSession(
  socket: Socket,
  sessions: Map<string, Session>
): SocketEventHandler<void> {
  return () => {
    const session = new Session(socket.id)
    debug(`client creating session with id ${session.id}`)
    const res: CreatedSessionResponse = {
      id: session.id,
    }
    sessions.set(session.id, session)
    socket.join(session.id)
    socket.emit(CreatedSession, res)
  }
}

/**
 * Adds a client socket to a Session, if it exists, and if the
 * client id is not the owner
 * @param socket Client socket joining the Session
 * @param sessions List of created Sessions
 */
export function addUserToSession(
  socket: Socket,
  sessions: Map<string, Session>
): SocketEventHandler<JoinSessionArgs> {
  return (args: JoinSessionArgs) => {
    debug(`client joining session ${args.id} with name ${args.name}`)
    const session = sessions.get(args.id ?? '')
    if (session == null) {
      socket.emit(JoinSessionFailed)
    } else if (args.name == null) {
      socket.emit(JoinSessionFailed)
    } else {
      if (session.addUser(new User(args.name, socket.id))) {
        socket.join(session.id)
        socket.emit(JoinSessionSuccess)
      } else {
        socket.emit(JoinSessionFailed)
      }
    }
  }
}

/**
 * Adds a question to the Session's quiz
 * @param socket Client socket owning the Session
 * @param sessions List of created Sessions
 */
export function addQuestionToSession(
  socket: Socket,
  sessions: Map<string, Session>
): SocketEventHandler<AddQuestionArgs> {
  return (args: AddQuestionArgs) => {
    debug(`client ${socket.id} (presumably owner) adding question to a session`)
    debug(args)
    const session = sessions.get(args.session ?? '')
    if (session == null || session.owner !== socket.id) {
      debug(`client ${socket.id} was not owner of any session`)
      socket.emit(AddQuestionFailed)
    } else {
      debug(`client owns session ${session.id}`)
      if (args.text == null || args.body == null) {
        debug('question has missing fields')
        socket.emit(AddQuestionFailed)
        return
      }

      const question = new Question(args.text, args.body)
      if (!Question.validateQuestion(question)) {
        debug('question has invalid format')
        socket.emit(AddQuestionFailed)
      } else {
        debug('question added')
        session.quiz.addQuestion(question)
        socket.emit(AddQuestionSuccess)
      }
    }
  }
}

/**
 * Removes a user from the owner's Session
 * @param io the socket.io server object
 * @param socket Client socket owning the Session
 * @param sessions List of current Sessions
 */
export function removeUserFromSession(
  io: Server,
  socket: Socket,
  sessions: Map<string, Session>
): SocketEventHandler<SessionKickArgs> {
  return (args: SessionKickArgs) => {
    const session = sessions.get(args.session ?? '')
    if (session == null || session.owner !== socket.id) {
      debug(`could not find session ${args.session} with owner ${socket.id}`)
      socket.emit(SessionKickFailed)
    } else if (args.name == null) {
      debug('missing name field')
      socket.emit(SessionKickFailed)
    } else {
      const user = session.removeUser(args.name)
      if (user == null) {
        debug(`could not remove user ${args.name}`)
        socket.emit(SessionKickFailed)
        return
      }

      debug(`removed user ${args.name}`)
      const res: SessionKickSuccessResponse = {
        session: session.id,
        name: args.name,
      }

      io.to(session.id).emit(SessionKickSuccess, res)
      io.in(user.id).socketsLeave(session.id)
    }
  }
}

/**
 * Starts the owner's Session
 * @param io the socket.io server object
 * @param socket Client socket owning the Session
 * @param sessions List of current Sessions
 */
export function startSession(
  io: Server,
  socket: Socket,
  sessions: Map<string, Session>
): SocketEventHandler<SessionStartArgs> {
  return (args: SessionStartArgs) => {
    const session = sessions.get(args.session ?? '')
    if (session == null || session.owner !== socket.id) {
      debug(`could not find session ${args.session} with owner ${socket.id}`)
      socket.emit(SessionKickFailed)
      return
    }

    debug(`session ${session.id} starting`)
    session.start()

    io.to(session.id).emit(SessionStarted)
  }
}

/**
 * Pushes the next question to users
 * @param socket Client socket owning the Session
 * @param sessions List of current Sessions
 */
export function pushNextQuestion(
  socket: Socket,
  sessions: Map<string, Session>
): SocketEventHandler<NextQuestionArgs> {
  return (args: NextQuestionArgs) => {
    const session = sessions.get(args.session ?? '')
    if (session == null || session.owner !== socket.id) {
      debug(`could not find session with owner ${socket.id}`)
      return
    }

    if (!session.isStarted) {
      debug(`session ${session.id} is not started, not sending next question`)
      return
    }

    const nextQuestion = session.quiz.advanceToNextQuestion()
    if (nextQuestion == null) {
      debug(`session ${session.id} - quiz has no more questions`)
      return
    }

    debug(`session ${session.id} sending next question`)
    const res: NextQuestionResponse = {
      index: session.quiz.currentQuestionIndex,
      session: session.id,
      question: nextQuestion,
    }

    socket.to(session.id).emit(NextQuestion, res)
  }
}

/**
 * Checks and adds a user's response to a Quiz Question
 * @param io the socket.io server object
 * @param socket Client socket submitting response
 * @param sessions List of current Sessions
 */
export function addQuestionResponse(
  io: Server,
  socket: Socket,
  sessions: Map<string, Session>
): SocketEventHandler<QuestionResponseArgs> {
  return (args: QuestionResponseArgs) => {
    const session = sessions.get(args.session ?? '')
    if (session == null) {
      debug(`could not find session ${args.session} to respond to`)
      socket.emit(QuestionResponseFailed)
      return
    }

    const user = session.findUserByName(args.name ?? '')
    if (user == null || user.id !== socket.id) {
      debug(`could not add response by unknown user`)
      socket.emit(QuestionResponseFailed)
      return
    }

    if (session.quiz.currentQuestion == null) {
      debug(
        `could not respond to session ${session.id} - not started (question null)`
      )
      socket.emit(QuestionResponseFailed)
      return
    }

    if (
      args.index == null ||
      args.index < 0 ||
      args.index >= session.quiz.numQuestions ||
      args.index > session.quiz.currentQuestionIndex
    ) {
      debug(
        `could not respond to session ${session.id} - args.index (${args.index}) out of range`
      )
      socket.emit(QuestionResponseFailed)
      return
    }

    if (args.response == null) {
      debug(`could not respond to session ${session.id} - args.response null`)
      socket.emit(QuestionResponseFailed)
      return
    }

    const question = session.quiz.questionAt(args.index)!
    let isCorrect: boolean

    try {
      isCorrect = question.addResponse(args.response)
    } catch (error) {
      debug(`failed to add response to ${session.id} question ${args.index}`)
      socket.emit(QuestionResponseFailed)
      return
    }

    debug(`successfully added response to ${session.id} question ${args.index}`)

    const firstCorrect = question.firstCorrect ?? ''

    // Send statistics to owner
    const ownerRes: QuestionResponseAddedResponse = {
      index: args.index,
      session: session.id,
      user: user.name,
      isCorrect,
      firstCorrect,
      frequency: question.frequencyOf(args.response),
      relativeFrequency: question.relativeFrequencyOf(args.response),
    }
    io.to(session.owner).emit(QuestionResponseAdded, ownerRes)

    // Send grade to user
    const userRes: QuestionResponseSuccessResponse = {
      index: args.index,
      session: session.id,
      firstCorrect: firstCorrect === user.name,
      isCorrect,
    }
    socket.emit(QuestionResponseSuccess, userRes)
  }
}
