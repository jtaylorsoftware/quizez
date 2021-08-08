import { QuestionError } from 'api/error'
import {
  FillIn,
  FillInAnswer,
  FillInSubmission,
  QuestionBodyType,
  QuestionFormat,
  ResponseType,
  Seconds,
} from 'api/question'
import { Map } from 'immutable'
import { Result, ResultType } from 'result'
import Question from './question'
import { validateSubmission } from './submission'

export default class FillInQuestion extends Question {
  private _answers = Map<string, FillInAnswer>()

  get answers(): Map<string, FillInAnswer> {
    return this._answers
  }

  get body(): QuestionBodyType {
    return {
      answers: Array.from(this.answers.values()),
    }
  }

  /**
   * Parses and validates a FillInQuestion from user submitted data that potentially contains
   * missing fields.
   * @param text Main text of the submission
   * @param body Question details (answers, correct answer, points)
   * @param timeLimit How long users have to answer the Question
   * @returns The FillInQuestion if parsed successfully, or errors
   */
  static fromFillInSubmission(
    text?: string,
    body?: FillInSubmission,
    timeLimit?: Seconds
  ): ResultType<FillInQuestion, QuestionError> {
    const result = validateSubmission(text, body, timeLimit)
    if (result.type === Result.Failure) {
      return result
    }

    let errors = this.validateBody(body!)
    errors = errors.concat(super.validateQuestionText(text!))
    errors = errors.concat(super.validateQuestionTimeLimit(timeLimit!))

    if (errors.length === 0) {
      const question = new FillInQuestion(text!, { answers: [] }, timeLimit!)
      this.parseBody(body!, question)

      return {
        type: Result.Success,
        data: question,
      }
    }

    return {
      type: Result.Failure,
      errors,
    }
  }

  private static validateBody(body: FillInSubmission): QuestionError[] {
    let errors = <QuestionError[]>[]
    const answers = body.answers
    if (
      answers == null ||
      answers.length < this.minFillInChoices ||
      answers.length > this.maxFillInChoices
    ) {
      errors.push({
        field: 'answers',
        value: answers == null ? null : answers,
      })
    } else {
      let totalPoints: number | null = 0
      answers.forEach((answer, index) => {
        if (answer.text == null || answer.text.length === 0) {
          errors.push({
            field: 'answers',
            value: {
              field: 'text',
              index,
              value: answer.text == null ? null : answer.text,
            },
          })
        }
        if (answer.points == null || answer.points < 0) {
          errors.push({
            field: 'answers',
            value: {
              field: 'points',
              index,
              value: answer.points == null ? null : answer.points,
            },
          })
          totalPoints = 0
        } else if (totalPoints !== null) {
          totalPoints += answer.points
        }
      })

      errors = errors.concat(
        super.validateQuestionPoints(<number | null>totalPoints ?? 0)
      )
    }

    return errors
  }

  constructor(text: string, body: FillIn, timeLimit: Seconds) {
    super(text, timeLimit)
    this._answers = Map<string, FillInAnswer>()
    body.answers.forEach((answer) => {
      this._answers = this._answers.set(answer.text.toLowerCase(), answer)
    })
  }

  private static parseBody(
    body: FillInSubmission,
    outQuestion: FillInQuestion
  ) {
    let actualTotalPoints: number = 0
    const answers = body.answers!
    answers.forEach((answer, _) => {
      actualTotalPoints =
        actualTotalPoints + (answer.points ?? -1 * actualTotalPoints)
      outQuestion._answers = outQuestion._answers.set(
        answer.text!.toLowerCase(),
        {
          text: answer.text!,
          points: answer.points!,
        }
      )
      // populate a mapping of answer text to answer
      outQuestion._frequency = outQuestion._frequency.set(
        answer.text!.toLowerCase(),
        0
      )
    })
    outQuestion._totalPoints = actualTotalPoints
  }

  frequencyOf(response: ResponseType): number {
    if (response.type !== QuestionFormat.FillInFormat) {
      return 0
    }

    const answer = response.answer.toLowerCase()
    return this._frequency.get(answer) ?? 0
  }

  clone(): Question {
    const copy = new FillInQuestion(
      this._text,
      this.body as FillIn,
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
    if (response.type !== QuestionFormat.FillInFormat) {
      return 0
    }

    const answer = this._answers.get(response.answer.toLowerCase())
    return answer != null ? answer.points : 0
  }

  protected updateFrequency(response: ResponseType) {
    if (response.type !== QuestionFormat.FillInFormat) {
      return
    }

    const answer = <string>response.answer
    const prev = this._frequency.get(answer) ?? 0
    this._frequency = this._frequency.set(answer, prev + 1)
  }
}
