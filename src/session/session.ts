import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8)

/**
 * Represents a classroom/quiz session
 */
export class Session {
  readonly id: string = nanoid()
  readonly quiz: Quiz = new Quiz()
  private users: Map<string, User> = new Map<string, User>()

  private _isStarted: boolean = false
  public get isStarted(): boolean {
    return this._isStarted
  }

  constructor(readonly owner: string) {}

  /**
   * Adds a user to the Session
   * @param user User joining
   * @returns true if user is added successfully
   */
  addUser(user: User): boolean {
    if (user.id === this.owner || this.isStarted || this.users.has(user.name)) {
      return false
    }
    this.users.set(user.name, user)
    return true
  }

  /**
   * Removes a user from the Session
   * @param name Name of the user to remove
   * @returns the removed User
   */
  removeUser(name: string): User | undefined {
    return this.users.get(name)
  }

  /**
   * Starts the Session, preventing users from joining and causing
   * questions to be pushed to users
   */
  start() {
    this._isStarted = true
  }
}

export class User {
  constructor(readonly name: string, readonly id: string) {}
}

/**
 * A single-Session Quiz that contains multiple questions
 */
export class Quiz {
  private questions: Question[] = []
  private currentQuestion: number = 0

  get nextQuestion(): Question | null {
    if (this.currentQuestion >= this.questions.length) {
      return null
    }
    const question = this.questions[this.currentQuestion]!
    this.currentQuestion += 1
    return question
  }

  /**
   * Adds a question to the Quiz. Questions can be added at any time.
   * @param question Question to add
   */
  addQuestion(question: Question) {
    this.questions.push(question)
  }
}

export const MultipleChoiceFormat = 'MultipleChoice'
export const FillInFormat = 'FillIn'
export type QuestionFormat = typeof MultipleChoiceFormat | typeof FillInFormat

export interface MultipleChoiceAnswer {
  text: string
  isCorrect: boolean
}

export interface MultipleChoice {
  type: typeof MultipleChoiceFormat
  choices: MultipleChoiceAnswer[]
}

export interface FillInAnswer {
  text: string
}

export interface FillIn {
  type: typeof FillInFormat
  answer: FillInAnswer
}

export type QuestionBodyType = MultipleChoice | FillIn

/**
 * A varying-type Question, that could be multiple choice or fill-in
 */
export class Question {
  constructor(readonly text: string, readonly body: QuestionBodyType) {}

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

    let numCorrectChoices = 0
    for (const choice of question.choices) {
      numCorrectChoices += Number(choice.isCorrect ?? 0)
      if (numCorrectChoices > 1) {
        return false
      }
      if (choice.text == null || choice.text.length === 0) {
        return false
      }
    }

    if (numCorrectChoices === 0) {
      return false
    }

    return true
  }

  private static validateFillInQuestion(question: FillIn): boolean {
    return question.answer != null && question.answer.text.length !== 0
  }
}
