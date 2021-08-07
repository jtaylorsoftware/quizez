jest.mock('session/quiz/question')
import { nanoid } from 'nanoid'
import { unwrap } from 'result'
import { QuestionFormat, Quiz } from 'session/quiz'
import { Question, QuestionSubmissionBodyType } from 'session/quiz/question'

describe('Quiz', () => {
  // SUT
  let quiz: Quiz

  beforeEach(() => {
    quiz = new Quiz()
  })

  it('should have currentIndex equals -1 before next question', () => {
    expect(quiz.currentQuestionIndex).toBe(-1)
  })

  it('addQuestion should add question', () => {
    let question = randomFillInQuestion()
    quiz.addQuestion(question)
    expect(quiz.questions.contains(question)).toBe(true)
  })

  it('questionAt should return same question as one in questions', () => {
    quiz.addQuestion(randomFillInQuestion())
    expect(quiz.questionAt(0)).toEqual(quiz.questions.get(0))
  })

  it('numQuestions should match questions.size', () => {
    quiz.addQuestion(randomFillInQuestion())
    expect(quiz.numQuestions).toBe(quiz.questions.size)
  })

  describe('advanceToNextQuestion', () => {
    describe('with questions added', () => {
      // Test data
      let question: Question
      beforeEach(() => {
        question = randomFillInQuestion()
        quiz.addQuestion(question)
      })

      it('should move index forward and start question', () => {
        quiz.advanceToNextQuestion()
        expect(quiz.currentQuestionIndex).toBe(0)
        expect(quiz.currentQuestion).toBe(question)
        expect(question.start).toHaveBeenCalled()
      })
    })
  })
})

function randomFillInQuestion(): Question {
  const body: QuestionSubmissionBodyType = {
    type: QuestionFormat.FillInFormat,
    answers: [
      { text: nanoid(), points: randomInt(500) },
      { text: nanoid(), points: randomInt(500) },
    ],
  }

  const question = Question.parse(
    nanoid(),
    body,
    Math.max(Question.minTimeLimit, randomInt(Question.maxTimeLimit))
  )
  return unwrap(question)
}

function randomInt(max: number): number {
  return Math.floor(Math.random() * max)
}
