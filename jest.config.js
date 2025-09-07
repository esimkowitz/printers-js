module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.jest.js"],
  collectCoverageFrom: [
    "node.js",
    "!node_modules/**",
    "!coverage/**",
  ],
  coverageDirectory: "./test-results/coverage/node",
  coverageReporters: ["lcov", "text"],
  reporters: [
    "default",
    ["jest-junit", {
      outputDirectory: "./test-results",
      outputName: "node-test-results.xml",
      suiteName: "Node.js Printers Tests",
    }],
  ],
  setupFiles: ["<rootDir>/tests/jest.setup.js"],
};
