import { QuestionSubmission, ResponseType } from 'session/quiz'
import Feedback from 'session/quiz/feedback'

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

export interface SessionStart {
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
  question: Partial<QuestionSubmission>
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
