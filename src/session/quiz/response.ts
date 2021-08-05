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
