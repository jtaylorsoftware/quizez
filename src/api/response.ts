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
 * Acknowledgement callback for client emits
 */
export type EventCallback = (response: EventResponse) => void

export enum ResponseStatus {
  Failure = 400,
  Success = 200,
}

/**
 * Acknowledgement callback argument type
 */
export type EventResponse = FailureResponse | SuccessResponse

/**
 * The emit failed with errors.
 */
export interface FailureResponse {
  status: ResponseStatus.Failure
  event: SessionEvent
  session: string | null
  errors: ApiError[] | null
}

/**
 * The emit succeeded potentially with return data.
 */
export type SuccessResponse =
  | CreateSessionSuccess
  | JoinSessionSuccess
  | UserJoinedSession
  | SessionKickSuccess
  | UserKicked
  | SessionStartSuccess
  | SessionStarted
  | SessionEndSuccess
  | SessionEnded
  | UserDisconnected
  | NextQuestionSuccess
  | NextQuestion
  | AddQuestionSuccess
  | QuestionResponseSuccess
  | QuestionResponseAdded
  | EndQuestionSuccess
  | QuestionEnded
  | SubmitFeedbackSuccess
  | FeedbackSubmitted
  | SendHintSuccess
  | HintReceived

export interface CreateSessionSuccess {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.CreatedSession
  data: string
}

export interface JoinSessionSuccess {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.JoinSession
  data: null
}

export interface UserJoinedSession {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.UserJoinedSession
  data: {
    name: string
  }
}

export interface SessionKickSuccess {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.SessionKick
  data: {
    name: string
  }
}

export interface UserKicked {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.UserKicked
  data: {
    name: string
  }
}

export interface SessionStartSuccess {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.StartSession
  data: null
}

export interface SessionStarted {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.SessionStarted
  data: null
}

export interface SessionEndSuccess {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.EndSession
  data: null
}

export interface SessionEnded {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.SessionEnded
  data: null
}

export interface UserDisconnected {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.UserDisconnected
  data: {
    name: string
  }
}

export interface NextQuestionSuccess {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.NextQuestion
  data: null
}

export interface NextQuestion {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.NextQuestion
  data: {
    index: number
    question: QuestionData
  }
}

export interface AddQuestionSuccess {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.AddQuestion
  data: null
}

export interface QuestionResponseSuccess {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.QuestionResponse
  data: {
    /**
     * Question index responded to
     */
    index: number
    /**
     * True if this user was first to answer correctly
     */
    firstCorrect: boolean
    /**
     * Points earned for response
     */
    points: number
  }
}

export interface QuestionResponseAdded {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.QuestionResponseAdded
  data: {
    /**
     * The Question index
     */
    index: number

    /**
     * The user submitting Response
     */
    user: string

    /**
     * The user's response value
     */
    response: string

    /**
     * The number of points earned for the answer (a score of 0 means incorrect)
     */
    points: number

    /**
     * Name of the first correct responder
     */
    firstCorrect: string

    /**
     * The frequency of the user's response
     */
    frequency: number

    /**
     * The relative frequency of the user's response
     */
    relativeFrequency: number
  }
}

export interface EndQuestionSuccess {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.EndQuestion
  data: null
}

export interface QuestionEnded {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.QuestionEnded
  data: {
    question: number
  }
}

export interface SubmitFeedbackSuccess {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.SubmitFeedback
  data: null
}

export interface FeedbackSubmitted {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.FeedbackSubmitted
  data: {
    /**
     * The name of user submitting feedback
     */
    user: string

    /**
     * The index of the question the feedback is for
     */
    question: number

    /**
     * The user's feedback
     */
    feedback: Feedback
  }
}

export interface SendHintSuccess {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.SendHint
  data: null
}

export interface HintReceived {
  status: ResponseStatus.Success
  session: string
  event: SessionEvent.HintReceived
  data: {
    /**
     * The index of question the hint is for
     */
    question: number

    /**
     * The hint message
     */
    hint: string
  }
}
