import { Feedback } from 'session/quiz'
import { FillIn, MultipleChoice, QuestionData } from './question'

/**
 * Validation error from submitting a question.
 */
export interface ApiError {
  field:
    | keyof QuestionData
    | keyof MultipleChoice
    | keyof FillIn
    | keyof Feedback
  value?: any
}
