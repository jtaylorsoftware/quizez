import { QuestionFormat } from 'session/quiz'

export interface MultipleChoiceResponse {
  type: QuestionFormat.MultipleChoiceFormat
  /**
   * The name of the user submitting the response
   */
  submitter: string
  answer: number
}

export interface FillInResponse {
  type: QuestionFormat.FillInFormat
  /**
   * The name of the user submitting the response
   */
  submitter: string
  answer: string
}

export type ResponseType = MultipleChoiceResponse | FillInResponse

export function responseToString(response: ResponseType): string {
  switch (response.type) {
    case QuestionFormat.MultipleChoiceFormat:
      return response.answer.toString()
    case QuestionFormat.FillInFormat:
      return response.answer
    default:
      return ''
  }
}

/**
 * Validates a Response, ensuring it has no missing fields.
 * @param response Response to check for nulls/undefineds
 * @returns true if all fields are defined
 */
export function validateResponse(response?: Partial<ResponseType>): boolean {
  // TODO - Return which field is null
  if (response == null || response.type == null) {
    return false
  }

  return (
    response.type in QuestionFormat &&
    response.answer !== null &&
    response.submitter !== null
  )
}
