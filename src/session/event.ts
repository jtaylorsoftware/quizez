import { Question, QuestionBodyType } from './session'

/// Events sent from Server to Client ///

/**
 * A client is creating a new joinable Session
 */
export const CreateNew = 'create'
export type CreateNewArgs = never

/**
 * A client is joining an existing joinable Session
 */
export const Join = 'join'
export interface JoinArgs {
  /**
   * The generated id of the session
   */
  id: string | undefined

  /**
   * Client's requested name
   */
  name: string | undefined
}

/**
 * A Session has started
 */
export const SessionStarted = 'session started'
export type SessionStartedArgs = never

/**
 * A Session owner has added a question and users are receiving the question
 */
export const QuestionAdded = 'question added'
export interface QuestionAddedArgs {
  question: Question
}

/// Events sent from Client to Server ///

/**
 * The server successfully created a new Session and is responding
 * to the requesting client
 */
export const Created = 'created'
export interface CreatedArgs {
  /**
   * The generated id of the session
   */
  id: string
}

/**
 * The server successfully added the client to the session
 */
export const JoinSuccess = 'join success'
export type JoinSuccessArgs = never

/**
 * The server could not add the client to the session
 */
export const JoinFailed = 'join failed'
export type JoinFailedArgs = never

/**
 * A Session owner is pushing a question to users
 */
export const AddQuestion = 'add question'
export interface AddQuestionArgs {
  /**
   * The Question text
   */
  text: string | undefined

  /**
   * The Question body
   */
  body: QuestionBodyType | undefined
}

/**
 * The question sent could not be added to the Quiz
 */
export const AddQuestionFailed = 'add question failed'

// TODO - ? Give useful info for retries
export type AddQuestionFailedArgs = never

/**
 * The question was successfully added to the Quiz
 */
export const AddQuestionSuccess = 'add question success'
export type AddQuestionSuccessArgs = never
