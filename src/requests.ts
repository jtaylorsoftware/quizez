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
  id: string | undefined

  /**
   * Client's requested name
   */
  name: string | undefined
}

export interface SessionKick {
  /**
   * The id of the session
   */
  session: string | undefined

  /**
   * The name of the user removed
   */
  name: string | undefined
}

export interface SessionStart {
  /**
   * The session to start
   */
  session: string | undefined
}

export interface EndSession {
  /**
   * The session to end
   */
  session: string | undefined
}

export interface EndQuestion {
  /**
   * The id of the session
   */
  session: string | undefined

  /**
   * The question index
   */
  question: number | undefined
}

export interface NextQuestion {
  /**
   * The id of the session this applies to
   */
  session: string | undefined
}

export interface AddQuestion {
  /**
   * The id of the session to add to
   */
  session: string | undefined

  /**
   * The Question to add
   */
  question: QuestionSubmission | undefined
}

export interface QuestionResponse {
  /**
   * The id of the session containing the Question
   */
  session: string | undefined

  /**
   * The name of the user responding
   */
  name: string | undefined

  /**
   * The Question index
   */
  index: number | undefined

  /**
   * The user's response
   */
  response: ResponseType | undefined
}

export interface SubmitFeedback {
  /**
   * The id of the session
   */
  session: string | undefined

  /**
   * The name of the user submitting
   */
  name: string | undefined

  /**
   * The index of Question the feedback is for
   */
  question: number | undefined

  /**
   * The feedback
   */
  feedback: Partial<Feedback> | undefined
}
