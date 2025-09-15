#!/usr/bin/env node
/**
 * build-all.js - Build script for all runtimes
 * Cross-platform build script that works on Windows, macOS, and Linux
 */

import { stat } from "node:fs/promises";
import { platform, arch } from "node:os";
import {
  logSection,
  logSuccess,
  logError,
  logWarning,
  logInfo,
  runCommandStream,
  commandExists,
  exists,
} from "./utils.js";

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
  logSection("Building cross-runtime printer library");

  let buildSuccess = true;

  // Build for Node.js (N-API only) - requires npm/napi-cli
  const npxExists = await commandExists("npx");
  const packageJsonExists = await fileExists("package.json");

  if (npxExists && packageJsonExists) {
    logInfo("Building N-API library for all runtimes...");

    // Install dependencies if needed
    const nodeModulesExists = await directoryExists("node_modules");
    if (!nodeModulesExists) {
      logInfo("Installing Node.js dependencies...");
      try {
        await runCommandStream("npm", ["install"]);
      } catch (error) {
        logError("Failed to install Node.js dependencies");
        console.error(error);
        buildSuccess = false;
      }
    }

    if (buildSuccess || nodeModulesExists) {
      // Build with napi-rs CLI directly (show output for debugging)
      try {
        await runCommandStream("node", ["scripts/build-napi.js", "--release"]);
        logSuccess("N-API library built successfully");
      } catch (error) {
        logError("N-API library build failed");
        logInfo("Note: N-API build requires Node.js and @napi-rs/cli");
        console.error(error);
        buildSuccess = false;
      }
    }
  } else {
    logWarning(
      "Skipping N-API build (Node.js/npm not available or package.json missing)"
    );
  }

  console.log();

  if (buildSuccess) {
    logSuccess("Build complete!");
  } else {
    logError("Build completed with errors!");
  }

  console.log();
  logInfo("Available libraries:");

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
