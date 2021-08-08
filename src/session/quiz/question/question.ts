import { QuestionError } from 'api/error'
import {
  QuestionBodyType,
  QuestionData,
  ResponseType,
  Seconds,
} from 'api/question'
import { List, Map } from 'immutable'
import { Feedback } from 'session/quiz/question/feedback'

/**
 * A varying-type Question, that could be multiple choice or fill-in
 */
export abstract class Question {
  static readonly minTimeLimit: Seconds = 60
  static readonly maxTimeLimit: Seconds = 300

  static readonly minTotalPoints: number = 100

  static readonly minMcChoices: number = 2
  static readonly maxMcChoices: number = 4

  static readonly minFillInChoices: number = 1
  static readonly maxFillInChoices: number = 3

  /**
   * The index of this Question in its Quiz
   */
  public index: number = -1 // unassigned

  protected _totalPoints: number = 0
  protected _text: string = ''
  protected _timeLimit: Seconds = 0
  public onTimeout?: Function

  protected _feedback = Map<string, Feedback>() // keyed on username
  protected _responses = Map<string, ResponseType>() // keyed on username
  protected _frequency = Map<string, number>() // keyed on stringified response data
  protected _firstCorrect: string | undefined
  protected _isStarted: boolean = false
  protected _hasEnded: boolean = false

  protected timeout!: NodeJS.Timeout

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
  abstract get body(): QuestionBodyType

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

  constructor(text: string, timeLimit: Seconds) {
    this._text = text
    this._timeLimit = timeLimit
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
   * @returns the grade of the Response (point value earned)
   * @throws Error thrown if user already responded or if the question has ended or has not started
   */
  addResponse(response: ResponseType): number {
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
    const points = this.gradeResponse(response)
    if (points > 0 && this._firstCorrect == null) {
      this._firstCorrect = response.submitter
    }
    this.updateFrequency(response)
    return points
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
  abstract frequencyOf(response: ResponseType): number

  /**
   * @returns A copy of this Question
   */
  abstract clone(): Question

  protected abstract updateFrequency(response: ResponseType): void

  protected abstract gradeResponse(response: ResponseType): number

  protected static validateQuestionText(text: string): QuestionError[] {
    if (text.length === 0) {
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

  protected static validateQuestionPoints(
    totalPoints: number
  ): QuestionError[] {
    if (totalPoints < this.minTotalPoints) {
      return [
        {
          field: 'totalPoints',
          value: totalPoints == null ? null : totalPoints,
        },
      ]
    }

    return []
  }

  protected static validateQuestionTimeLimit(
    timeLimit: number
  ): QuestionError[] {
    if (
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
}

export default Question
