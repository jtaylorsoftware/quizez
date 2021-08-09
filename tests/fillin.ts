import { QuestionFormat } from 'api/question'
import { unwrap } from 'result'
import { fromSubmission, Question } from 'session/quiz'
import FillInQuestion from 'session/quiz/question/fillin'

describe('FillInQuestion', () => {
  it('should successfully validate a valid Question', () => {
    let submission = {
      type: QuestionFormat.FillInFormat,
      answers: [
        { text: 'One', points: 50 },
        { text: 'Two', points: 50 },
      ],
    }
    let question = unwrap(
      fromSubmission({
        text: 'Question',
        body: submission,
        timeLimit: Question.minTimeLimit,
      })
    ) as FillInQuestion
    expect(question).not.toBeUndefined()
    expect(question.answers.size).toBe(2)
    question.answers.forEach((answer) => {
      expect(submission.answers).toContainEqual(answer)
    })
  })

  it('validate should reject questions with too few points', () => {
    let question = unwrap(
      fromSubmission({
        text: 'Question',
        body: {
          type: QuestionFormat.FillInFormat,
          answers: [
            { text: 'One', points: 0 },
            { text: 'Two', points: 0 },
          ],
        },
        timeLimit: Question.minTimeLimit,
      })
    )
    expect(question).toBeUndefined()
  })

  it('validate should reject questions with empty text', () => {
    let question = unwrap(
      fromSubmission({
        text: '',
        body: {
          type: QuestionFormat.FillInFormat,
          answers: [
            { text: 'One', points: 50 },
            { text: 'Two', points: 50 },
          ],
        },
        timeLimit: Question.minTimeLimit,
      })
    )
    expect(question).toBeUndefined()
  })

  it('validate should reject answers with empty text', () => {
    let question = unwrap(
      fromSubmission({
        text: 'Question',
        body: {
          type: QuestionFormat.FillInFormat,
          answers: [
            { text: '', points: 50 },
            { text: 'Two', points: 50 },
          ],
        },
        timeLimit: Question.minTimeLimit,
      })
    )
    expect(question).toBeUndefined()
  })

  it('should not validate questions with too few answers', () => {
    let question = unwrap(
      fromSubmission({
        text: 'Question',
        body: {
          type: QuestionFormat.FillInFormat,
          answers: [{ text: 'One', points: 50 }],
        },
        timeLimit: Question.minTimeLimit,
      })
    )
    expect(question).toBeUndefined()
  })

  describe('body', () => {
    it('should have type FillIn', () => {
      let submission = {
        type: QuestionFormat.FillInFormat,
        answers: [
          { text: 'One', points: 50 },
          { text: 'Two', points: 50 },
        ],
      }
      let question = unwrap(
        fromSubmission({
          text: 'Question',
          body: submission,
          timeLimit: Question.minTimeLimit,
        })
      ) as FillInQuestion

      expect(question.data.body.type).toBe(QuestionFormat.FillInFormat)
    })
  })
})
