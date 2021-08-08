import {
  FillIn,
  MultipleChoice,
  QuestionFormat,
  QuestionSubmission,
  QuestionSubmissionBodyType,
} from 'api/question'
import { nanoid } from 'nanoid'
import { unwrap } from 'result'
import { Quiz } from 'session/quiz'
import { fromSubmission, Question } from 'session/quiz/question'
import FillInQuestion from 'session/quiz/question/fillin'
import MultipleChoiceQuestion from 'session/quiz/question/multiplechoice'

jest.mock('session/quiz/question/question')
jest.mock('session/quiz/question/fillin')
jest.mock('session/quiz/question/multiplechoice')
jest.mock('session/quiz/question/submission', () => {
  return {
    fromSubmission: jest.fn((submission: QuestionSubmission) => {
      const { text, body, timeLimit } = submission
      switch (submission.body!.type) {
        case QuestionFormat.MultipleChoiceFormat:
          return {
            data: new MultipleChoiceQuestion(
              text!,
              body as MultipleChoice,
              timeLimit!
            ),
          }
        case QuestionFormat.FillInFormat:
          return { data: new FillInQuestion(text!, body as FillIn, timeLimit!) }
      }
    }),
  }
})

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
      { text: nanoid(), points: randomInt(50, 100) },
      { text: nanoid(), points: randomInt(50, 100) },
    ],
  }

  const question = fromSubmission({
    text: nanoid(),
    body,
    timeLimit: randomInt(Question.minTimeLimit, Question.maxTimeLimit),
  })
  return unwrap(question)
}

function randomInt(min: number, max: number): number {
  if (max < min) {
    let t = max
    max = min
    min = t
  }
  return Math.max(min, Math.floor(Math.random() * max))
}
