import { List, Map } from 'immutable'
import { ResponseType } from '.'
import Feedback from './feedback'

// Question body formats, which dictate how to parse Questions

export enum QuestionFormat {
  MultipleChoiceFormat,
  FillInFormat,
}

// ---

// Type for Questions received through requests
export interface QuestionSubmission {
  text: string
  body: QuestionBodyType
}

// Concrete body types and the types of their answers
export interface MultipleChoice {
  type: QuestionFormat.MultipleChoiceFormat
  choices: MultipleChoiceAnswer[]
  answer: number
}

export interface MultipleChoiceAnswer {
  text: string
}

export interface FillIn {
  type: QuestionFormat.FillInFormat
  answer: FillInAnswer
}

export type FillInAnswer = string

export type QuestionBodyType = MultipleChoice | FillIn
// ---

type Seconds = number

/**
 * Question data expected to be received by clients
 */
export interface QuestionData {
  text: string
  body: QuestionBodyType
  timeLimit: Seconds
}

/**
 * A varying-type Question, that could be multiple choice or fill-in
 */
export class Question {
  /**
   * The index of this Question in its Quiz
   */
  public index: number = -1 // unassigned

  private _feedback = Map<string, Feedback>() // keyed on username
  private _responses = Map<string, ResponseType>() // keyed on username
  private _frequency = Map<string, number>() // keyed on stringified response data
  private _firstCorrect: string | undefined
  private _isStarted: boolean = false
  private _hasEnded: boolean = false

  private timeout!: NodeJS.Timeout

  static readonly minTimeLimit: Seconds = 60
  static readonly maxTimeLimit: Seconds = 300

  /**
   * Returns the data to transmit for this Question
   */
  get data(): QuestionData {
    return {
      text: this.text,
      body: this.body,
      timeLimit: this.timeLimit,
    }
  }

  /**
   * True if the Question has started (been sent to users), so it will accept responses
   */
  get isStarted(): boolean {
    return this._isStarted
  }

  /**
   * True if the Question has ended, in which case it won't accept responses
   */
  get hasEnded(): boolean {
    return this._hasEnded
  }

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

  /**
   * The feedback submitted to the Question
   */
  get feedback(): Map<string, Feedback> {
    return this._feedback
  }

  /**
   * Creates a Question
   * @param text The main text of the Question (what is used by responders to determine answer)
   * @param body The answer type and answer choices for the question
   * @param timeLimit The time to answer the question
   * @param onTimeout Optional callback function when question has timed out
   */
  constructor(
    readonly text: string,
    readonly body: QuestionBodyType,
    readonly timeLimit: Seconds = Question.minTimeLimit,
    private readonly onTimeout?: Function
  ) {
    switch (this.body.type) {
      case QuestionFormat.MultipleChoiceFormat:
        this.body.choices.forEach((_, index) => {
          this._frequency = this._frequency.set(index.toString(), 0)
        })
        break
      case QuestionFormat.FillInFormat:
        this._frequency = this._frequency.set(this.body.answer, 0)
        break
    }
  }

  /**
   * Opens the question to responses
   */
  start() {
    this._isStarted = true

    const SEC_TO_MS = 1000
    this.timeout = setTimeout(() => {
      this.end()

      if (this.onTimeout != null) {
        this.onTimeout()
      }
    }, this.timeLimit * SEC_TO_MS)
  }

  /**
   * Closes off responses
   */
  end() {
    if (this._isStarted) {
      this._hasEnded = true
      clearTimeout(this.timeout)
    }
  }

  /**
   * Adds a Response if its type is the same as the Question
   * @param response Response to add
   * @returns the grade of the Response (correct or incorrect)
   * @throws Error thrown if user already responded or if the question has ended or has not started
   */
  addResponse(response: ResponseType): boolean {
    if (!this._isStarted) {
      throw new Error('Question has not started')
    }
    if (this._hasEnded) {
      throw new Error('Question has ended')
    }
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
   * Adds user submitted Feedback to this Question
   * @param user person submitting Feedback
   * @param feedback the user's Feedback
   * @returns true if successfully submitted, false if duplicate
   */
  addFeedback(user: string, feedback: Feedback): boolean {
    if (this._feedback.has(user)) {
      return false
    }
    this._feedback = this._feedback.set(user, feedback)
    return true
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
      case QuestionFormat.MultipleChoiceFormat: {
        const answer = response.answer.toString()
        return this._frequency.get(answer)!
      }
      case QuestionFormat.FillInFormat: {
        const answer = <string>response.answer
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
      case QuestionFormat.MultipleChoiceFormat:
        {
          const answer = response.answer.toString()
          const prev = this._frequency.get(answer)!
          this._frequency = this._frequency.set(answer, prev + 1)
        }
        break
      case QuestionFormat.FillInFormat:
        {
          const answer = <string>response.answer
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
      case QuestionFormat.MultipleChoiceFormat:
        const mcQuestion = this.body as MultipleChoice
        return response.answer === mcQuestion.answer
      case QuestionFormat.FillInFormat:
        const fillInQuestion = this.body as FillIn
        return response.answer === fillInQuestion.answer
    }
  }

  static validate(question: Partial<Question>): QuestionError[] {
    const errors: QuestionError[] = []

    if (question.text == null || question.text.length === 0) {
      errors.push({
        field: 'text',
        value:
          question.text == null
            ? null
            : question.text /** convert undefined to null (or value) */,
      })
    }
    if (
      question.timeLimit == null ||
      question.timeLimit < Question.minTimeLimit ||
      question.timeLimit > Question.maxTimeLimit
    ) {
      errors.push({
        field: 'timeLimit',
        value: question.timeLimit == null ? null : question.timeLimit,
      })
    }

    if (question.body == null || question.body.type == null) {
      errors.push({ field: 'body', value: null })
    } else {
      if (!(question.body.type in QuestionFormat)) {
        errors.push({ field: 'body', value: question.body.type })
      } else {
        switch (question.body.type) {
          case QuestionFormat.MultipleChoiceFormat:
            errors.concat(this.validateMultipleChoiceQuestion(question.body))
            break
          case QuestionFormat.FillInFormat:
            errors.concat(this.validateFillInQuestion(question.body))
            break
        }
      }
    }

    return errors
  }

  private static validateMultipleChoiceQuestion(
    question: Partial<MultipleChoice>
  ): QuestionError[] {
    const errors = <QuestionError[]>[]
    if (
      question.choices == null ||
      question.choices.length < 2 ||
      question.choices.length > 4
    ) {
      errors.push({
        field: 'choices',
        value: question.choices == null ? null : question.choices,
      })
    } else {
      question.choices.forEach((choice, index) => {
        if (choice.text == null || choice.text.length === 0) {
          errors.push({
            field: 'choices',
            value: { index, value: choice.text == null ? null : choice.text },
          })
        }
      })
    }

    if (
      question.answer == null ||
      question.answer < 0 ||
      (question.choices != null && question.answer >= question.choices.length)
    ) {
      errors.push({
        field: 'answer',
        value: question.answer == null ? null : question.answer,
      })
    }

    return errors
  }

  private static validateFillInQuestion(question: FillIn): QuestionError[] {
    if (question.answer == null || question.answer.length === 0) {
      return [
        {
          field: 'answer',
          value: question.answer == null ? null : question.answer,
        },
      ]
    }
    return []
  }
}

// Validation error
export interface QuestionError {
  field: keyof Question | keyof MultipleChoice | keyof FillIn
  value?: any
}

export default Question
