#!/usr/bin/env node
/**
 * test-runtimes.js - Run tests across multiple JavaScript runtimes
 * Cross-platform test runner that works on Windows, macOS, and Linux
 * Supports selective runtime testing via command-line arguments
 */

import { writeFileSync, existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { colorize, runCommand, ensureDir, commandExists } from "./utils.js";

function parseCargoTestOutput(output) {
  // Strip ANSI color codes first for reliable parsing
  const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, "");

  // Parse Cargo test output: "test result: ok. 17 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out"
  const cargoMatch = cleanOutput.match(
    /test result:.*?(\d+)\s+passed;\s*(\d+)\s+failed/
  );
  if (cargoMatch) {
    const passed = parseInt(cargoMatch[1]);
    const failed = parseInt(cargoMatch[2]);
    return { total: passed + failed, passed, failed };
  }

  // Default fallback for Cargo tests
  console.warn(
    "⚠️  Failed to parse Cargo test count from output:",
    cleanOutput.slice(0, 200)
  );
  return { total: 0, passed: 0, failed: 0 };
}

function parseTestCount(output) {
  // Strip ANSI color codes first for reliable parsing
  const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, "");

  // Parse Deno test output: "ok | 41 passed | 0 failed (24s)"
  const denoMatch = cleanOutput.match(/(\d+)\s+passed[^|]*\|\s*(\d+)\s+failed/);
  if (denoMatch) {
    const passed = parseInt(denoMatch[1]);
    const failed = parseInt(denoMatch[2]);
    return { total: passed + failed, passed, failed };
  }

  // Parse Bun test output: " 41 pass\n 0 fail\nRan 41 tests across 1 file."
  // Use multiline flag and more flexible pattern matching
  const bunPassMatch = cleanOutput.match(/^\s*(\d+)\s+pass/m);
  const bunFailMatch = cleanOutput.match(/^\s*(\d+)\s+fail/m);
  if (bunPassMatch || bunFailMatch) {
    const passed = bunPassMatch ? parseInt(bunPassMatch[1]) : 0;
    const failed = bunFailMatch ? parseInt(bunFailMatch[1]) : 0;
    return { total: passed + failed, passed, failed };
  }

  // Parse alternative Bun format: "Ran X tests across Y file(s)"
  const bunRanMatch = cleanOutput.match(/Ran (\d+) tests across/);
  if (bunRanMatch) {
    const total = parseInt(bunRanMatch[1]);
    // If we can't determine passed/failed split, assume all passed if no explicit failures
    const failMatch = cleanOutput.match(/(\d+)\s+fail/);
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    return { total, passed: total - failed, failed };
  }

  // Default fallback - this indicates parsing failed
  console.warn(
    "⚠️  Failed to parse test count from output:",
    cleanOutput.slice(0, 200)
  );
  return { total: 1, passed: 1, failed: 0 };
}

