// eslint-disable-next-line @typescript-eslint/no-var-requires
const { defaults } = require('jest-config')

module.exports = {
  ...defaults,
  rootDir: process.cwd(),
  modulePathIgnorePatterns: ['<rootDir>/.history'],
  // tell jest where to resolve third-party modules
  moduleDirectories: ['dist/node_modules', ...defaults.moduleDirectories],
  testEnvironment: 'jsdom'
}
