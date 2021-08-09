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
   * A user joined the session
   */
  UserJoinedSession = 'user joined',

  /**
   * A user is being removed from a Session by the owner
   */
  SessionKick = 'kick',

  /**
   * A user is being removed & all users are being notified
   */
  UserKicked = 'user kicked',

  /**
   * Owner is starting session
   */
  StartSession = 'start session',

  /**
   * A Session has started & server is notifying users
   */
  SessionStarted = 'session started',

  /**
   * Owner is ending session
   */
  EndSession = 'end session',

  /**
   * Session has ended & server is notfying all users
   */
  SessionEnded = 'session ended',

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

  /**
   * The Session owner has ended a Question. Clients that
   * joined a Session can handle this in any desired way,
   * as NextQuestion is sent to start the next question.
   * Nothing happens between the two events that clients
   * need to handle specifically.
   */
  QuestionEnded = 'question ended',

  /**
   * Server is notifying users that next question has been pushed
   */
  NextQuestion = 'next question',

  /**
   * A Session owner is adding a question
   */
  AddQuestion = 'add question',

  /**
   * User is responding to a question
   */
  QuestionResponse = 'question response',

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
   * Session owner receiving Question feedback
   */
  FeedbackSubmitted = 'feedback submitted',

  /**
   * Session owner sending a hint for a question
   */
  SendHint = 'send hint',

  /**
   * Users in the session receiving hint
   */
  HintReceived = 'hint received',
}

export default SessionEvent
