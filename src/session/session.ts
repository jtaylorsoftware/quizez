import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8)

export class Session {
  readonly id: string = nanoid()

  constructor(readonly owner: string) {}
}
