import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.ts', '!**/node_modules/**', '!**/index.ts', '!main.ts', '!**/*.module.ts'],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@database/(.*)$': '<rootDir>/database/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@adapters/(.*)$': '<rootDir>/adapters/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
  },
};

export default config;
