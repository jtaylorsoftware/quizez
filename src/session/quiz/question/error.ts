import { FillIn, MultipleChoice, QuestionData } from './types'

// Validation error
export interface QuestionError {
  field: keyof QuestionData | keyof MultipleChoice | keyof FillIn
  value?: any
}
