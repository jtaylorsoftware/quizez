import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  moduleFileExtensions: ['ts', 'js'],
  modulePaths: ['<rootDir>', '<rootDir>/src'],
  roots: ['<rootDir>/tests'],
  testMatch: ['**/tests/**/*.+(ts|tsx|js)'],
  testPathIgnorePatterns: ['<rootDir>/build', '<rootDir>/src'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
}

export default config
