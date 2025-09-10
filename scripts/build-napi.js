#!/usr/bin/env node

import { execSync } from "child_process";
import { arch, platform } from "process";
import { existsSync, writeFileSync, readFileSync } from "fs";

// Platform mapping from Node.js to NAPI-RS naming
function getPlatformTarget() {
  let platformName;
  let archName;

  // Map platform
  switch (platform) {
    case "darwin":
      platformName = "darwin";
      break;
    case "win32":
      platformName = "win32";
      break;
    case "linux":
      platformName = "linux";
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  // Map architecture
  switch (arch) {
    case "x64":
      archName = platformName === "win32"
        ? "x64-msvc"
        : (platformName === "linux" ? "x64-gnu" : "x64");
      break;
    case "arm64":
      archName = platformName === "win32"
        ? "arm64-msvc"
        : (platformName === "linux" ? "arm64-gnu" : "arm64");
      break;
    default:
      throw new Error(`Unsupported architecture: ${arch}`);
  }

  return `${platformName}-${archName}`;
}

function main() {
  const args = process.argv.slice(2);
  const isRelease = args.includes("--release") || args.includes("-r");
  const platformTarget = getPlatformTarget();

  console.log(`Building for platform: ${platformTarget}`);

  // Build with modern NAPI-RS using proper flags
  const outputDir = `npm/${platformTarget}`;

  // Try using direct napi command instead of npx
  const napiArgs = ["build", "--platform", "--features", "napi", "--esm"];
  if (isRelease) napiArgs.push("--release");
  napiArgs.push("--output-dir", outputDir);

  console.log(`Running: napi ${napiArgs.join(" ")}`);

  try {
    execSync(`npx napi ${napiArgs.join(" ")}`, {
      stdio: "inherit",
      env: process.env,
    });
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }

  // Remove NAPI_RS_NATIVE_LIBRARY_PATH check
  try {
    execSync(`node scripts/remove-env-check.js --dir ${outputDir}`, {
      stdio: "inherit",
      env: process.env,
    });
  } catch (error) {
    console.error("Failed to remove env check:", error);
    process.exit(1);
  }

  console.log(`✅ Build completed for ${platformTarget}`);
}

// Run main function if this script is executed directly
main();
