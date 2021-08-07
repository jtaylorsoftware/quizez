import { List, Map } from 'immutable'
import { ResultType, Success } from 'result'
import {
  Feedback,
  QuestionBodyType,
  QuestionData,
  QuestionError,
  QuestionSubmissionBodyType,
  ResponseType,
} from 'session/quiz'

type Seconds = number

export enum QuestionFormat {
  MultipleChoiceFormat,
  FillInFormat,
}

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

  public index: number = -1

  private _totalPoints: number = 0
  private _text: string = ''
  private _timeLimit: Seconds = 0
  public onTimeout?: Function

  private _feedback = Map<string, Feedback>()
  private _responses = Map<string, ResponseType>()
  private _frequency = Map<string, number>()
  private _firstCorrect: string | undefined
  private _isStarted: boolean = false
  private _hasEnded: boolean = false
  private _body?: QuestionBodyType

  private timeout!: NodeJS.Timeout

  get totalPoints(): number {
    return this._totalPoints
  }

  get text(): string {
    return this._text
  }

  get timeLimit(): Seconds {
    return this._timeLimit
  }

  get data(): QuestionData {
    return {
      text: this.text,
      body: this.body!,
      totalPoints: this.totalPoints,
      timeLimit: this.timeLimit,
    }
  }

  get body(): QuestionBodyType {
    return this._body!
  }

  get isStarted(): boolean {
    return this._isStarted
  }

  get hasEnded(): boolean {
    return this._hasEnded
  }

  get firstCorrect(): string | undefined {
    return this._firstCorrect
  }

  get responses(): List<ResponseType> {
    return this._responses.valueSeq().toList()
  }

  get numResponses(): number {
    return this._responses.count()
  }

  get frequency(): Map<string, number> {
    return this._frequency
  }

  get relativeFrequency(): Map<string, number> {
    return this._frequency.map((value) => value / this.numResponses)
  }

  get feedback(): Map<string, Feedback> {
    return this._feedback
  }

  static parse(
    text: string,
    body: QuestionSubmissionBodyType,
    timeLimit: Seconds
  ): ResultType<Question, QuestionError> {
    const question = new Question()
    question._text = text
    question._body = body as QuestionBodyType
    question._timeLimit = timeLimit
    return { data: question } as Success<Question>
  }

  private constructor() {}

  start = jest.fn(() => {
    this._isStarted = true

    if (this.onTimeout != null) {
      this.onTimeout()
    }
  })

  end = jest.fn(() => {
    if (this._isStarted) {
      this._hasEnded = true
      clearTimeout(this.timeout)
    }
  })

  addResponse = jest.fn((response: ResponseType): boolean => {
    return true
  })

  addFeedback = jest.fn((user: string, feedback: Feedback): boolean => {
    return true
  })

  relativeFrequencyOf = jest.fn((response: ResponseType): number => {
    return 0
  })

  frequencyOf = jest.fn((response: ResponseType): number => {
    return 0
  })

  clone = jest.fn(() => new Question())
}

export default Question
