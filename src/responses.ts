import {
  CreatedSession,
  JoinSessionFailed,
  JoinSessionSuccess,
  SessionKickSuccess,
  SessionKickFailed,
  SessionStarted,
  SessionEnded,
  SessionEndFailed,
  UserDisconnected,
  EndQuestionFailed,
  QuestionEnded,
  NextQuestionFailed,
  NextQuestion,
  AddQuestionFailed,
  AddQuestionSuccess,
  QuestionResponseFailed,
  QuestionResponseSuccess,
  QuestionResponseAdded,
  SessionStartFailed,
} from 'event'
import { Question } from 'session/quiz'

export class EventResponse {
  readonly event: string
  readonly session: string
  constructor(key: string, session?: string) {
    this.event = key
    this.session = session ?? ''
  }
}

export class CreatedSessionResponse extends EventResponse {
  constructor(session: string) {
    super(CreatedSession, session)
  }
}

export class JoinSessionFailedResponse extends EventResponse {
  constructor(session?: string) {
    super(JoinSessionFailed, session)
  }
}

export class JoinSessionSuccessResponse extends EventResponse {
  constructor(
    session: string,

    /**
     * The name of the user joining
     */
    readonly name: string
  ) {
    super(JoinSessionSuccess, session)
  }
}

export class SessionKickSuccessResponse extends EventResponse {
  constructor(
    session: string,

    /**
     * The user kicked
     */
    readonly name: string
  ) {
    super(SessionKickSuccess, session)
  }
}

export class SessionKickFailedResponse extends EventResponse {
  constructor(session?: string) {
    super(SessionKickFailed, session)
  }
}

export class SessionStartedResponse extends EventResponse {
  constructor(session: string) {
    super(SessionStarted, session)
  }
}

export class SessionStartFailedResponse extends EventResponse {
  constructor(session?: string) {
    super(SessionStartFailed, session)
  }
}

export class SessionEndedResponse extends EventResponse {
  constructor(session: string) {
    super(SessionEnded, session)
  }
}

export class SessionEndFailedResponse extends EventResponse {
  constructor(session?: string) {
    super(SessionEndFailed, session)
  }
}

export class UserDisconnectedResponse extends EventResponse {
  constructor(
    session: string,

    /**
     * The name of user disconnecting
     */
    readonly name: string
  ) {
    super(UserDisconnected, session)
  }
}

export class NextQuestionFailedResponse extends EventResponse {
  readonly numQuestions: number
  readonly currentIndex: number
  constructor(
    session?: string,

    /**
     * The number of questions in the quiz, if applicable
     */
    numQuestions?: number,

    /**
     * The current question index of the quiz, if applicable
     */
    currentIndex?: number
  ) {
    super(NextQuestionFailed, session)
    this.numQuestions = numQuestions ?? -1
    this.currentIndex = currentIndex ?? -1
  }
}

export class NextQuestionResponse extends EventResponse {
  constructor(
    session: string,

    /**
     * The index of the next Question
     */
    readonly index: number,

    /**
     * The next Question
     */
    readonly question: Question
  ) {
    super(NextQuestion, session)
  }
}

// TODO - ? Give useful info for retries
export class AddQuestionFailedResponse extends EventResponse {
  constructor(session?: string) {
    super(AddQuestionFailed, session)
  }
}

export class AddQuestionSuccessResponse extends EventResponse {
  constructor(session: string) {
    super(AddQuestionSuccess, session)
  }
}

export class QuestionResponseFailedResponse extends EventResponse {
  constructor(session?: string) {
    super(QuestionResponseFailed, session)
  }
}

export class QuestionResponseSuccessResponse extends EventResponse {
  constructor(
    session: string,

    /**
     * The index of the question this applies to
     */
    readonly index: number,

    /**
     * True if user is the first correct responder
     */
    readonly firstCorrect: boolean,

    /**
     * True if user Response is correct
     */
    readonly isCorrect: boolean
  ) {
    super(QuestionResponseSuccess, session)
  }
}

export class QuestionResponseAddedResponse extends EventResponse {
  constructor(
    session: string,

    /**
     * The Question index
     */
    readonly index: number,

    /**
     * The user submitting Response
     */
    readonly user: string,

    /**
     * The user's response value
     */
    readonly response: string,

    /**
     * True if the user's Response is correct
     */
    readonly isCorrect: boolean,

    /**
     * Name of the first correct responder
     */
    readonly firstCorrect: string,

    /**
     * The frequency of the user's response
     */
    readonly frequency: number,

    /**
     * The relative frequency of the user's response
     */
    readonly relativeFrequency: number
  ) {
    super(QuestionResponseAdded, session)
  }
}

export class EndQuestionFailedResponse extends EventResponse {
  constructor(session?: string, readonly question?: number) {
    super(EndQuestionFailed, session)
  }
}

export class QuestionEndedResponse extends EventResponse {
  constructor(
    session: string,

    /**
     * The question index
     */
    readonly question: number
  ) {
    super(QuestionEnded, session)
  }
}
