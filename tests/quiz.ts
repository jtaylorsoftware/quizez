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
    // Fake impl that skips validation but returns a Question from a QuestionSubmission
    fromSubmission: jest.fn((submission: QuestionSubmission) => {
      const { text, body, timeLimit } = submission
      switch (submission.body!.type) {
        case QuestionFormat.MultipleChoiceFormat: {
          // This will be a class mock with no useful impl or base class getters
          const question = new MultipleChoiceQuestion(
            text!,
            body as MultipleChoice,
            timeLimit!
          )
          // @ts-ignore
          question['body'] = body // still want ability to get body
          return {
            data: question,
          }
        }
        case QuestionFormat.FillInFormat: {
          // See above
          const question = new FillInQuestion(text!, body as FillIn, timeLimit!)
          // @ts-ignore
          question['body'] = body
          return { data: question }
        }
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

  describe('replaceQuestion', () => {
    it('should replace current question if types match', () => {
      const question = randomFillInQuestion()
      quiz.addQuestion(question)
      const newQuestion = randomFillInQuestion()

      // Should replace & return old question
      expect(quiz.replaceQuestion(0, newQuestion)).toEqual(question)

      // Should have a different question now
      expect(quiz.questionAt(0)!).toEqual(newQuestion)
    })

    it('should not replace question if types differ', () => {
      const question = randomFillInQuestion()
      quiz.addQuestion(question)
      const newQuestion = randomMultipleChoiceQuestion()

      // Should not replace & return undefined
      expect(quiz.replaceQuestion(0, newQuestion)).toBeUndefined()
      // Question should be the same as original
      expect(quiz.questionAt(0)!).toEqual(question)
    })
  })

  describe('removeQuestion', () => {
    it('should remove question if index in range', () => {
      quiz.addQuestion(randomFillInQuestion())
      quiz.addQuestion(randomFillInQuestion())

      const question = quiz.questionAt(1)
      expect(quiz.removeQuestion(1)).toEqual(question)
    })
    it('should not question if index is out of range', () => {
      quiz.addQuestion(randomFillInQuestion())
      quiz.addQuestion(randomFillInQuestion())

      expect(quiz.removeQuestion(quiz.numQuestions + 1)).toBeUndefined()
    })
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
      { text: nanoid(), points: getRandomInt(50, 100) },
      { text: nanoid(), points: getRandomInt(50, 100) },
    ],
  }

  const question = fromSubmission({
    text: nanoid(),
    body,
    timeLimit: getRandomInt(Question.minTimeLimit, Question.maxTimeLimit),
  })
  return unwrap(question)
}

function randomMultipleChoiceQuestion(): Question {
  const body: QuestionSubmissionBodyType = {
    type: QuestionFormat.MultipleChoiceFormat,
    choices: [
      { text: nanoid(), points: getRandomInt(50, 100) },
      { text: nanoid(), points: getRandomInt(50, 100) },
    ],
    answer: getRandomInt(0, 1),
  }

  const question = fromSubmission({
    text: nanoid(),
    body,
    timeLimit: getRandomInt(Question.minTimeLimit, Question.maxTimeLimit),
  })
  return unwrap(question)
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1) + min)
}
