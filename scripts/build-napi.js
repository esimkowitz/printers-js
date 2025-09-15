#!/usr/bin/env node

import { execSync } from "child_process";
import { arch, platform } from "process";
import { existsSync, writeFileSync, readFileSync, readdirSync } from "fs";

// Platform mapping from Node.js to NAPI-RS target names
function getPlatformTarget() {
  // Map to NAPI-RS standard target names that match package.json targets
  switch (platform) {
    case "darwin":
      switch (arch) {
        case "x64":
          return "x86_64-apple-darwin";
        case "arm64":
          return "aarch64-apple-darwin";
        default:
          throw new Error(`Unsupported architecture for Darwin: ${arch}`);
      }
    case "win32":
      switch (arch) {
        case "x64":
          return "x86_64-pc-windows-msvc";
        case "arm64":
          return "aarch64-pc-windows-msvc";
        default:
          throw new Error(`Unsupported architecture for Windows: ${arch}`);
      }
    case "linux":
      switch (arch) {
        case "x64":
          return "x86_64-unknown-linux-gnu";
        case "arm64":
          return "aarch64-unknown-linux-gnu";
        default:
          throw new Error(`Unsupported architecture for Linux: ${arch}`);
      }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const isRelease = args.includes("--release") || args.includes("-r");
  const platformTarget = getPlatformTarget();

  console.log(`Building for platform: ${platformTarget}`);
  console.log(`Node platform: ${platform}, arch: ${arch}`);
  console.log(`Environment check:`);
  console.log(`- NODE_VERSION: ${process.version}`);
  console.log(
    `- PATH includes: ${process.env.PATH?.split(
      platform === "win32" ? ";" : ":"
    )
      .slice(0, 5)
      .join(", ")}...`
  );

  // Diagnostic: Check what tools are available
  console.log("Checking available build tools...");
  const toolsToCheck = ["node", "npm", "npx", "cargo", "rustc"];
  for (const tool of toolsToCheck) {
    try {
      const versionCommand =
        platform === "win32" ? `where ${tool}` : `which ${tool}`;
      execSync(versionCommand, { stdio: "pipe" });
      console.log(`✓ ${tool} is available`);
    } catch {
      console.log(`✗ ${tool} is NOT available`);
    }
  }

  // Try NAPI build approach
  console.log("Building with NAPI CLI...");

  try {
    // First, create npm directories
    console.log("Creating npm directory structure...");
    execSync("npx napi create-npm-dirs", {
      stdio: "inherit",
      env: process.env,
      shell: platform === "win32" ? true : false,
    });

    // Use napi build command with platform specification
    const buildArgs = ["napi", "build", "--platform"];
    if (isRelease) buildArgs.push("--release");

    const buildCommand = buildArgs.join(" ");
    console.log(`Executing: npx ${buildCommand}`);

    execSync(`npx ${buildCommand}`, {
      stdio: "inherit",
      env: process.env,
      shell: platform === "win32" ? true : false,
    });

    console.log(`✅ NAPI build completed`);
  } catch (error) {
    console.error("NAPI build failed:", error);
    console.error("Error message:", error.message);
    console.error("Platform:", platform, "Arch:", arch);
    console.error("Target:", platformTarget);
    process.exit(1);
  }

  // Map platform target to NPM directory names
  const npmPlatformMap = {
    "x86_64-apple-darwin": "darwin-x64",
    "aarch64-apple-darwin": "darwin-arm64",
    "x86_64-pc-windows-msvc": "win32-x64-msvc",
    "aarch64-pc-windows-msvc": "win32-arm64-msvc",
    "x86_64-unknown-linux-gnu": "linux-x64-gnu",
    "aarch64-unknown-linux-gnu": "linux-arm64-gnu",
  };

  const npmPlatform = npmPlatformMap[platformTarget];
  if (!npmPlatform) {
    console.error(`Unknown platform mapping for ${platformTarget}`);
    process.exit(1);
  }

  // Try to run post-build cleanup if output directory exists
  const outputDir = `npm/${npmPlatform}`;
  console.log(`Checking for output directory: ${outputDir}`);

  if (existsSync(outputDir)) {
    // List contents to verify the build output
    const files = readdirSync(outputDir);
    console.log(`Files in ${outputDir}:`, files);

    // Check if .node file exists
    const nodeFile = files.find(f => f.endsWith(".node"));
    if (!nodeFile) {
      console.error(`ERROR: No .node file found in ${outputDir}`);
      console.error(`Build may have failed to produce output`);
      process.exit(1);
    }
    console.log(`✅ Found N-API binary: ${nodeFile}`);

    try {
      const removeEnvCommand = `node scripts/remove-env-check.js --dir ${outputDir}`;
      console.log(`Running post-build script: ${removeEnvCommand}`);
      execSync(removeEnvCommand, {
        stdio: "inherit",
        env: process.env,
        shell: platform === "win32" ? true : false,
      });
    } catch (error) {
      console.warn("Post-build script failed (non-fatal):", error.message);
    }
  } else {
    console.error(
      `ERROR: Output directory ${outputDir} not found after build!`
    );
    console.error("The N-API build did not create the expected output");

    // Try to find where the output actually went
    console.log("Checking for .node files in project...");
    try {
      const findCommand =
        platform === "win32"
          ? `dir /s /b *.node`
          : `find . -name "*.node" -type f`;
      const output = execSync(findCommand, { encoding: "utf8" });
      console.log("Found .node files at:", output);
    } catch (e) {
      console.log("Could not search for .node files");
    }

    process.exit(1);
  }

  console.log(`✅ Build process completed for ${platformTarget}`);
}

// Run main function if this script is executed directly
main();
