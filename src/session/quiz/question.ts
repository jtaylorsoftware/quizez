import { List, Map } from 'immutable'
import { Result, ResultType } from 'result'
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
  timeLimit: number
  body: QuestionSubmissionBodyType
}

// Concrete body types and the types of their answers
export interface MultipleChoice {
  type: QuestionFormat.MultipleChoiceFormat
  choices: MultipleChoiceAnswer[]
  answer: number
}

export interface MultipleChoiceSubmission {
  type?: QuestionFormat.MultipleChoiceFormat
  choices?: MultipleChoiceSubmisisonAnswer[]
  answer?: number
}

export interface MultipleChoiceAnswer {
  text: string
  points: number
}

export type MultipleChoiceSubmisisonAnswer = Partial<MultipleChoiceAnswer>

export interface FillIn {
  type: QuestionFormat.FillInFormat
  /**
   * Answer map keyed on answer text
   */
  answers: Map<string, FillInAnswer>
}

export interface FillInSubmission {
  type?: QuestionFormat.FillInFormat
  /**
   * Array of answers submitted by client
   */
  answers?: FillInSubmissionAnswer[]
}

export interface FillInAnswer {
  text: string
  points: number
}

export type FillInSubmissionAnswer = Partial<FillInAnswer>

/**
 * Type used once Question submission is validated
 */
export type QuestionBodyType = MultipleChoice | FillIn

/**
 * Type submitted directly from client
 */
export type QuestionSubmissionBodyType =
  | MultipleChoiceSubmission
  | FillInSubmission

// ---

type Seconds = number

/**
 * Question data expected to be received by clients
 */
export interface QuestionData {
  text: string
  body: QuestionBodyType
  totalPoints: number
  timeLimit: Seconds
}

/**
 * A varying-type Question, that could be multiple choice or fill-in
 */
export class Question {
  static readonly minTimeLimit: Seconds = 60
  static readonly maxTimeLimit: Seconds = 300

  static readonly minTotalPoints: number = 0
  static readonly maxTotalPoints: number = 1000

  static readonly minPointsPerAnswer: number = 0

  static readonly minMcChoices: number = 2
  static readonly maxMcChoices: number = 4

  static readonly minFillInChoices: number = 1
  static readonly maxFillInChoices: number = 3

  /**
   * The index of this Question in its Quiz
   */
  public index: number = -1 // unassigned

  private _totalPoints: number = 0
  private _text: string = ''
  private _timeLimit: Seconds = 0
  public onTimeout?: Function

  private _feedback = Map<string, Feedback>() // keyed on username
  private _responses = Map<string, ResponseType>() // keyed on username
  private _frequency = Map<string, number>() // keyed on stringified response data
  private _firstCorrect: string | undefined
  private _isStarted: boolean = false
  private _hasEnded: boolean = false
  private _body?: QuestionBodyType

  private timeout!: NodeJS.Timeout

  /**
   * Total point value of the Question
   */
  get totalPoints(): number {
    return this._totalPoints
  }

  /**
   * The text of the Question, or what is being asked
   */
  get text(): string {
    return this._text
  }

  /**
   * The time users have to answer the Question
   */
  get timeLimit(): Seconds {
    return this._timeLimit
  }

  /**
   * Returns the data to transmit for this Question
   */
  get data(): QuestionData {
    return {
      text: this.text,
      body: this.body!,
      totalPoints: this.totalPoints,
      timeLimit: this.timeLimit,
    }
  }

