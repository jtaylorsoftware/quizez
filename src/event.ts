/**
 *
 *
 * Events between server & client
 *
 *
 */

/**
 * A client is creating a new joinable Session
 */
export const CreateNewSession = 'create session'

/**
 * The server successfully created a new Session and is responding
 * to the requesting client
 */
export const CreatedSession = 'created session'

/**
 * A client is joining an existing joinable Session
 */
export const JoinSession = 'join session'

/**
 * The server successfully added the client to the session
 */
export const JoinSessionSuccess = 'join success'

/**
 * The server could not add the client to the session
 */
export const JoinSessionFailed = 'join failed'

/**
 * A user is being removed from a Session by the owner
 */
export const SessionKick = 'kick'

/**
 * The server could not remove the user
 */
export const SessionKickSuccess = 'kick success'

/**
 * The server could not remove the user
 */
export const SessionKickFailed = 'kick failed'

/**
 * Owner is starting session
 */
export const StartSession = 'start session'

/**
 * A Session has started
 */
export const SessionStarted = 'session started'

/**
 * A Session failed to start
 */
export const SessionStartFailed = 'session start failed'

/**
 * Owner is ending session
 */
export const EndSession = 'end session'

/**
 * Session has ended
 */
export const SessionEnded = 'session ended'

/**
 * A Session failed to end
 */
export const SessionEndFailed = 'session end failed'

/**
 * A user disconnected from the Session
 */
export const UserDisconnected = 'user disconnected'

/**
 * The Session owner is ending a Question. The client
 * implementation can decide how to end questions, but
 * this message should be used.
 */
export const EndQuestion = 'end question'

export const EndQuestionFailed = 'end question failed'
export const EndQuestionSuccess = 'ended question'

/**
 * The Session owner has ended a Question. Clients that
 * joined a Session can handle this in any desired way,
 * as NextQuestion is sent to start the next question.
 * Nothing happens between the two events that clients
 * need to handle specifically.
 */
export const QuestionEnded = 'question ended'

/**
 * A Session owner is pushing the next question to users
 */
export const NextQuestion = 'next question'

/**
 * Failed to push the next question. Might be because there
 * are no more questions, or there is no such session.
 */
export const NextQuestionFailed = 'next question failed'

/**
 * A Session owner is adding a question
 */
export const AddQuestion = 'add question'

/**
 * The question sent could not be added to the Quiz
 */
export const AddQuestionFailed = 'add question failed'

/**
 * The question was successfully added to the Quiz
 */
export const AddQuestionSuccess = 'add question success'

/**
 * User is responding to a question
 */
export const QuestionResponse = 'question response'

/**
 * User failed to add Response
 */
export const QuestionResponseFailed = 'question response failed'

/**
 * User successfully added Response
 */
export const QuestionResponseSuccess = 'question response success'

/**
 * Server notifying the Session owner that user submitted a Response
 * successfully
 */
export const QuestionResponseAdded = 'question response added'
