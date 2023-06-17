// eslint-disable-next-line @typescript-eslint/no-var-requires
const { defaults } = require('jest-config')

module.exports = {
  ...defaults,
  rootDir: process.cwd(),
  modulePathIgnorePatterns: ['<rootDir>/.history'],
  // tell jest where to resolve third-party modules
  moduleDirectories: [
    '<rootDir>/dist/node_modules',
    ...defaults.moduleDirectories
  ],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^scheduler$': '<rootDir>/node_modules/scheduler/unstable_mock.js'
  },
  fakeTimers: {
    enableGlobally: true,
    legacyFakeTimers: true
  },
  setupFilesAfterEnv: ['./scripts/jest/setupJest.js']
}
