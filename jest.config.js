/** @type {import("ts-jest/dist/types").InitialOptionsTsJest} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  testTimeout: 50000,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    // every .module.ts file is a module, so it's not tested directly
    '.module.ts',
    'main.ts',
  ],
};
