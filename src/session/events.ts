import { Question, QuestionBodyType, ResponseType } from './session'

/**
 * Events between server & client - arguments coming inn
 * from client requests are represented by interfaces ending
 * in "Args." Responses from server to client are
 * represented by interfaces or types ending in "Response."
 *
 */

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
   * The id of the session
   */
  session: string | undefined

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
  /**
   * The session this applies to
   */
  session: string

  /**
   * The user kicked
   */
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
export interface SessionStartArgs {
  /**
   * The session this applies to
   */
  session: string | undefined
}

/**
 * A Session has started
 */
export const SessionStarted = 'session started'
export interface SessionStartedResponse {
  /**
   * The session this applies to
   */
  session: string | undefined
}

/**
 * A Session owner is pushing the next question to users
 */
export const NextQuestion = 'next question'
export interface NextQuestionArgs {
  /**
   * The id of the session this applies to
   */
  session: string | undefined
}
export interface NextQuestionResponse {
  /**
   * The id of the session containing the Question
   */
  session: string

  /**
   * The index of the next Questoin
   */
  index: number

  question: Question
}

/**
 * A Session owner is adding a question
 */
export const AddQuestion = 'add question'
export interface AddQuestionArgs {
  /**
   * The id of the session to add to
   */
  session: string | undefined

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

/**
 * User is responding to a question
 */
export const QuestionResponse = 'question response'
export interface QuestionResponseArgs {
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

/**
 * User failed to add Response
 */
export const QuestionResponseFailed = 'question response failed'
export type QuestionResponseFailedResponse = void

/**
 * User successfully added Response
 */
export const QuestionResponseSuccess = 'question response success'
export interface QuestionResponseSuccessResponse {
  /**
   * The id of the session containing the Question
   */
  session: string

  /**
   * The index of the question this applies to
   */
  index: number

  /**
   * True if user is the first correct responder
   */
  firstCorrect: boolean

  /**
   * True if user Response is correct
   */
  isCorrect: boolean
}

/**
 * Server notifying the Session owner that user submitted a Response
 * successfully
 */
export const QuestionResponseAdded = 'question response added'
export interface QuestionResponseAddedResponse {
  /**
   * The id of the session containing the Question
   */
  session: string

  /**
   * The Question index
   */
  index: number

  /**
   * The user submitting Response
   */
  user: string

  /**
   * True if the user's Response is correct
   */
  isCorrect: boolean

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
