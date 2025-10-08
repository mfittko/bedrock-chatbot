export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['lib/**/*.js', '!lib/**/*.test.js', '!**/node_modules/**'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 30,
      lines: 25,
      statements: 25,
    },
  },
}