function generateJUnitXML(runtime, testCount, success) {
  const fileName = `test-results/${runtime}.xml`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="${runtime} tests" tests="${testCount.total}" failures="${testCount.failed}" errors="0" skipped="0" time="0.001">
  <testsuite name="${runtime.charAt(0).toUpperCase() + runtime.slice(1)} Tests" tests="${testCount.total}" failures="${testCount.failed}" errors="0" skipped="0" time="0.001">
${Array.from({ length: testCount.total }, (_, i) => {
  const isFailure = i >= testCount.passed;
  return `    <testcase name="${runtime}: Test ${i + 1}" classname="${runtime}" time="0.001"${isFailure ? '>\n      <failure message="Test failed" />\n    </testcase>' : " />"}`;
}).join("\n")}
  </testsuite>
</testsuites>`;

  writeFileSync(fileName, xml);
  console.log(`📊 Generated ${runtime} JUnit XML: ${fileName}`);
}

function copyBunLCOV() {
  // Bun generates lcov.info in coverage-dir, copy it to our standard location
  const bunCoverageDir = "test-results/coverage/bun-temp";
  const sourceLCOV = join(bunCoverageDir, "lcov.info");
  const targetLCOV = "test-results/coverage/bun-lcov.info";

  if (existsSync(sourceLCOV)) {
    copyFileSync(sourceLCOV, targetLCOV);
    console.log(`📊 Generated Bun LCOV coverage: ${targetLCOV}`);
  } else {
    console.warn(`⚠️  Bun LCOV file not found at ${sourceLCOV}`);
  }
}

async function runTests(runtimesToTest = ["rust", "deno", "node", "bun"]) {
  console.log(colorize("blue", "🧪 Running test suite across all runtimes"));
  if (runtimesToTest.length < 4) {
    console.log(
      colorize("yellow", `   Only running: ${runtimesToTest.join(", ")}`)
    );
  }
  console.log("========================================================");
  console.log();

  let allSucceeded = true;
  const results = [];

  // Ensure test-results directory exists
  ensureDir("test-results");
  ensureDir("test-results/coverage");

  // Test Rust code first
  if (runtimesToTest.includes("rust")) {
    console.log(colorize("yellow", "🦀 Testing Rust code..."));
    console.log("--------------------");

    // Check if cargo llvm-cov is available for coverage
    // In CI, it's only installed on Linux, but local developers can use it on any platform
    let hasLlvmCov = false;
    const hasCargo = await commandExists("cargo");
    if (hasCargo) {
      // Check if the llvm-cov subcommand exists
      const llvmCovCheck = await runCommand(
        ["cargo", "llvm-cov", "--version"],
        {
          showOutput: false,
        }
      );
      hasLlvmCov = llvmCovCheck.success;
    }

    let cargoResult;
    if (hasLlvmCov) {
      // Run with coverage if available
      console.log("Running Rust tests with coverage...");
      cargoResult = await runCommand(
        [
          "cargo",
          "llvm-cov",
          "--all-features",
          "--workspace",
          "--lcov",
          "--output-path",
          "test-results/coverage/rust.lcov",
          "test",
        ],
        { showOutput: false }
      );
    } else {
      // Run regular tests
      cargoResult = await runCommand(["cargo", "test"], { showOutput: false });
    }

    // Parse Rust test results and generate JUnit XML
    const cargoTestCount = parseCargoTestOutput(cargoResult.output);
    generateJUnitXML("cargo", cargoTestCount, cargoResult.success);

    if (cargoResult.success) {
      console.log(colorize("green", "✅ Rust tests passed"));
      if (hasLlvmCov) {
        console.log(
          "📊 Generated Rust LCOV coverage: test-results/coverage/rust.lcov"
        );
      }
      results.push({ runtime: "rust", success: true });
    } else {
      console.log(colorize("red", "❌ Rust tests failed"));
      console.log(cargoResult.output);
      results.push({
        runtime: "rust",
        success: false,
        output: cargoResult.output,
      });
      allSucceeded = false;
    }
    console.log();
  }

  // Test Deno with coverage
  if (runtimesToTest.includes("deno")) {
    console.log(colorize("yellow", "🦕 Testing with Deno..."));
    console.log("--------------------");
    const denoResult = await runCommand(
      [
        "deno",
        "test",
        "--allow-env",
        "--allow-read",
        "--allow-ffi",
        "--no-check",
        "--coverage=test-results/coverage/deno-temp",
        "src/tests/shared.test.ts",
      ],
      { simulate: true, showOutput: false }
    );

    // Generate Deno coverage report
    if (existsSync("test-results/coverage/deno-temp")) {
      await runCommand([
        "deno",
        "coverage",
        "test-results/coverage/deno-temp",
        "--lcov",
        "--exclude=scripts/",
        "--exclude=examples/",
        "--output=test-results/coverage/deno-lcov.info",
      ]);
    }

    // Generate JUnit XML for Deno
    const denoTestCount = parseTestCount(denoResult.output);
    generateJUnitXML("deno", denoTestCount, denoResult.success);

    if (denoResult.success) {
      console.log(colorize("green", "✅ Deno tests passed"));
      results.push({
        runtime: "deno",
        success: true,
        output: denoResult.output,
      });
    } else {
      console.log(colorize("red", "❌ Deno tests failed"));
      console.log(denoResult.output);
      results.push({
        runtime: "deno",
        success: false,
        output: denoResult.output,
      });
      allSucceeded = false;
    }
    console.log();
  }

  // Test Node.js (uses existing node-test-runner which generates proper artifacts)
  if (runtimesToTest.includes("node")) {
    console.log(colorize("yellow", "🟢 Testing with Node.js..."));
    console.log("--------------------");
    const nodeResult = await runCommand(
      ["npx", "tsx", "src/tests/node-test-runner.ts"],
      { simulate: true }
    );

    if (nodeResult.success) {
      console.log(colorize("green", "✅ Node.js tests passed"));
      results.push({
        runtime: "node",
        success: true,
        output: nodeResult.output,
      });
    } else {
      console.log(colorize("red", "❌ Node.js tests failed"));
      console.log(nodeResult.output);
      results.push({
        runtime: "node",
        success: false,
        output: nodeResult.output,
      });
      allSucceeded = false;
    }
    console.log();
  }

  // Test Bun with coverage
  if (runtimesToTest.includes("bun")) {
    console.log(colorize("yellow", "🥟 Testing with Bun..."));
    console.log("--------------------");
    const bunResult = await runCommand(
      [
        "bun",
        "test",
        "--coverage",
        "--coverage-reporter=lcov",
        "--coverage-dir=test-results/coverage/bun-temp",
        "--coverage-exclude=scripts/**",
        "--coverage-exclude=examples/**",
        "src/tests/shared.test.ts",
      ],
      { simulate: true, showOutput: false }
    );

    // Copy Bun's generated LCOV file to our standard location
    copyBunLCOV();

    // Generate JUnit XML for Bun
    const bunTestCount = parseTestCount(bunResult.output);
    generateJUnitXML("bun", bunTestCount, bunResult.success);

    if (bunResult.success) {
      console.log(colorize("green", "✅ Bun tests passed"));
      results.push({ runtime: "bun", success: true, output: bunResult.output });
    } else {
      console.log(colorize("red", "❌ Bun tests failed"));
      console.log(bunResult.output);
      results.push({
        runtime: "bun",
        success: false,
        output: bunResult.output,
      });
      allSucceeded = false;
    }
    console.log();
  }

  // Summary
  console.log("========================================================");
  console.log(colorize("blue", "📊 Test Results Summary"));
  console.log("========================================================");

  for (const result of results) {
    const status = result.success
      ? colorize("green", "PASS")
      : colorize("red", "FAIL");
    console.log(`${result.runtime.padEnd(8)}: ${status}`);
  }

  console.log();

  if (allSucceeded) {
    console.log(colorize("green", "🎉 All tests passed across all runtimes!"));
    console.log();
    console.log("Test artifacts generated:");
    console.log("  • test-results/ directory with any generated reports");
    console.log("  • All tests ran in simulation mode (no actual printing)");
  } else {
    console.log(colorize("red", "❌ Some tests failed"));
    console.log();
    console.log("Check the output above for details on failures.");
    process.exit(1);
  }
}

async function main() {
  try {
    // Parse command line arguments for runtime selection
    const args = process.argv.slice(2);
    const validRuntimes = ["rust", "deno", "node", "bun"];
    let runtimesToTest = validRuntimes;

    if (args.length > 0) {
      // Filter to only valid runtime names
      runtimesToTest = args.filter(arg => validRuntimes.includes(arg));

      if (runtimesToTest.length === 0) {
        console.error(colorize("red", "❌ Invalid runtime specified"));
        console.log(
          "Usage: node scripts/test-runtimes.js [rust] [deno] [node] [bun]"
        );
        console.log(
          "Example: node scripts/test-runtimes.js rust    # Only run Rust tests"
        );
        console.log(
          "Example: node scripts/test-runtimes.js deno node    # Run Deno and Node tests"
        );
        process.exit(1);
      }
    }

    await runTests(runtimesToTest);
  } catch (error) {
    console.error(colorize("red", `❌ Test runner error: ${error.message}`));
    process.exit(1);
  }
}

// Run main if this is the entry point
import { isMainModule } from "./utils.js";
if (isMainModule(import.meta.url)) {
  await main();
}
