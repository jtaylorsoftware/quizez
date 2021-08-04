import { customAlphabet } from 'nanoid'
import { Map } from 'immutable'
import { Quiz } from './quiz'
import { User } from './user'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8)

/**
 * Represents a classroom/quiz session
 */
export class Session {
  readonly id: string = nanoid()

  private _quiz: Quiz = new Quiz()
  /**
   * Gets the Quiz or a copy of the Quiz if Session has ended
   */
  get quiz(): Quiz {
    if (this.hasEnded) {
      return this._quiz.clone()
    }
    return this._quiz
  }

  /**
   * Map of users keyed on user.name
   */
  private users = Map<string, User>()

  /**
   * Map of users keyed on user.id
   */
  private usersById = Map<string, User>()

  private _isStarted: boolean = false
  public get isStarted(): boolean {
    return this._isStarted
  }

  private _hasEnded: boolean = false
  public get hasEnded(): boolean {
    return this._hasEnded
  }

  constructor(readonly owner: string) {}

  /**
   * Finds a User in the Session by name
   * @param name name of User to lookup
   * @returns the User if found, or undefined
   */
  findUserByName(name: string): User | undefined {
    return this.users.get(name)
  }

  /**
   * Finds a User in the Session by id
   * @param id id of User to lookup
   * @returns the User if found, or undefined
   */
  findUserById(id: string): User | undefined {
    return this.usersById.get(id)
  }

  /**
   * Adds a user to the Session
   * @param user User joining
   * @returns true if user is added successfully
   */
  addUser(user: User): boolean {
    if (
      user.id === this.owner ||
      this.isStarted ||
      this.hasEnded ||
      this.users.has(user.name)
    ) {
      return false
    }
    this.users = this.users.set(user.name, user)
    this.usersById = this.users.set(user.id, user)
    return true
  }

  /**
   * Removes a user from the Session by name
   * @param name Name of the user to remove
   * @returns the removed User
   */
  removeUser(name: string): User | undefined {
    const user = this.users.get(name)
    if (user != null && !this.hasEnded) {
      this.users = this.users.delete(user.name)
      this.usersById = this.usersById.delete(user.id)
      return user
    }
    return undefined
  }

  /**
   * Starts the Session, preventing users from joining and causing
   * questions to be pushed to users
   */
  start() {
    this._isStarted = true
  }

  /**
   * Ends the sesssion, preventing it from being used again for
   * quizzes, but it will persist until the owner disconnects
   */
  end() {
    if (this._isStarted) {
      this._hasEnded = true
      // Cleanup the current started question
      const currentQuestion = this._quiz.currentQuestion
      if (currentQuestion != null) {
        currentQuestion.end()
      }
    }
  }
}

export default Session
