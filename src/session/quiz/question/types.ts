/** Question body formats, which dictate how to parse Questions */
export enum QuestionFormat {
  MultipleChoiceFormat,
  FillInFormat,
}

export default QuestionFormat

export type Seconds = number

/**
 * Question data expected to be received by clients
 */
export interface QuestionData {
  text: string
  body: QuestionBodyType
  totalPoints: number
  timeLimit: Seconds
}

// Concrete body types and the types of their answers
export interface MultipleChoice {
  choices: MultipleChoiceAnswer[]
  answer: number
}

export interface MultipleChoiceAnswer {
  text: string
  points: number
}

export interface FillIn {
  /**
   * Answer map keyed on answer text
   */
  answers: FillInAnswer[]
}

export interface FillInAnswer {
  text: string
  points: number
}

/**
 * Type used once Question submission is validated
 */
export type QuestionBodyType = MultipleChoice | FillIn
