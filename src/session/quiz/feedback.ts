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

export class Feedback {
  static readonly maxMessageCharacters = 100

  constructor(readonly rating: number, readonly message: string) {}

  /**
   * Validates this Feedback against property constraints
   * @returns failed constraints
   */
  static validate(feedback: Partial<Feedback>): FeedbackError[] {
    const errors: FeedbackError[] = []
    if (feedback.rating == null || !(feedback.rating in Rating)) {
      errors.push({
        field: 'rating',
        value: feedback.rating == null ? null : feedback.rating, // convert undefined (typescript optional value) to null for JSON encoding
      })
    }

    if (
      feedback.message == null ||
      feedback.message.length > Feedback.maxMessageCharacters // message is optional, but must at least be empty string
    ) {
      errors.push({
        field: 'message',
        value: feedback.message == null ? null : feedback.message,
      })
    }
    return errors
  }
}

export default Feedback
