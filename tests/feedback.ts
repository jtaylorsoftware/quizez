import { Feedback, Rating } from 'session/quiz'

describe('Feedback', () => {
  describe('validate', () => {
    it('should reject feedback with invalid ratings', () => {
      let feedback: Partial<Feedback> = {
        rating: undefined,
        message: 'Test',
      }
      expect(Feedback.validate(feedback)).toContainEqual({
        field: 'rating',
        value: undefined,
      })

      feedback = {
        rating: Rating.Impossible - 1,
        message: 'Test',
      }
      expect(Feedback.validate(feedback)).toContainEqual({
        field: 'rating',
        value: feedback.rating,
      })

      feedback = {
        rating: Rating.Easy + 1,
        message: 'Test',
      }
      expect(Feedback.validate(feedback)).toContainEqual({
        field: 'rating',
        value: feedback.rating,
      })
    })

    it('should reject feedback with invalid messages', () => {
      let feedback: Partial<Feedback> = {
        rating: Rating.Easy,
        message: undefined,
      }
      expect(Feedback.validate(feedback)).toContainEqual({
        field: 'message',
        value: undefined,
      })

      feedback = {
        rating: Rating.Easy,
        message: 'a'.repeat(Feedback.maxMessageCharacters + 1),
      }
      expect(Feedback.validate(feedback)).toContainEqual({
        field: 'message',
        value: feedback.message,
      })
    })

    it('should accept feedback with valid properties', () => {
      let feedback: Partial<Feedback> = {
        rating: Rating.Easy,
        message: 'Test',
      }

      expect(Feedback.validate(feedback)).toHaveLength(0)
    })
  })
})
