import * as events from 'event'
import { Question } from 'session/quiz'

/**
 *
 *
 * Responses being sent to clients
 *
 *
 */

/**
 *
 */
export class EventResponse {
  readonly event: string
  readonly session: string
  constructor(key: string, session?: string) {
    this.event = key
    this.session = session ?? ''
  }
}

export class CreateSessionSuccess extends EventResponse {
  constructor(session: string) {
    super(events.CreatedSession, session)
  }
}

export class JoinSessionFailed extends EventResponse {
  constructor(session?: string) {
    super(events.JoinSessionFailed, session)
  }
}

export class JoinSessionSuccess extends EventResponse {
  constructor(
    session: string,

    /**
     * The name of the user joining
     */
    readonly name: string
  ) {
    super(events.JoinSessionSuccess, session)
  }
}

export class SessionKickSuccess extends EventResponse {
  constructor(
    session: string,

    /**
     * The user kicked
     */
    readonly name: string
  ) {
    super(events.SessionKickSuccess, session)
  }
}

export class SessionKickFailed extends EventResponse {
  constructor(session?: string) {
    super(events.SessionKickFailed, session)
  }
}

export class SessionStartedSuccess extends EventResponse {
  constructor(session: string) {
    super(events.SessionStarted, session)
  }
}

export class SessionStartFailed extends EventResponse {
  constructor(session?: string) {
    super(events.SessionStartFailed, session)
  }
}

export class SessionEndedSuccess extends EventResponse {
  constructor(session: string) {
    super(events.SessionEnded, session)
  }
}

export class SessionEndFailed extends EventResponse {
  constructor(session?: string) {
    super(events.SessionEndFailed, session)
  }
}

export class UserDisconnected extends EventResponse {
  constructor(
    session: string,

    /**
     * The name of user disconnecting
     */
    readonly name: string
  ) {
    super(events.UserDisconnected, session)
  }
}

export class NextQuestionFailed extends EventResponse {
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
    super(events.NextQuestionFailed, session)
    this.numQuestions = numQuestions ?? -1
    this.currentIndex = currentIndex ?? -1
  }
}

export class NextQuestion extends EventResponse {
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
    super(events.NextQuestion, session)
  }
}

// TODO - ? Give useful info for retries
export class AddQuestionFailed extends EventResponse {
  constructor(session?: string) {
    super(events.AddQuestionFailed, session)
  }
}

export class AddQuestionSuccess extends EventResponse {
  constructor(session: string) {
    super(events.AddQuestionSuccess, session)
  }
}

export class QuestionResponseFailed extends EventResponse {
  constructor(session?: string) {
    super(events.QuestionResponseFailed, session)
  }
}

export class QuestionResponseSuccess extends EventResponse {
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
    super(events.QuestionResponseSuccess, session)
  }
}

export class QuestionResponseAdded extends EventResponse {
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
    super(events.QuestionResponseAdded, session)
  }
}

export class EndQuestionFailed extends EventResponse {
  constructor(session?: string, readonly question?: number) {
    super(events.EndQuestionFailed, session)
  }
}

export class QuestionEndedSuccess extends EventResponse {
  constructor(
    session: string,

    /**
     * The question index
     */
    readonly question: number
  ) {
    super(events.QuestionEnded, session)
  }
}
