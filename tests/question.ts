import { FillInResponse, QuestionFormat } from 'api/question'
import { unwrap } from 'result'
import { fromSubmission, Question } from 'session/quiz'
import FillInQuestion from 'session/quiz/question/fillin'

const _setTimeoutReal = global.setTimeout
const _clearTimeoutReal = global.clearTimeout

describe('Question', () => {
  let _invokeTimeoutNow: Function
  let _cleared: boolean
  let _callback: Function
  let _handle: any

  beforeEach(() => {
    /**
     * Manually mock and create timer fast-forward because
     * current jest versions may not mock these correctly.
     *
     * https://github.com/facebook/jest/issues/11500
     */

    _cleared = false
    _invokeTimeoutNow = () => {
      if (!_cleared) {
        _clearTimeoutReal(_handle)
        _callback()
      }
    }

    // @ts-ignore
    global.setTimeout = jest.fn((callback, timeout) => {
      _callback = callback
      _handle = _setTimeoutReal(callback, timeout)
    })

    // @ts-ignore
    global.clearTimeout = jest.fn((handle) => {
      _cleared = true
      _clearTimeoutReal(handle)
    })
  })

  afterEach(() => {
    _clearTimeoutReal(_handle)
  })

  it('should eventually timeout after start()', () => {
    const question = unwrap(
      fromSubmission({
        text: 'Question',
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
    question.start()

    // start() should set up a setTimeout call
    expect(setTimeout).toHaveBeenCalled()

    // Fast forward the timeout
    _invokeTimeoutNow()

    // Timeout should call end()
    expect(question.hasEnded).toBe(true)
  })

  it('should not timeout after manually ending', () => {
    const question = unwrap(
      fromSubmission({
        text: 'Question',
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
    question.start()
    question.end()

    // Fast forward the timeout
    _invokeTimeoutNow()

    // end() should end the question
    expect(question.hasEnded).toBe(true)

    // clearTimeout should be called only once (from end())
    expect(clearTimeout).toHaveBeenCalledTimes(1)
  })

  it('should call its onTimeout method on timeout', () => {
    const onTimeout = jest.fn(() => {})
    const question = unwrap(
      fromSubmission({
        text: 'Question',
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
    question.onTimeout = onTimeout
    question.start()

    // Fast forward the timeout
    _invokeTimeoutNow()

    expect(onTimeout).toHaveBeenCalled()
  })

  describe('addResponse', () => {
    it('should return the number of points earned for the given answer', () => {
      const question = <FillInQuestion>unwrap(
        fromSubmission({
          text: 'Question',
          body: {
            type: QuestionFormat.FillInFormat,
            answers: [
              { text: 'One', points: 100 },
              { text: 'Two', points: 0 },
            ],
          },
          timeLimit: Question.minTimeLimit,
        })
      )

      question.start()
      let points = question.addResponse({
        type: QuestionFormat.FillInFormat,
        answer: 'One',
        submitter: 'User',
      })
      expect(points).toBe(question.answers.get('one')!.points)
    })

    it('should be case insensitive', () => {
      const question = <FillInQuestion>unwrap(
        fromSubmission({
          text: 'Question',
          body: {
            type: QuestionFormat.FillInFormat,
            answers: [
              { text: 'Answer One', points: 51 },
              { text: 'Answer Two', points: 50 },
            ],
          },
          timeLimit: Question.minTimeLimit,
        })
      )

      question.start()
      const response: FillInResponse = {
        type: QuestionFormat.FillInFormat,
        answer: 'AnSwEr OnE',
        submitter: 'User',
      }
      let points = question.addResponse(response)
      expect(points).toBe(
        question.answers.get(response.answer.toLowerCase())!.points
      )
    })
  })
})
