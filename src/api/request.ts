import { QuestionSubmission, ResponseType } from './question'
import Feedback from 'session/quiz/question/feedback'

/**
 *
 *
 * Request arguments coming from clients.
 *
 *
 */

/**
 *
 */
export interface CreateNewSession {}

export interface JoinSession {
  /**
   * The generated id of the session
   */
  id: string

  /**
   * Client's requested name
   */
  name: string
}

export interface SessionKick {
  /**
   * The id of the session
   */
  session: string

  /**
   * The name of the user removed
   */
  name: string
}

export interface StartSession {
  /**
   * The session to start
   */
  session: string
}

export interface EndSession {
  /**
   * The session to end
   */
  session: string
}

export interface EndQuestion {
  /**
   * The id of the session
   */
  session: string

  /**
   * The question index
   */
  question: number
}

export interface NextQuestion {
  /**
   * The id of the session this applies to
   */
  session: string
}

export interface AddQuestion {
  /**
   * The id of the session to add to
   */
  session: string

  /**
   * The Question to add
   */
  question: QuestionSubmission
}

export interface EditQuestion {
  /**
   * The id of the session to add to
   */
  session: string

  /**
   * The index of the question being edited
   */
  index: number

  /**
   * The Question to add
   */
  question: QuestionSubmission
}

export interface RemoveQuestion {
  /**
   * The id of the session to add to
   */
  session: string

  /**
   * The index of the Question to remove
   */
  index: number
}

export interface QuestionResponse {
  /**
   * The id of the session containing the Question
   */
  session: string

  /**
   * The name of the user responding
   */
  name: string

  /**
   * The Question index
   */
  index: number

  /**
   * The user's response
   */
  response: Partial<ResponseType>
}

export interface SubmitFeedback {
  /**
   * The id of the session
   */
  session: string

  /**
   * The name of the user submitting
   */
  name: string

  /**
   * The index of Question the feedback is for
   */
  question: number

  /**
   * The feedback
   */
  feedback: Partial<Feedback>
}

export interface SendHint {
  /**
   * Id of the session
   */
  session: string

  /**
   * The question index the hint is for
   */
  question: number

  /**
   * The hint message for the question.
   */
  hint: string
}
