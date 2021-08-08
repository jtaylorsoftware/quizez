import { FillIn, MultipleChoice, QuestionData } from './question'

/**
 * Validation error from submitting a question.
 */
export interface QuestionError {
  field: keyof QuestionData | keyof MultipleChoice | keyof FillIn
  value?: any
}
