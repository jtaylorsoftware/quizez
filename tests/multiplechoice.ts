import { QuestionFormat } from 'api/question'
import { unwrap } from 'result'
import { fromSubmission, Question } from 'session/quiz'
import MultipleChoiceQuestion from 'session/quiz/question/multiplechoice'

describe('MultipleChoiceQuestion', () => {
  it('should successfully validate a valid Question', () => {
    let submission = {
      type: QuestionFormat.MultipleChoiceFormat,
      choices: [
        { text: 'One', points: 50 },
        { text: 'Two', points: 50 },
      ],
      answer: 0,
    }
    let question = unwrap(
      fromSubmission({
        text: 'Question',
        body: submission,
        timeLimit: Question.minTimeLimit,
      })
    ) as MultipleChoiceQuestion
    expect(question).not.toBeUndefined()
    expect(question.choices).toHaveLength(2)
    question.choices.forEach((choice) => {
      expect(submission.choices).toContainEqual(choice)
    })
  })

  it('validate should reject questions with too few points', () => {
    let question = unwrap(
      fromSubmission({
        text: 'Question',
        body: {
          type: QuestionFormat.MultipleChoiceFormat,
          choices: [
            { text: 'One', points: 0 },
            { text: 'Two', points: 0 },
          ],
          answer: 0,
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
          type: QuestionFormat.MultipleChoiceFormat,
          choices: [
            { text: 'One', points: 50 },
            { text: 'Two', points: 50 },
          ],
          answer: 0,
        },
        timeLimit: Question.minTimeLimit,
      })
    )
    expect(question).toBeUndefined()
  })

  it('validate should reject choices with empty text', () => {
    let question = unwrap(
      fromSubmission({
        text: 'Question',
        body: {
          type: QuestionFormat.MultipleChoiceFormat,
          choices: [
            { text: '', points: 50 },
            { text: 'Two', points: 50 },
          ],
          answer: 0,
        },
        timeLimit: Question.minTimeLimit,
      })
    )
    expect(question).toBeUndefined()
  })

  it('should not validate questions with too few choices', () => {
    let question = unwrap(
      fromSubmission({
        text: 'Question',
        body: {
          type: QuestionFormat.MultipleChoiceFormat,
          choices: [{ text: 'One', points: 50 }],
          answer: 0,
        },
        timeLimit: Question.minTimeLimit,
      })
    )
    expect(question).toBeUndefined()
  })
})
