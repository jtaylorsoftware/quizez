import { List } from 'immutable'
import { Question } from './question'

/**
 * A single-Session Quiz that contains multiple questions
 */
export class Quiz {
  private _questions = List<Question>()
  private _currentQuestionIndex: number = -1

  /**
   * A view of the questions in the Quiz
   */
  get questions(): List<Question> {
    return this._questions
  }

  /**
   * The number of questions in the Quiz
   */
  get numQuestions(): number {
    return this._questions.size
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
      this._currentQuestionIndex >= this.numQuestions
    ) {
      return null
    }
    return this._questions.get(this._currentQuestionIndex)!
  }

  /**
   * Gets a Question at the given index
   * @returns the Question if it exists or undefined
   */
  questionAt(index: number): Question | undefined {
    return this._questions.get(index)
  }

  /**
   * Advances the Quiz to the next Question.
   * @returns the next Question or null if no more Questions
   */
  advanceToNextQuestion(): Question | null {
    if (this._currentQuestionIndex + 1 >= this.numQuestions) {
      return null
    }
    this._currentQuestionIndex += 1
    const question = this._questions.get(this._currentQuestionIndex)!
    question.start()
    return question
  }

  /**
   * Adds a question to the Quiz.
   * @param question Question to add
   */
  addQuestion(question: Question) {
    this._questions = this._questions.push(question)
    question.index = this._questions.size - 1
  }

  /**
   * Creates a copy of the Quiz
   * @returns the copy of the Quiz
   */
  clone(): Quiz {
    const copy = new Quiz()
    copy._questions = this._questions.map((question) => question.clone())
    copy._currentQuestionIndex = this._currentQuestionIndex
    return copy
  }
}

export const MultipleChoiceFormat = 'MultipleChoice'
export const FillInFormat = 'FillIn'
export type QuestionFormat = typeof MultipleChoiceFormat | typeof FillInFormat

export interface QuestionSubmission {
  text: string | undefined
  body: QuestionBodyType | undefined
}

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
  answer: number
}

export interface FillInResponse {
  type: typeof FillInFormat
  /**
   * The name of the user submitting the response
   */
  submitter: string
  answer: string
}

export type ResponseType = MultipleChoiceResponse | FillInResponse
export function responseToString(response: ResponseType): string {
  switch (response.type) {
    case MultipleChoiceFormat:
      return response.answer.toString()
    case FillInFormat:
      return response.answer
    default:
      return ''
  }
}

export default Quiz
