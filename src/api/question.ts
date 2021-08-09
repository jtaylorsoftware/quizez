/**
 * Question body formats, which dictate how to parse Questions
 */
export enum QuestionFormat {
  MultipleChoiceFormat,
  FillInFormat,
}

export type Seconds = number

/**
 * Question data to submit to server
 */
export interface QuestionSubmission {
  text?: string
  timeLimit?: number
  body?: QuestionSubmissionBodyType
}

/**
 * Submission for a multiple choice question body
 */
export interface MultipleChoiceSubmission {
  type?: QuestionFormat.MultipleChoiceFormat
  choices?: MultipleChoiceSubmisisonAnswer[]
  answer?: number
}

export type MultipleChoiceSubmisisonAnswer = Partial<MultipleChoiceAnswer>

/**
 * Submission for a fillin question body
 */
export interface FillInSubmission {
  type?: QuestionFormat.FillInFormat
  /**
   * Array of answers submitted by client
   */
  answers?: FillInSubmissionAnswer[]
}
export type FillInSubmissionAnswer = Partial<FillInAnswer>

/**
 * Question body data submitted from client
 */
export type QuestionSubmissionBodyType =
  | MultipleChoiceSubmission
  | FillInSubmission

/**
 * Question data expected to be received by clients
 */
export interface QuestionData {
  text: string
  body: QuestionBodyType
  totalPoints: number
  timeLimit: Seconds
}

/**
 * Data for a multiple choice question.
 */
export interface MultipleChoiceQuestion extends QuestionData {
  body: MultipleChoice
}

/**
 * Data for a fillin question.
 */
export interface FillInQuestion extends QuestionData {
  body: FillIn
}

/**
 * Body of a multiple choice question
 */
export interface MultipleChoice {
  type: QuestionFormat.MultipleChoiceFormat
  choices: MultipleChoiceAnswer[]
  answer: number
}

/**
 * A single answer to (choice) for a multiple choice question
 */
export interface MultipleChoiceAnswer {
  text: string
  points: number
}

/**
 * Body for a fill-in-the-blank question
 */
export interface FillIn {
  type: QuestionFormat.FillInFormat

  /**
   * Answer map keyed on answer text
   */
  answers: FillInAnswer[]
}

/**
 * A single possible answer to a fill-in-the-blank question.
 */
export interface FillInAnswer {
  text: string
  points: number
}

/**
 * Type used once Question submission is validated
 */
export type QuestionBodyType = MultipleChoice | FillIn

/**
 * A user's response to a multiple choice question.
 */
export interface MultipleChoiceResponse {
  type: QuestionFormat.MultipleChoiceFormat
  /**
   * The name of the user submitting the response
   */
  submitter: string
  /**
   * Choice index chosen
   */
  answer: number
}

/**
 * A user's response to a fill-in question.
 */
export interface FillInResponse {
  type: QuestionFormat.FillInFormat
  /**
   * The name of the user submitting the response
   */
  submitter: string
  /**
   * Text that user input
   */
  answer: string
}

export type ResponseType = MultipleChoiceResponse | FillInResponse
