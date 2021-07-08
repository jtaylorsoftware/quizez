/**
 * A client is starting a new joinable Session
 */
export const SessionStart = 'start session'
export type SessionStartArgs = never

/**
 * The server successfully created a new Session and is responding
 * to the requesting client
 */
export const SessionCreated = 'created session'
export interface SessionCreatedArgs {
  /**
   * The generated id of the session
   */
  id: string
}

/**
 * A client is joining an existing joinable Session
 */
export const SessionJoin = 'join session'
export interface SessionJoinArgs {
  /**
   * The generated id of the session
   */
  id: string

  /**
   * Client's requested name
   */
  name: string
}

/**
 * The server successfully added the client to the session
 */
export const SessionJoinSuccess = 'join session success'
export type SessionJoinSuccessArgs = never

/**
 * The server could not add the client to the session
 */
export const SessionJoinFailed = 'join session failed'
export type SessionJoinFailedArgs = never
