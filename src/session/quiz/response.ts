import { MultipleChoiceFormat, FillInFormat } from '.'

export interface MultipleChoiceResponse {
  type: typeof MultipleChoiceFormat
  /**
   * The name of the user submitting the response
   */
  submitter: string
  answer: number
}

export interface FillInResponse {
  type: typeof FillInFormat
  /**
   * The name of the user submitting the response
   */
  submitter: string
  answer: string
}

export type ResponseType = MultipleChoiceResponse | FillInResponse

export function responseToString(response: ResponseType): string {
  switch (response.type) {
    case MultipleChoiceFormat:
      return response.answer.toString()
    case FillInFormat:
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
    (response.type === FillInFormat ||
      response.type === MultipleChoiceFormat) &&
    response.answer !== null &&
    response.submitter !== null
  )
}
