import { Feedback } from 'session/quiz'
import { FillIn, MultipleChoice, QuestionData, ResponseType } from './question'

export type ApiErrorField =
  | keyof QuestionData
  | keyof MultipleChoice
  | keyof FillIn
  | keyof Feedback
  | keyof ResponseType

export type ApiErrorValue = string | number

export type NestedApiErrorValue = {
  index: number
  value: ApiErrorValue | null
  field: string
}

/**
 * Validation error from submitting a question.
 */
export interface ApiError {
  field: ApiErrorField
  value: ApiErrorValue | NestedApiErrorValue | null
}
