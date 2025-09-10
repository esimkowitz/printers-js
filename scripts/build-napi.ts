#!/usr/bin/env npx tsx

import { execSync } from "child_process";
import { arch, platform } from "process";

// Platform mapping from Node.js to NAPI-RS naming
function getPlatformTarget(): string {
  let platformName: string;
  let archName: string;

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

  // Create npm directories if they don't exist (let napi build handle this)
  // Note: napi build with --output-dir should create the directory structure

  // Build with direct output to npm directory
  const outputDir = `npm/${platformTarget}`;
  const releaseFlag = isRelease ? "--release" : "";
  const buildCommand =
    `napi build --platform --features napi --esm ${releaseFlag} --output-dir ${outputDir}`
      .trim();

  console.log(`Running: ${buildCommand}`);

  try {
    execSync(buildCommand, { stdio: "inherit" });
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }

  // Remove NAPI_RS_NATIVE_LIBRARY_PATH check
  try {
    execSync(`npx tsx scripts/remove-env-check.ts --dir ${outputDir}`, {
      stdio: "inherit",
    });
  } catch (error) {
    console.error("Failed to remove env check:", error);
    process.exit(1);
  }

  console.log(`✅ Build completed for ${platformTarget}`);
}

// Run main function if this script is executed directly
main();
