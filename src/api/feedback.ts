export enum Rating {
  Impossible,
  Hard,
  Okay,
  Simple,
  Easy,
}

export interface Feedback {
  rating: number
  message: string
}
