#!/usr/bin/env node
/**
 * build-all.js - Build script for all runtimes
 * Cross-platform build script that works on Windows, macOS, and Linux
 */

import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { platform, arch } from "node:os";

// Colors for output
const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  reset: "\x1b[0m", // No Color
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

async function runCommand(command, options = {}) {
  return new Promise(resolve => {
    try {
      const [cmd, ...args] = command;
      const showOutput = options.showOutput !== false; // Default to showing output
      const child = spawn(cmd, args, {
        cwd: options.cwd,
        env: {
          ...process.env,
          ...options.env,
        },
        stdio: showOutput ? "inherit" : ["inherit", "pipe", "pipe"],
      });

      if (!showOutput) {
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
      } else {
        child.on("close", code => {
          resolve({
            success: code === 0,
            output: "",
          });
        });

        child.on("error", error => {
          resolve({
            success: false,
            output: `Command failed: ${error.message}`,
          });
        });
      }
    } catch (error) {
      resolve({
        success: false,
        output: `Command failed: ${error.message}`,
      });
    }
  });
}

async function commandExists(command) {
  const result = await runCommand([command, "--version"], {
    showOutput: false,
  });
  return result.success;
}

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function directoryExists(path) {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function main() {
  console.log("Building cross-runtime printer library...");
  console.log();

  let buildSuccess = true;

  // Build for Node.js (N-API only) - requires npm/napi-cli
  const npxExists = await commandExists("npx");
  const packageJsonExists = await fileExists("package.json");

  if (npxExists && packageJsonExists) {
    console.log(
      colorize("yellow", "Building N-API library for all runtimes...")
    );

    // Install dependencies if needed
    const nodeModulesExists = await directoryExists("node_modules");
    if (!nodeModulesExists) {
      console.log("Installing Node.js dependencies...");
      const installResult = await runCommand(["npm", "install"], {
        showOutput: false,
      });
      if (!installResult.success) {
        console.log(colorize("red", "Failed to install Node.js dependencies"));
        console.log(installResult.output);
        buildSuccess = false;
      }
    }

    if (buildSuccess || nodeModulesExists) {
      // Build with napi-rs CLI directly (show output for debugging)
      const napiResult = await runCommand([
        "node",
        "scripts/build-napi.js",
        "--release",
      ]);

      if (napiResult.success) {
        console.log(colorize("green", "✓ N-API library built successfully"));
      } else {
        console.log(colorize("red", "✗ N-API library build failed"));
        console.log("Note: N-API build requires Node.js and @napi-rs/cli");
        if (napiResult.output) {
          console.log(napiResult.output);
        }
        buildSuccess = false;
      }
    }
  } else {
    console.log(
      colorize(
        "yellow",
        "Skipping N-API build (Node.js/npm not available or package.json missing)"
      )
    );
  }

  console.log();

  if (buildSuccess) {
    console.log(colorize("green", "Build complete!"));
  } else {
    console.log(colorize("red", "Build completed with errors!"));
  }

  console.log();
  console.log("Available libraries:");

  // Show N-API library files for all platforms
  const currentPlatform = platform();
  const currentArch = arch();

  console.log("  - npm/**/*.node (N-API modules for all supported platforms)");
  console.log(`  - Current platform: ${currentPlatform}-${currentArch}`);

  if (!buildSuccess) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
