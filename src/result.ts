export enum Result {
  Success,
  Failure,
}

export interface Success<T> {
  type: Result.Success
  data: T
}
export interface Failure<T> {
  type: Result.Failure
  errors: T[]
}

export type ResultType<T, E> = Success<T> | Failure<E>

/**
 * Unsafely assumes result is Success and extracts data property.
 * @returns result.data
 */
export function unwrap<T>(result: ResultType<T, any>): T {
  return (result as Success<T>).data
}
