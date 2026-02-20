/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/e2e/', '<rootDir>/backend/'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.routes.ts',
    '!src/main.ts',
    '!src/app/app.config.ts',
    '!src/app/core/interceptors/mock.interceptor.ts',
    '!src/app/core/services/mock-api.service.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'src/app/core/services/*.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/app/core/guards/*.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  moduleNameMapper: {
    '@core/(.*)': '<rootDir>/src/app/core/$1',
    '@shared/(.*)': '<rootDir>/src/app/shared/$1',
    '@features/(.*)': '<rootDir>/src/app/features/$1',
    '@env': '<rootDir>/src/environments/environment',
  },
  testMatch: ['**/*.spec.ts'],
};

