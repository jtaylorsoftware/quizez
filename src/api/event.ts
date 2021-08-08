/**
 * Events for managing sessions
 */
export enum SessionEvent {
  /**
   * Placeholder for base event type
   */
  Unused = 'unused',

  /**
   * A client is creating a new joinable Session
   */
  CreateNewSession = 'create session',

  /**
   * The server successfully created a new Session and is responding
   * to the requesting client
   */
  CreatedSession = 'created session',

  /**
   * A client is joining an existing joinable Session
   */
  JoinSession = 'join session',

  /**
   * The server successfully added the client to the session
   */
  JoinSessionSuccess = 'join success',

  /**
   * The server could not add the client to the session
   */
  JoinSessionFailed = 'join failed',

  /**
   * A user is being removed from a Session by the owner
   */
  SessionKick = 'kick',

  /**
   * The server could not remove the user
   */
  SessionKickSuccess = 'kick success',

  /**
   * The server could not remove the user
   */
  SessionKickFailed = 'kick failed',

  /**
   * Owner is starting session
   */
  StartSession = 'start session',

  /**
   * A Session has started
   */
  SessionStarted = 'session started',

  /**
   * A Session failed to start
   */
  SessionStartFailed = 'session start failed',

  /**
   * Owner is ending session
   */
  EndSession = 'end session',

  /**
   * Session has ended
   */
  SessionEnded = 'session ended',

  /**
   * A Session failed to end
   */
  SessionEndFailed = 'session end failed',

  /**
   * A user disconnected from the Session
   */
  UserDisconnected = 'user disconnected',

  /**
   * The Session owner is ending a Question. The client
   * implementation can decide how to end questions, but
   * this message should be used.
   */
  EndQuestion = 'end question',

  EndQuestionFailed = 'end question failed',
  EndQuestionSuccess = 'ended question',

  /**
   * The Session owner has ended a Question. Clients that
   * joined a Session can handle this in any desired way,
   * as NextQuestion is sent to start the next question.
   * Nothing happens between the two events that clients
   * need to handle specifically.
   */
  QuestionEnded = 'question ended',

  /**
   * A Session owner is pushing the next question to users
   */
  NextQuestion = 'next question',

  /**
   * Failed to push the next question. Might be because there
   * are no more questions, or there is no such session.
   */
  NextQuestionFailed = 'next question failed',

  /**
   * A Session owner is adding a question
   */
  AddQuestion = 'add question',

  /**
   * The question sent could not be added to the Quiz
   */
  AddQuestionFailed = 'add question failed',

  /**
   * The question was successfully added to the Quiz
   */
  AddQuestionSuccess = 'add question success',

  /**
   * User is responding to a question
   */
  QuestionResponse = 'question response',

  /**
   * User failed to add Response
   */
  QuestionResponseFailed = 'question response failed',

  /**
   * User successfully added Response
   */
  QuestionResponseSuccess = 'question response success',

  /**
   * Server notifying the Session owner that user submitted a Response
   * successfully
   */
  QuestionResponseAdded = 'question response added',

  /**
   * User giving feedback to a Question
   */
  SubmitFeedback = 'submit feedback',

  /**
   * Failure case. See `SubmitFeedback`
   */
  SubmitFeedbackFailed = 'submit feedback failed',

  /**
   * Success case. See `Submit Feedback`
   */
  SubmitFeedbackSuccess = 'submit feedback success',

  /**
   * Session owner receiving Question feedback
   */
  FeedbackSubmitted = 'feedback submitted',

  /**
   * Session owner sending a hint for a question
   */
  SendHint = 'send hint',

  /**
   * Failure case. See `SendHint`
   */
  SendHintFailed = 'send hint failed',

  /**
   * Success case. See `SendHint`
   */
  SendHintSuccess = 'send hint success',

  /**
   * Users in the session receiving hint
   */
  HintReceived = 'hint received',
}

export default SessionEvent
