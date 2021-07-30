import { List, Map } from 'immutable'
import {
  FillIn,
  FillInFormat,
  MultipleChoice,
  MultipleChoiceFormat,
  QuestionBodyType,
  ResponseType,
} from './quiz'

/**
 * A varying-type Question, that could be multiple choice or fill-in
 */
export class Question {
  private _responses = Map<string, ResponseType>()
  private _frequency = Map<string, number>()
  private _firstCorrect: string | undefined

  /**
   * The first submitter to answer correctly
   */
  get firstCorrect(): string | undefined {
    return this._firstCorrect
  }

  /**
   * The responses to the Question
   */
  get responses(): List<ResponseType> {
    return this._responses.valueSeq().toList()
  }

  /**
   * The total number of responses
   */
  get numResponses(): number {
    return this._responses.count()
  }

  /**
   * The responses returned as a Map keyed on response value, with
   * Map value equal to its frequency
   */
  get frequency(): Map<string, number> {
    return this._frequency
  }

  /**
   * The frequency of all responses transformed to percentages of total (aka relative frequency)
   */
  get relativeFrequency(): Map<string, number> {
    return this._frequency.map((value) => value / this.numResponses)
  }

  constructor(readonly text: string, readonly body: QuestionBodyType) {
    switch (this.body.type) {
      case MultipleChoiceFormat:
        this.body.choices.forEach((_, index) => {
          this._frequency = this._frequency.set(index.toString(), 0)
        })
        break
      case FillInFormat:
        this._frequency = this._frequency.set(this.body.answer, 0)
        break
    }
  }

  /**
   * Adds a Response if its type is the same as the Question
   * @param response Response to add
   * @returns the grade of the Response (correct or incorrect)
   * @throws Error thrown if user already responded
   */
  addResponse(response: ResponseType): boolean {
    if (this._responses.has(response.submitter)) {
      throw new Error('Already responded')
    }
    this._responses = this._responses.set(response.submitter, response)
    const isCorrect = this.gradeResponse(response)
    if (isCorrect && this._firstCorrect == null) {
      this._firstCorrect = response.submitter
    }
    this.updateFrequency(response)
    return isCorrect
  }

  /**
   * Returns the relative frequency of one Response's answer
   * @param response the Response to lookup
   * @returns The relative frequency of the Response
   */
  relativeFrequencyOf(response: ResponseType): number {
    return this.frequencyOf(response) / this.numResponses
  }

  /**
   * Returns the frequency of one Response's answer
   * @param response The Response to lookup
   * @returns The frequency of the Response
   */
  frequencyOf(response: ResponseType): number {
    switch (response.type) {
      case MultipleChoiceFormat: {
        const answer = response.answer.toString()
        return this._frequency.get(answer)!
      }
      case FillInFormat: {
        const answer = response.answer
        return this._frequency.get(answer) ?? 0
      }
      default:
        return 0
    }
  }

  /**
   * Creates a copy of the Question
   * @returns the copy of the Question
   */
  clone(): Question {
    const copy = new Question(this.text, this.body)
    copy._firstCorrect = this._firstCorrect
    copy._frequency = this._frequency
    copy._responses = this._responses
    return copy
  }

  private updateFrequency(response: ResponseType) {
    switch (response.type) {
      case MultipleChoiceFormat:
        {
          const answer = response.answer.toString()
          const prev = this._frequency.get(answer)!
          this._frequency = this._frequency.set(answer, prev + 1)
        }
        break
      case FillInFormat:
        {
          const answer = response.answer
          const prev = this._frequency.get(answer) ?? 0
          this._frequency = this._frequency.set(answer, prev + 1)
        }
        break
    }
  }

  private gradeResponse(response: ResponseType): boolean {
    if (this.body.type !== response.type) {
      return false
    }

    switch (response.type) {
      case MultipleChoiceFormat:
        const mcQuestion = this.body as MultipleChoice
        return response.answer === mcQuestion.answer
      case FillInFormat:
        const fillInQuestion = this.body as FillIn
        return response.answer === fillInQuestion.answer
    }
  }

  static validateQuestion(question: Partial<Question>): boolean {
    if (question.body == null || question.body.type == null) {
      return false
    }
    if (question.text == null || question.text.length === 0) {
      return false
    }
    switch (question.body.type) {
      case MultipleChoiceFormat:
        return this.validateMultipleChoiceQuestion(question.body)
      case FillInFormat:
        return this.validateFillInQuestion(question.body)
      default:
        return false
    }
  }

  private static validateMultipleChoiceQuestion(
    question: MultipleChoice
  ): boolean {
    if (
      question.choices == null ||
      question.choices.length < 2 ||
      question.choices.length > 4
    ) {
      return false
    }

    for (const choice of question.choices) {
      if (choice.text == null || choice.text.length === 0) {
        return false
      }
    }

    if (question.answer < 0 || question.answer >= question.choices.length) {
      return false
    }

    return true
  }

  private static validateFillInQuestion(question: FillIn): boolean {
    return question.answer != null && question.answer.length !== 0
  }
}

export default Question
