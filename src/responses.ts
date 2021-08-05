import SessionEvent from 'event'
import { Question, QuestionData } from 'session/quiz'

/**
 *
 *
 * Responses being sent to clients
 *
 *
 */

/**
 * A response to an event that was received from a client socket
 */
export interface EventResponse {
  get event(): SessionEvent
  session: string
}

export class CreateSessionSuccess implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.CreatedSession
  }

  constructor(readonly session: string) {}
}

export class JoinSessionFailed implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.JoinSessionFailed
  }

  constructor(readonly session: string = '') {}
}

export class JoinSessionSuccess implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.JoinSessionSuccess
  }

  constructor(
    readonly session: string,

    /**
     * The name of the user joining
     */
    readonly name: string
  ) {}
}

export class SessionKickSuccess implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.SessionKickSuccess
  }

  constructor(
    readonly session: string,

    /**
     * The user kicked
     */
    readonly name: string
  ) {}
}

export class SessionKickFailed implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.SessionKickFailed
  }

  constructor(readonly session: string = '') {}
}

export class SessionStartedSuccess implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.SessionStarted
  }

  constructor(readonly session: string) {}
}

export class SessionStartFailed implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.SessionStartFailed
  }

  constructor(readonly session: string = '') {}
}

export class SessionEndedSuccess implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.SessionEnded
  }

  constructor(readonly session: string) {}
}

export class SessionEndFailed implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.SessionEndFailed
  }

  constructor(readonly session: string = '') {}
}

export class UserDisconnected implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.UserDisconnected
  }

  constructor(
    readonly session: string,

    /**
     * The name of user disconnecting
     */
    readonly name: string
  ) {}
}

export class NextQuestionFailed implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.NextQuestionFailed
  }

  constructor(
    readonly session: string = '',
    /**
     * The number of questions in the quiz, if applicable
     */
    readonly numQuestions: number = -1,
    /**
     * The current question index of the quiz, if applicable
     */
    readonly currentIndex: number = -1
  ) {}
}

export class NextQuestion implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.NextQuestion
  }

  readonly question: QuestionData
  constructor(
    readonly session: string,

    /**
     * The index of the next Question
     */
    readonly index: number,

    question: Question
  ) {
    this.question = question.data
  }
}

// TODO - ? Give useful info for retries
export class AddQuestionFailed implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.AddQuestionFailed
  }

  constructor(readonly session: string = '') {}
}

export class AddQuestionSuccess implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.AddQuestionSuccess
  }

  constructor(readonly session: string) {}
}

export class QuestionResponseFailed implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.QuestionResponseFailed
  }

  constructor(readonly session: string = '') {}
}

export class QuestionResponseSuccess implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.QuestionResponseSuccess
  }

  constructor(
    readonly session: string,

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
  ) {}
}

export class QuestionResponseAdded implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.QuestionResponseAdded
  }

  constructor(
    readonly session: string,

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
  ) {}
}

export class EndQuestionFailed implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.EndQuestionFailed
  }

  constructor(readonly session: string = '', readonly question?: number) {}
}

export class QuestionEndedSuccess implements EventResponse {
  get event(): SessionEvent {
    return SessionEvent.QuestionEnded
  }

  constructor(
    readonly session: string,

    /**
     * The question index
     */
    readonly question: number
  ) {}
}
