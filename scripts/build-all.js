#!/usr/bin/env node
/**
 * build-all.js - Build script for all runtimes
 * Cross-platform build script that works on Windows, macOS, and Linux
 */

import { platform, arch } from "node:os";
import {
  colorize,
  runCommand,
  commandExists,
  fileExists,
  directoryExists,
} from "./utils.js";

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

// Run main if this is the entry point
import { isMainModule } from "./utils.js";
if (isMainModule(import.meta.url)) {
  await main();
}
