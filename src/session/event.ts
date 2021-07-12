import { Question, QuestionBodyType } from './session'

/**
 * A client is creating a new joinable Session
 */
export const CreateNewSession = 'create session'
export type CreateNewSessionArgs = void

/**
 * The server successfully created a new Session and is responding
 * to the requesting client
 */
export const CreatedSession = 'created session'
export interface CreatedSessionResponse {
  /**
   * The generated id of the session
   */
  id: string
}

/**
 * A client is joining an existing joinable Session
 */
export const JoinSession = 'join session'
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

/**
 * The server successfully added the client to the session
 */
export const JoinSessionSuccess = 'join success'
export type JoinSessionSuccessResponse = void

/**
 * The server could not add the client to the session
 */
export const JoinSessionFailed = 'join failed'
export type JoinSessionFailedResponse = void

/**
 * A user is being removed from a Session by the owner
 */
export const SessionKick = 'kick'
export interface SessionKickArgs {
  /**
   * The name of the user removed
   */
  name: string | undefined
}

/**
 * The server could not remove the user
 */
export const SessionKickSuccess = 'kick success'
export interface SessionKickSuccessResponse {
  name: string
}

/**
 * The server could not remove the user
 */
export const SessionKickFailed = 'kick failed'
export type SessionKickFailedResponse = void

/**
 * Owner is starting session
 */
export const StartSession = 'start session'
export type SessionStartArgs = void

/**
 * A Session has started
 */
export const SessionStarted = 'session started'
export type SessionStartedResponse = void

/**
 * A Session owner has added a question and users are receiving the question
 */
export const QuestionAdded = 'question added'
export interface QuestionAddedResponse {
  question: Question
}

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
export type AddQuestionFailedResponse = void

/**
 * The question was successfully added to the Quiz
 */
export const AddQuestionSuccess = 'add question success'
export type AddQuestionSuccessResponse = void
