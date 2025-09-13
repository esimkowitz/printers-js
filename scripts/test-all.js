#!/usr/bin/env node
/**
 * test-all.js - Run all tests using each runtime's built-in test runner
 * Cross-platform test runner that works on Windows, macOS, and Linux
 */

import { spawn } from "node:child_process";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Colors for output
const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  blue: "\x1b[0;34m",
  reset: "\x1b[0m", // No Color
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

async function runCommand(command, options = {}) {
  return new Promise(resolve => {
    try {
      const [cmd, ...args] = command;
      const child = spawn(cmd, args, {
        cwd: options.cwd,
        env: {
          ...process.env,
          PRINTERS_JS_SIMULATE: "true", // Always run in simulation mode
          ...options.env,
        },
        stdio: ["inherit", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", data => {
        stdout += data.toString();
      });

      child.stderr?.on("data", data => {
        stderr += data.toString();
      });

      child.on("close", code => {
        resolve({
          success: code === 0,
          output: stdout + stderr,
        });
      });

      child.on("error", error => {
        resolve({
          success: false,
          output: `Command failed: ${error.message}`,
        });
      });
    } catch (error) {
      resolve({
        success: false,
        output: `Command failed: ${error.message}`,
      });
    }
  });
}

async function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

async function runTests() {
  console.log(
    colorize("blue", "🧪 Running comprehensive test suite across all runtimes")
  );
  console.log("========================================================");
  console.log();

  let allSucceeded = true;
  const results = [];

  // Ensure test-results directory exists
  await ensureDir("test-results");

  // Test Deno
  console.log(colorize("yellow", "🦕 Testing with Deno..."));
  console.log("--------------------");
  const denoResult = await runCommand([
    "deno",
    "test",
    "--allow-env",
    "--allow-read",
    "--no-check",
    "src/tests/shared.test.ts",
  ]);

  if (denoResult.success) {
    console.log(colorize("green", "✅ Deno tests passed"));
    results.push({ runtime: "deno", success: true, output: denoResult.output });
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

  // Test Node.js
  console.log(colorize("yellow", "🟢 Testing with Node.js..."));
  console.log("--------------------");
  const nodeResult = await runCommand([
    "npx",
    "tsx",
    "src/tests/node-test-runner.ts",
  ]);

  if (nodeResult.success) {
    console.log(colorize("green", "✅ Node.js tests passed"));
    results.push({ runtime: "node", success: true, output: nodeResult.output });
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

  // Test Bun
  console.log(colorize("yellow", "🥟 Testing with Bun..."));
  console.log("--------------------");
  const bunResult = await runCommand([
    "bun",
    "test",
    "src/tests/shared.test.ts",
  ]);

  if (bunResult.success) {
    console.log(colorize("green", "✅ Bun tests passed"));
    results.push({ runtime: "bun", success: true, output: bunResult.output });
  } else {
    console.log(colorize("red", "❌ Bun tests failed"));
    console.log(bunResult.output);
    results.push({ runtime: "bun", success: false, output: bunResult.output });
    allSucceeded = false;
  }
  console.log();

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
    await runTests();
  } catch (error) {
    console.error(colorize("red", `❌ Test runner error: ${error.message}`));
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
