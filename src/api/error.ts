export type ApiErrorField = string

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
