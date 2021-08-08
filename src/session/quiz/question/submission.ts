import { Result, ResultType } from 'result'
import { QuestionError } from 'api/error'
import FillInQuestion from './fillin'
import MultipleChoiceQuestion from './multiplechoice'
import Question from './question'
import {
  QuestionBodyType,
  QuestionFormat,
  QuestionSubmission,
  QuestionSubmissionBodyType,
  Seconds,
} from 'api/question'

/**
 * Parses a Question from client submitted data
 * @param text The main text of the Question (what is used by responders to determine answer)
 * @param body The submitted question body for the Question
 * @param timeLimit The time to answer the question
 * @returns Result containing either the Question or validation errors
 */
export function validateSubmission(
  text?: string,
  body?: QuestionSubmissionBodyType,
  timeLimit?: Seconds
): ResultType<QuestionBodyType, QuestionError> {
  const errors: QuestionError[] = []

  if (text == null) {
    errors.push({ field: 'text', value: null })
  }

  if (timeLimit == null) {
    errors.push({ field: 'timeLimit', value: null })
  }

  if (body == null) {
    errors.push({ field: 'body', value: null })
    return {
      type: Result.Failure,
      errors,
    }
  } else if (body.type == null || !(body.type in QuestionFormat)) {
    errors.push({
      field: 'body',
      value: body.type == null ? null : body.type,
    })
    return {
      type: Result.Failure,
      errors,
    }
  }

  return errors.length === 0
    ? {
        type: Result.Success,
        data: body as QuestionBodyType,
      }
    : {
        type: Result.Failure,
        errors,
      }
}

/**
 * Creates a Question from QuestionSubmission data.
 * @param submission The submitted Question data from the client
 * @returns Result containing Question or errors if parsing is not possible
 */
export function fromSubmission(
  submission: QuestionSubmission
): ResultType<Question, QuestionError> {
  const { text, body, timeLimit } = submission
  if (body != null && body.type != null && body.type in QuestionFormat) {
    switch (body.type) {
      case QuestionFormat.MultipleChoiceFormat:
        return MultipleChoiceQuestion.fromMultipleChoiceSubmission(
          text,
          body,
          timeLimit
        )
      case QuestionFormat.FillInFormat:
        return FillInQuestion.fromFillInSubmission(text, body, timeLimit)
    }
  }

  return {
    type: Result.Failure,
    errors: [{ field: 'body', value: body == null ? null : body }],
  }
}
