import { customAlphabet } from 'nanoid'
import { List, Map } from 'immutable'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8)

/**
 * Represents a classroom/quiz session
 */
export class Session {
  readonly id: string = nanoid()

  private _quiz: Quiz = new Quiz()
  /**
   * Gets the Quiz or a copy of the Quiz if Session has ended
   */
  get quiz(): Quiz {
    if (this.hasEnded) {
      return this._quiz.clone()
    }
    return this._quiz
  }

  /**
   * Map of users keyed on user.name
   */
  private users = Map<string, User>()

  private _isStarted: boolean = false
  public get isStarted(): boolean {
    return this._isStarted
  }

  private _hasEnded: boolean = false
  public get hasEnded(): boolean {
    return this._hasEnded
  }

  constructor(readonly owner: string) {}

  /**
   * Finds a User by name
   * @param name name of User to lookup
   * @returns the User if found, or undefined
   */
  findUserByName(name: string): User | undefined {
    return this.users.get(name)
  }

  /**
   * Adds a user to the Session
   * @param user User joining
   * @returns true if user is added successfully
   */
  addUser(user: User): boolean {
    if (
      user.id === this.owner ||
      this.isStarted ||
      this.hasEnded ||
      this.users.has(user.name)
    ) {
      return false
    }
    this.users = this.users.set(user.name, user)
    return true
  }

  /**
   * Removes a user from the Session by name
   * @param name Name of the user to remove
   * @returns the removed User
   */
  removeUser(name: string): User | undefined {
    const user = this.users.get(name)
    if (user != null) {
      this.users = this.users.delete(user.name)
    }
    return user
  }

  /**
   * Starts the Session, preventing users from joining and causing
   * questions to be pushed to users
   */
  start() {
    this._isStarted = true
  }

  /**
   * Ends the sesssion, preventing it from being used again for
   * quizzes, but it will persist until the owner disconnects
   */
  end() {
    this._hasEnded = true
  }
}

export class User {
  constructor(readonly name: string, readonly id: string) {}
}

/**
 * A single-Session Quiz that contains multiple questions
 */
export class Quiz {
  private questions = List<Question>()
  private _currentQuestionIndex: number = -1

  /**
   * The number of questions in the Quiz
   */
  get numQuestions(): number {
    return this.questions.count()
  }

  /**
   * The index of the current question
   */
  get currentQuestionIndex(): number {
    return this._currentQuestionIndex
  }

  /**
   * The current Question, or null if the Quiz has not been advanced to a Question yet
   */
  get currentQuestion(): Question | null {
    if (
      this._currentQuestionIndex < 0 ||
      this._currentQuestionIndex >= this.questions.count()
    ) {
      return null
    }
    return this.questions.get(this._currentQuestionIndex)!
  }

  /**
   * Gets a Question at the given index
   * @returns the Question if it exists or undefined
   */
  questionAt(index: number): Question | undefined {
    return this.questions.get(index)
  }

  /**
   * Advances the Quiz to the next Question.
   * @returns the next Question or null if no more Questions
   */
  advanceToNextQuestion(): Question | null {
    if (this._currentQuestionIndex + 1 >= this.questions.count()) {
      return null
    }
    this._currentQuestionIndex += 1
    const question = this.questions.get(this._currentQuestionIndex)!
    return question
  }

  /**
   * Adds a question to the Quiz.
   * @param question Question to add
   */
  addQuestion(question: Question) {
    this.questions = this.questions.push(question)
  }

  /**
   * Creates a copy of the Quiz
   * @returns the copy of the Quiz
   */
  clone(): Quiz {
    const copy = new Quiz()
    copy.questions = this.questions.map((question) => question.clone())
    copy._currentQuestionIndex = this._currentQuestionIndex
    return copy
  }
}

export const MultipleChoiceFormat = 'MultipleChoice'
export const FillInFormat = 'FillIn'
export type QuestionFormat = typeof MultipleChoiceFormat | typeof FillInFormat

export interface MultipleChoiceAnswer {
  text: string
}

export interface MultipleChoice {
  type: typeof MultipleChoiceFormat
  choices: MultipleChoiceAnswer[]
  answer: number
}

export type FillInAnswer = string

export interface FillIn {
  type: typeof FillInFormat
  answer: FillInAnswer
}

export type QuestionBodyType = MultipleChoice | FillIn

export interface MultipleChoiceResponse {
  type: typeof MultipleChoiceFormat
  /**
   * The name of the user submitting the response
   */
  submitter: string
  choice: number
}

export interface FillInResponse {
  type: typeof FillInFormat
  /**
   * The name of the user submitting the response
   */
  submitter: string
  text: string
}

export type ResponseType = MultipleChoiceResponse | FillInResponse
export function responseToString(response: ResponseType): string {
  switch (response.type) {
    case MultipleChoiceFormat:
      return response.choice.toString()
    case FillInFormat:
      return response.text
    default:
      return ''
  }
}

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
        const answer = response.choice.toString()
        return this._frequency.get(answer)!
      }
      case FillInFormat: {
        const answer = response.text
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
          const answer = response.choice.toString()
          const prev = this._frequency.get(answer)!
          this._frequency = this._frequency.set(answer, prev + 1)
        }
        break
      case FillInFormat:
        {
          const answer = response.text
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
        return response.choice === mcQuestion.answer
      case FillInFormat:
        const fillInQuestion = this.body as FillIn
        return response.text === fillInQuestion.answer
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
