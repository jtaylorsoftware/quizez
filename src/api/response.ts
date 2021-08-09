import { ApiError } from './error'
import SessionEvent from './event'
import { Feedback } from './feedback'
import { QuestionData } from './question'

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
export abstract class EventResponse {
  static event: SessionEvent = SessionEvent.Unused
  session: string

  constructor(session: string) {
    this.session = session
  }
}

export class CreateSessionSuccess extends EventResponse {
  static override event: SessionEvent = SessionEvent.CreatedSession

  constructor(session: string) {
    super(session)
  }
}

export class JoinSessionFailed extends EventResponse {
  static override event: SessionEvent = SessionEvent.JoinSessionFailed

  constructor(
    session: string = '',
    /**
     * The name used to join
     */
    readonly name: string | null = null
  ) {
    super(session)
  }
}

export class JoinSessionSuccess extends EventResponse {
  static override event: SessionEvent = SessionEvent.JoinSessionSuccess

  constructor(
    session: string,

    /**
     * The name of the user joining
     */
    readonly name: string
  ) {
    super(session)
  }
}

export class SessionKickSuccess extends EventResponse {
  static override event: SessionEvent = SessionEvent.SessionKickSuccess

  constructor(
    session: string,

    /**
     * The user kicked
     */
    readonly name: string
  ) {
    super(session)
  }
}

export class SessionKickFailed extends EventResponse {
  static override event: SessionEvent = SessionEvent.SessionKickFailed

  constructor(
    session: string = '',

    /**
     * The name used to attempt kick
     */
    readonly name: string | null = null
  ) {
    super(session)
  }
}

export class SessionStartedSuccess extends EventResponse {
  static override event: SessionEvent = SessionEvent.SessionStarted

  constructor(session: string) {
    super(session)
  }
}

export class SessionStartFailed extends EventResponse {
  static override event: SessionEvent = SessionEvent.SessionStartFailed

  constructor(session: string = '') {
    super(session)
  }
}

export class SessionEndedSuccess extends EventResponse {
  static override event: SessionEvent = SessionEvent.SessionEnded

  constructor(session: string) {
    super(session)
  }
}

export class SessionEndFailed extends EventResponse {
  static override event: SessionEvent = SessionEvent.SessionEndFailed

  constructor(session: string = '') {
    super(session)
  }
}

export class UserDisconnected extends EventResponse {
  static override event: SessionEvent = SessionEvent.UserDisconnected

  constructor(
    session: string,

    /**
     * The name of user disconnecting
     */
    readonly name: string
  ) {
    super(session)
  }
}

export class NextQuestionFailed extends EventResponse {
  static override event: SessionEvent = SessionEvent.NextQuestionFailed

  constructor(
    session: string = '',
    /**
     * The number of questions in the quiz, if applicable
     */
    readonly numQuestions: number = -1,
    /**
     * The current question index of the quiz, if applicable
     */
    readonly currentIndex: number = -1
  ) {
    super(session)
  }
}

export class NextQuestion extends EventResponse {
  static override event: SessionEvent = SessionEvent.NextQuestion

  constructor(
    session: string,

    /**
     * The index of the next Question
     */
    readonly index: number,

    readonly question: QuestionData
  ) {
    super(session)
  }
}

// TODO - ? Give useful info for retries
export class AddQuestionFailed extends EventResponse {
  static override event: SessionEvent = SessionEvent.AddQuestionFailed

  constructor(
    session: string = '',

    /**
     * The errors from submitting and parsing the Question
     */
    readonly errors: ApiError[] | null = null
  ) {
    super(session)
  }
}

export class AddQuestionSuccess extends EventResponse {
  static override event: SessionEvent = SessionEvent.AddQuestionSuccess

  constructor(session: string) {
    super(session)
  }
}

export class QuestionResponseFailed extends EventResponse {
  static override event: SessionEvent = SessionEvent.QuestionResponseFailed

  constructor(
    session: string = '',

    /**
     * The errors from submitting and parsing the Response
     */
    readonly errors: ApiError[] | null = null
  ) {
    super(session)
  }
}

export class QuestionResponseSuccess extends EventResponse {
  static override event: SessionEvent = SessionEvent.QuestionResponseSuccess

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
     * The number of points earned for the answer (a score of 0 means incorrect)
     */
    readonly points: number
  ) {
    super(session)
  }
}

export class QuestionResponseAdded extends EventResponse {
  static override event: SessionEvent = SessionEvent.QuestionResponseAdded

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
     * The number of points earned for the answer (a score of 0 means incorrect)
     */
    readonly points: number,

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
    super(session)
  }
}

export class EndQuestionFailed extends EventResponse {
  static override event: SessionEvent = SessionEvent.EndQuestionFailed

  constructor(
    session: string = '',
    /**
     * Index of the Question that could not end
     */
    readonly question: number | null = null
  ) {
    super(session)
  }
}

export class QuestionEndedSuccess extends EventResponse {
  static override event: SessionEvent = SessionEvent.QuestionEnded

  constructor(
    session: string,

    /**
     * The question index
     */
    readonly question: number
  ) {
    super(session)
  }
}

export class SubmitFeedbackSuccess extends EventResponse {
  static override event: SessionEvent = SessionEvent.SubmitFeedbackSuccess

  constructor(session: string) {
    super(session)
  }
}

export class SubmitFeedbackFailed extends EventResponse {
  static override event: SessionEvent = SessionEvent.SubmitFeedbackFailed

  constructor(
    session: string = '',

    /**
     * The errors from submitting and parsing the Feedback
     */
    readonly errors: ApiError[] | null = null
  ) {
    super(session)
  }
}

export class FeedbackSubmitted extends EventResponse {
  static override event: SessionEvent = SessionEvent.FeedbackSubmitted

  constructor(
    session: string,

    /**
     * The name of user submitting feedback
     */
    readonly user: string,

    /**
     * The index of the question the feedback is for
     */
    readonly question: number,

    /**
     * The user's feedback
     */
    readonly feedback: Feedback
  ) {
    super(session)
  }
}

export class SendHintFailed extends EventResponse {
  static override event: SessionEvent = SessionEvent.SendHintFailed

  constructor(
    session: string = '',
    /**
     * The errors from submitting and parsing the Hint
     */
    readonly errors: ApiError[] | null = null
  ) {
    super(session)
  }
}

export class SendHintSuccess extends EventResponse {
  static override event: SessionEvent = SessionEvent.SendHintSuccess

  constructor(session: string) {
    super(session)
  }
}

export class HintReceived extends EventResponse {
  static override event: SessionEvent = SessionEvent.HintReceived

  constructor(
    session: string,

    /**
     * The index of question the hint is for
     */
    readonly question: number,

    /**
     * The hint message
     */
    readonly hint: string
  ) {
    super(session)
  }
}
