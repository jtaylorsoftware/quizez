export enum Rating {
  Impossible,
  Hard,
  Okay,
  Simple,
  Easy,
}

export interface FeedbackError {
  field: keyof Feedback
  value?: any
}

export interface Feedback {
  rating: number
  message: string
}
