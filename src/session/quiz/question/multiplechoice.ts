import { ApiError } from 'api/error'
import {
  MultipleChoice,
  MultipleChoiceAnswer,
  MultipleChoiceSubmission,
  QuestionBodyType,
  QuestionFormat,
  ResponseType,
  Seconds,
} from 'api/question'
import { Result, ResultType } from 'result'
import Question from './question'
import { validateSubmission } from './submission'

export default class MultipleChoiceQuestion extends Question {
  private _answer: number = -1
  private _choices: MultipleChoiceAnswer[] = []

  get choices(): MultipleChoiceAnswer[] {
    return this._choices
  }

  get answer(): number {
    return this._answer
  }

  /**
   * The body of the Question
   */
  get body(): QuestionBodyType {
    return {
      type: QuestionFormat.MultipleChoiceFormat,
      answer: this.answer,
      choices: this.choices,
    }
  }

  /**
   * Parses and validates a MultipleChoiceQuestion from user submitted data that potentially contains
   * missing fields.
   * @param text Main text of the submission
   * @param body Question details (answers, correct answer, points)
   * @param timeLimit How long users have to answer the Question
   * @returns The MultipleChoiceQuestion if parsed successfully, or errors
   */
  static fromMultipleChoiceSubmission(
    text?: string,
    body?: MultipleChoiceSubmission,
    timeLimit?: Seconds
  ): ResultType<MultipleChoiceQuestion, ApiError> {
    const result = validateSubmission(text, body, timeLimit)
    if (result.type === Result.Failure) {
      return result
    }

    let errors = this.validateBody(body!)
    errors = errors.concat(super.validateQuestionText(text!))
    errors = errors.concat(super.validateQuestionTimeLimit(timeLimit!))

    return errors.length === 0
      ? {
          type: Result.Success,
          data: new MultipleChoiceQuestion(
            text!,
            body as MultipleChoice,
            timeLimit!
          ),
        }
      : {
          type: Result.Failure,
          errors,
        }
  }

  private static validateBody(body: MultipleChoiceSubmission): ApiError[] {
    let errors = <ApiError[]>[]
    if (
      body.choices == null ||
      body.choices.length < 2 ||
      body.choices.length > 4
    ) {
      errors.push({
        field: 'choices',
        value: body.choices == null ? null : body.choices.length,
      })
    } else {
      let totalPoints: number | null = 0
      body.choices.forEach((choice, index) => {
        if (choice.text == null || choice.text.length === 0) {
          errors.push({
            field: 'choices',
            value: {
              field: 'text',
              index,
              value: choice.text == null ? null : choice.text,
            },
          })
        }
        if (choice.points == null || choice.points < 0) {
          errors.push({
            field: 'answers',
            value: {
              field: 'points',
              index,
              value: choice.points == null ? null : choice.points,
            },
          })
          totalPoints = null
        } else if (totalPoints !== null) {
          totalPoints += choice.points
        }
      })

      errors = errors.concat(
        super.validateQuestionPoints(<number | null>totalPoints ?? 0)
      )
    }

    if (
      body.answer == null ||
      body.answer < 0 ||
      (body.choices != null && body.answer >= body.choices.length)
    ) {
      errors.push({
        field: 'answer',
        value: body.answer == null ? null : body.answer,
      })
    }

    return errors
  }

  constructor(text: string, body: MultipleChoice, timeLimit: Seconds) {
    super(text, timeLimit)

    this.parseBody(body)
  }

  private parseBody(body: MultipleChoice) {
    let totalPoints: number = 0
    body.choices.forEach((choice, index) => {
      totalPoints = totalPoints + (choice.points ?? -1 * totalPoints) // reset total if any point value is undefined
      this._frequency = this._frequency.set(index.toString(), 0)
    })
    this._choices = [...body.choices]
    this._answer = body.answer
    this._totalPoints = totalPoints
  }

  frequencyOf(response: ResponseType): number {
    if (response.type !== QuestionFormat.MultipleChoiceFormat) {
      return 0
    }

    const answer = response.answer.toString()
    return this._frequency.get(answer)!
  }

  /**
   * Creates a copy of the Question
   * @returns the copy of the Question
   */
  clone(): Question {
    const copy = new MultipleChoiceQuestion(
      this._text,
      this.body as MultipleChoice,
      this._timeLimit
    )
    copy._totalPoints = this.totalPoints
    copy.onTimeout = this.onTimeout
    copy._firstCorrect = this._firstCorrect
    copy._frequency = this._frequency
    copy._responses = this._responses
    copy._hasEnded = this._hasEnded
    copy._isStarted = this._isStarted
    copy._responses = this._responses
    return copy
  }

  protected gradeResponse(response: ResponseType): number {
    if (response.type !== QuestionFormat.MultipleChoiceFormat) {
      return 0
    }

    return response.answer === this.answer
      ? this.choices[this.answer]!.points
      : 0
  }

  protected updateFrequency(response: ResponseType) {
    if (response.type !== QuestionFormat.MultipleChoiceFormat) {
      return
    }

    const answer = response.answer.toString()
    const prev = this._frequency.get(answer)!
    this._frequency = this._frequency.set(answer, prev + 1)
  }
}
