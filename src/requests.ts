import { QuestionSubmission, ResponseType } from 'session/quiz'

export interface CreateNewSessionArgs {}

export interface JoinSessionArgs {
  /**
   * The generated id of the session
   */
  id: string | undefined

  /**
   * Client's requested name
   */
  name: string | undefined
}

export interface SessionKickArgs {
  /**
   * The id of the session
   */
  session: string | undefined

  /**
   * The name of the user removed
   */
  name: string | undefined
}

export interface SessionStartArgs {
  /**
   * The session to start
   */
  session: string | undefined
}

export interface EndSessionArgs {
  /**
   * The session to end
   */
  session: string | undefined
}

export interface EndQuestionArgs {
  /**
   * The id of the session
   */
  session: string | undefined

  /**
   * The question index
   */
  question: number | undefined
}

export interface NextQuestionArgs {
  /**
   * The id of the session this applies to
   */
  session: string | undefined
}

export interface AddQuestionArgs {
  /**
   * The id of the session to add to
   */
  session: string | undefined

  /**
   * The Question to add
   */
  question: QuestionSubmission | undefined
}

export class QuestionResponseArgs {
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
