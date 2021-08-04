import { FillInFormat, Question } from 'session/quiz'

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
    const question = new Question('Question', {
      type: FillInFormat,
      answer: 'Yes',
    })
    question.start()

    // start() should set up a setTimeout call
    expect(setTimeout).toHaveBeenCalled()

    // Fast forward the timeout
    _invokeTimeoutNow()

    // Timeout should call end()
    expect(question.hasEnded).toBe(true)
  })

  it('should not timeout after manually ending', () => {
    const question = new Question('Question', {
      type: FillInFormat,
      answer: 'Yes',
    })
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
    const question = new Question(
      'Question',
      {
        type: FillInFormat,
        answer: 'Yes',
      },
      Question.minTimeLimit,
      onTimeout
    )
    question.start()

    // Fast forward the timeout
    _invokeTimeoutNow()

    expect(onTimeout).toHaveBeenCalled()
  })
})
