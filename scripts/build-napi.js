#!/usr/bin/env node

import { execSync } from "child_process";
import { arch, platform } from "process";
import { existsSync, writeFileSync, readFileSync } from "fs";

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

  // Create npm directories with package.json files first
  console.log("Creating npm directory structure...");
  try {
    execSync("npx napi create-npm-dirs", {
      stdio: "inherit",
      env: process.env,
    });
  } catch (error) {
    console.error("Failed to create npm directories:", error);
    process.exit(1);
  }

  // Build with modern NAPI-RS using proper flags
  const outputDir = `npm/${platformTarget}`;

  // Build with NAPI-RS CLI
  const napiArgs = ["build", "--platform", "--esm"];
  if (isRelease) napiArgs.push("--release");
  napiArgs.push("--output-dir", outputDir);

  console.log(`Running: napi ${napiArgs.join(" ")}`);

  try {
    const command = `npx napi ${napiArgs.join(" ")}`;
    console.log(`Executing: ${command}`);
    execSync(command, {
      stdio: "inherit",
      env: process.env,
      shell: platform === "win32" ? "cmd.exe" : undefined,
    });
  } catch (error) {
    console.error("Build failed:", error);
    console.error("Error message:", error.message);
    console.error("Command:", `npx napi ${napiArgs.join(" ")}`);
    console.error("Platform:", platform, "Arch:", arch);
    console.error("Target:", platformTarget);
    process.exit(1);
  }

  // Remove NAPI_RS_NATIVE_LIBRARY_PATH check
  try {
    const removeEnvCommand = `node scripts/remove-env-check.js --dir ${outputDir}`;
    console.log(`Running post-build script: ${removeEnvCommand}`);
    execSync(removeEnvCommand, {
      stdio: "inherit",
      env: process.env,
      shell: platform === "win32" ? "cmd.exe" : undefined,
    });
  } catch (error) {
    console.error("Failed to remove env check:", error);
    console.error("Error message:", error.message);
    console.error("Output dir:", outputDir);
    process.exit(1);
  }

  console.log(`✅ Build completed for ${platformTarget}`);
}

// Run main function if this script is executed directly
main();
