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
   * The current Question, or undefined if the Quiz has not been advanced to a Question yet
   */
  get currentQuestion(): Question | undefined {
    if (
      this._currentQuestionIndex < 0 ||
      this._currentQuestionIndex >= this.numQuestions
    ) {
      return undefined
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
   * @returns the next Question or undefined if no more Questions
   */
  advanceToNextQuestion(): Question | undefined {
    if (this._currentQuestionIndex + 1 >= this.numQuestions) {
      return undefined
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
   * Removes the question at the index
   * @returns the question removed or undefined if index out of range
   */
  removeQuestion(index: number): Question | undefined {
    if (index < 0 || index >= this.numQuestions) {
      return undefined
    }
    const question = this.questionAt(index)
    this._questions = this._questions.remove(index)
    return question
  }

  /**
   * Replaces the Question at the given index if their types match.
   * The new Question is assumed to be validated.
   * @param index index of question to replace
   * @param newQuestion question data to substitute
   * @returns the old Question if types matched and replaced question
   */
  replaceQuestion(index: number, newQuestion: Question): Question | undefined {
    if (index < 0 || index >= this.numQuestions) {
      return undefined
    }

    if (newQuestion.body.type !== this.questionAt(index)!.body.type) {
      return undefined
    }
    const question = this.questionAt(index)
    this._questions = this._questions.set(index, newQuestion)
    return question
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

export default Quiz