  /**
   * The body of the Question
   */
  get body(): QuestionBodyType {
    return this._body!
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
   * Parses a Question from client submitted data
   * @param text The main text of the Question (what is used by responders to determine answer)
   * @param body The submitted question body for the Question
   * @param timeLimit The time to answer the question
   * @returns Result containing either the Question or validation errors
   */
  static parse(
    text: string,
    body: QuestionSubmissionBodyType,
    timeLimit: Seconds
  ): ResultType<Question, QuestionError> {
    const question = new Question()

    // Copy over simple fields to validate later
    question._text = text
    question._timeLimit = timeLimit

    // Parse body into expected type for validation
    this.parseQuestionSubmissionBody(body, question)

    const errors = this.validate(question)
    return errors.length === 0
      ? {
          type: Result.Success,
          data: question,
        }
      : {
          type: Result.Failure,
          errors,
        }
  }

  private static parseQuestionSubmissionBody(
    body: QuestionSubmissionBodyType,
    outQuestion: Question
  ) {
    if (body != null && body.type != null && body.type in QuestionFormat) {
      // Prepopulate frequency map and count actual total points
      switch (body.type) {
        case QuestionFormat.MultipleChoiceFormat:
          this.parseMultipleChoiceSubmission(body, outQuestion)
          break
        case QuestionFormat.FillInFormat:
          this.parseFillInSubmission(body, outQuestion)
          break
      }
    }
  }

  private static parseMultipleChoiceSubmission(
    body: MultipleChoiceSubmission,
    outQuestion: Question
  ) {
    let actualTotalPoints: number = 0
    if (body.choices != null) {
      body.choices.forEach((choice, index) => {
        actualTotalPoints =
          actualTotalPoints + (choice.points ?? -1 * actualTotalPoints) // reset total if any point value is undefined
        outQuestion._frequency = outQuestion._frequency.set(index.toString(), 0)
      })
      outQuestion._body = { ...body } as MultipleChoice
    }
    outQuestion._totalPoints = actualTotalPoints
  }

  private static parseFillInSubmission(
    body: FillInSubmission,
    outQuestion: Question
  ) {
    let actualTotalPoints: number = 0
    if (body.answers != null) {
      const answers = body.answers as FillInAnswer[]
      const answerMap = Map<string, FillInAnswer>()
      answers.forEach((answer, _) => {
        actualTotalPoints =
          actualTotalPoints + (answer.points ?? -1 * actualTotalPoints)
        answerMap.set(answer.text, answer) // populate a mapping of answer text to answer
        outQuestion._frequency = outQuestion._frequency.set(answer.text, 0)
      })
      outQuestion._body = { ...body, answers: answerMap } as FillIn
    }
    outQuestion._totalPoints = actualTotalPoints
  }

  private constructor() {}

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
    const copy = new Question()
    copy._text = this.text
    copy._body = this.body
    copy._timeLimit = this.timeLimit
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
        const answers = <Map<string, FillInAnswer>>(this.body as FillIn).answers
        return answers.has(response.answer)
    }
  }

  private static validate(question: Partial<Question>): QuestionError[] {
    const errors: QuestionError[] = []

    errors.concat(this.validateQuestionText(question.text))
    errors.concat(this.validateQuestionPoints(question.totalPoints))
    errors.concat(this.validateQuestionTimeLimit(question.timeLimit))
    errors.concat(this.validateQuestionBody(question.body))

    return errors
  }

  private static validateQuestionText(text?: string): QuestionError[] {
    if (text == null || text.length === 0) {
      return [
        {
          field: 'text',
          value:
            text == null
              ? null
              : text /** convert undefined to null (or value) */,
        },
      ]
    }
    return []
  }

  private static validateQuestionPoints(totalPoints?: number): QuestionError[] {
    if (
      totalPoints == null ||
      totalPoints > this.maxTotalPoints ||
      totalPoints < this.minTotalPoints
    ) {
      return [
        {
          field: 'totalPoints',
          value: totalPoints == null ? null : totalPoints,
        },
      ]
    }

    return []
  }

  private static validateQuestionTimeLimit(
    timeLimit?: number
  ): QuestionError[] {
    if (
      timeLimit == null ||
      timeLimit < Question.minTimeLimit ||
      timeLimit > Question.maxTimeLimit
    ) {
      return [
        {
          field: 'timeLimit',
          value: timeLimit == null ? null : timeLimit,
        },
      ]
    }

    return []
  }

  private static validateQuestionBody(
    body?: QuestionBodyType
  ): QuestionError[] {
    const errors = <QuestionError[]>[]
    if (body == null) {
      errors.push({ field: 'body', value: null })
    } else if (body.type == null) {
      errors.push({ field: 'body', value: { field: 'type', value: null } })
    } else {
      if (!(body.type in QuestionFormat)) {
        errors.push({ field: 'body', value: body.type })
      } else {
        switch (body.type) {
          case QuestionFormat.MultipleChoiceFormat:
            errors.concat(this.validateMultipleChoiceQuestion(body))
            break
          case QuestionFormat.FillInFormat:
            errors.concat(this.validateFillInQuestion(body))
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
            value: {
              field: 'text',
              index,
              value: choice.text == null ? null : choice.text,
            },
          })
        }
        if (choice.points == null || choice.points < this.minPointsPerAnswer) {
          errors.push({
            field: 'answers',
            value: {
              field: 'points',
              index,
              value: choice.points == null ? null : choice.points,
            },
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
    const errors = <QuestionError[]>[]
    const answers = question.answers as Map<string, FillInAnswer>
    if (
      answers == null ||
      answers.size < this.minFillInChoices ||
      answers.size > this.maxFillInChoices
    ) {
      errors.push({
        field: 'answers',
        value: answers == null ? null : answers,
      })
    } else {
      answers.toIndexedSeq().forEach((answer, index) => {
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
        if (answer.points == null || answer.points < this.minPointsPerAnswer) {
          errors.push({
            field: 'answers',
            value: {
              field: 'points',
              index,
              value: answer.points == null ? null : answer.points,
            },
          })
        }
      })
    }

    return errors
  }
}

// Validation error
export interface QuestionError {
  field: keyof Question | keyof MultipleChoice | keyof FillIn
  value?: any
}

export default Question
