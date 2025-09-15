#!/usr/bin/env node
/**
 * Node.js test runner for TypeScript tests
 * Uses c8 for coverage and tsx for TypeScript support
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync, cpSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

interface TestResults {
  total: number;
  passed: number;
  failed: number;
}

// Parse Node.js test output to detect actual failures
function parseNodeTestOutput(output: string): TestResults {
  // Parse TAP output for basic counts
  const tapTestsMatch = output.match(/# tests (\d+)/);
  const tapPassMatch = output.match(/# pass (\d+)/);
  const tapFailMatch = output.match(/# fail (\d+)/);

  const total = tapTestsMatch ? parseInt(tapTestsMatch[1]) : 0;
  let passed = tapPassMatch ? parseInt(tapPassMatch[1]) : 0;
  let failed = tapFailMatch ? parseInt(tapFailMatch[1]) : 0;

  // Check for unhandled rejections that indicate test failures
  // These show up as errors but @cross/test doesn't count them as failures
  const unhandledRejections = output.match(/unhandledRejection event/g);
  const rejectionCount = unhandledRejections ? unhandledRejections.length : 0;

  // If we have unhandled rejections, adjust the counts
  if (rejectionCount > 0) {
    failed += rejectionCount;
    passed = Math.max(0, passed - rejectionCount);
  }

  return { total, passed, failed };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "../..");

// Set simulation mode
process.env.PRINTERS_JS_SIMULATE = "true";
process.env.FORCE_NODE_RUNTIME = "true";

async function runTests() {
  console.log("Running Node.js tests...");
  console.log("========================");

  try {
    // Create test results directories
    mkdirSync("test-results/coverage/node-temp", { recursive: true });

    // Run tests with c8 coverage using tsx for TypeScript support
    let testsPassed = false;
    let testResults = { total: 0, passed: 0, failed: 0 };

    try {
      console.log("Running tests with c8 coverage...");

      // Run the shared test suite with c8 coverage and capture output
      const result = execSync(
        "npx c8 --reporter=lcov --reporter=text --temp-directory=test-results/coverage/node-temp --report-dir=test-results/coverage/node npx tsx src/tests/shared.test.ts",
        {
          stdio: "pipe",
          env: {
            ...process.env,
            PRINTERS_JS_SIMULATE: "true",
            FORCE_NODE_RUNTIME: "true",
          },
          cwd: projectRoot,
          encoding: "utf8",
        }
      );

      // Parse TAP output and detect unhandled rejections
      testResults = parseNodeTestOutput(result);
      testsPassed = testResults.failed === 0;

      // Show the output to user
      console.log(result);
    } catch (error) {
      // Tests may fail but coverage might still be generated
      console.log(
        "Note: Some tests may have failed, but coverage was still generated"
      );

      // Try to parse output from the error if available
      if (error.stdout) {
        testResults = parseNodeTestOutput(error.stdout + (error.stderr || ""));
        console.log(error.stdout);
        if (error.stderr) console.error(error.stderr);
      }
    }

    // Always try to copy the lcov.info to node-lcov.info if it exists
    if (existsSync("test-results/coverage/node/lcov.info")) {
      cpSync(
        "test-results/coverage/node/lcov.info",
        "test-results/coverage/node-lcov.info"
      );
      console.log(
        "📊 Generated Node.js LCOV coverage report: test-results/coverage/node-lcov.info"
      );
    }

    // Generate JUnit XML report based on parsed results
    // Create test cases based on actual results
    const testCases = [];

    // Generate individual test case entries based on parsed counts
    for (let i = 1; i <= testResults.total; i++) {
      const isPassed = i <= testResults.passed;
      testCases.push({
        name: `Node.js: Test ${i}`,
        duration: 0.001,
        status: isPassed ? "passed" : "failed",
        error: isPassed
          ? undefined
          : "Test failed (detected via @cross/test output parsing)",
      });
    }

    if (testResults.total > 0) {
      const junitXML = generateJUnitXML({
        total: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        testCases,
      });

      writeFileSync("test-results/node.xml", junitXML);
      console.log(
        "📊 Generated Node.js JUnit XML report: test-results/node.xml"
      );

      console.log("\nNode.js Test Results:");
      console.log(`Total: ${testResults.total}`);
      console.log(`Passed: ${testResults.passed}`);
      console.log(`Failed: ${testResults.failed}`);

      if (testsPassed) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    } else {
      console.error("Test execution failed: No test results found");

      // Generate failure report for no results
      const junitXML = generateJUnitXML({
        total: 1,
        passed: 0,
        failed: 1,
        testCases: [
          {
            name: "Node.js: Test suite execution",
            duration: 0.001,
            status: "failed",
            error: "Test execution failed - no results found",
          },
        ],
      });

      writeFileSync("test-results/node.xml", junitXML);
      process.exit(1);
    }
  } catch (error) {
    console.error("Test runner failed:", error);
    process.exit(1);
  }
}

// Function to generate JUnit XML
function generateJUnitXML(results) {
  const totalTime = results.testCases.reduce((sum, tc) => sum + tc.duration, 0);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuites name="node test" tests="${results.total}" assertions="0" failures="${results.failed}" skipped="0" time="${totalTime.toFixed(6)}">\n`;
  xml += `  <testsuite name="Node.js Tests" file="src/tests/shared.test.ts" tests="${results.total}" assertions="0" failures="${results.failed}" skipped="0" time="${totalTime.toFixed(6)}" hostname="${process.platform}">\n`;

  for (const testCase of results.testCases) {
    xml += `    <testcase name="${testCase.name}" classname="Node.js Tests" time="${testCase.duration.toFixed(6)}" file="src/tests/shared.test.ts" line="1" assertions="0"`;

    if (testCase.status === "failed") {
      xml += `>\n`;
      xml += `      <failure message="${testCase.error}" type="AssertionError">${testCase.error}</failure>\n`;
      xml += `    </testcase>\n`;
    } else {
      xml += ` />\n`;
    }
  }

  xml += `  </testsuite>\n`;
  xml += `</testsuites>\n`;

  return xml;
}

// Run the tests
runTests().catch(console.error);
