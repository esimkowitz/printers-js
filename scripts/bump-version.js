#!/usr/bin/env node
/**
 * Version bump utility script
 * Updates version in package.json and Cargo.toml
 *
 * Usage:
 *   node scripts/bump-version.js <type>
 *   where <type> is: major, minor, or patch
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import semver from "semver";
import { runCommand } from "./utils.js";

const BUMP_TYPES = ["major", "minor", "patch"];

function updatePackageJson(newVersion) {
  const packageJsonPath = join(process.cwd(), "package.json");
  const content = readFileSync(packageJsonPath, "utf8");
  const config = JSON.parse(content);

  config.version = newVersion;

  writeFileSync(packageJsonPath, JSON.stringify(config, null, 2) + "\n");
}

function updateCargoToml(newVersion) {
  const cargoTomlPath = join(process.cwd(), "Cargo.toml");
  const content = readFileSync(cargoTomlPath, "utf8");

  const updatedContent = content.replace(
    /^version = "[\d.]+"/m,
    `version = "${newVersion}"`
  );

  writeFileSync(cargoTomlPath, updatedContent);
}

function getCurrentVersion() {
  const packageJsonPath = join(process.cwd(), "package.json");
  const content = readFileSync(packageJsonPath, "utf8");
  const config = JSON.parse(content);
  return config.version;
}

function showUsage() {
  console.log("Usage: node scripts/bump-version.js <type> [--dry-run]");
  console.log("  where <type> is one of: major, minor, patch");
  console.log(
    "  --dry-run: Show what would be changed without modifying files"
  );
  console.log("");
  console.log("Examples:");
  console.log("  task bump:patch              # 0.1.3 -> 0.1.4");
  console.log("  task bump:minor              # 0.1.3 -> 0.2.0");
  console.log("  task bump:major              # 0.1.3 -> 1.0.0");
  console.log(
    "  node scripts/bump-version.js patch --dry-run  # Preview changes"
  );
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const isDryRun = args.includes("--dry-run");
  const filteredArgs = args.filter(arg => arg !== "--dry-run");

  if (filteredArgs.length !== 1 || !BUMP_TYPES.includes(filteredArgs[0])) {
    showUsage();
    process.exit(1);
  }

  const bumpType = filteredArgs[0];

  try {
    // Get current version
    const currentVersionString = getCurrentVersion();

    if (!semver.valid(currentVersionString)) {
      throw new Error(`Invalid version format: ${currentVersionString}`);
    }

    console.log(`Current version: ${currentVersionString}`);

    // Calculate new version using semver library
    const newVersionString = semver.inc(currentVersionString, bumpType);

    if (!newVersionString) {
      throw new Error(
        `Failed to increment ${bumpType} version from ${currentVersionString}`
      );
    }

    console.log(`New version: ${newVersionString}`);

    if (isDryRun) {
      console.log("\n🔍 DRY RUN MODE - No files will be modified");
      console.log("\nFiles that would be updated:");
      console.log("  - package.json");
      console.log("  - Cargo.toml");
      console.log("  - package-lock.json (via npm install)");
      console.log("  - Cargo.lock (via cargo check)");
      console.log(
        `\n✅ Would bump ${bumpType} version from ${currentVersionString} to ${newVersionString}`
      );
    } else {
      // Update files
      console.log("Updating package.json...");
      updatePackageJson(newVersionString);

      console.log("Updating Cargo.toml...");
      updateCargoToml(newVersionString);

      console.log("Updating package-lock.json...");
      const npmResult = await runCommand(["npm", "install"], {
        showOutput: false,
      });
      if (!npmResult.success) {
        console.warn(
          "⚠️ npm install failed, package-lock.json may be out of sync"
        );
      }

      console.log("Updating Cargo.lock...");
      const cargoResult = await runCommand(["cargo", "check"], {
        showOutput: false,
      });
      if (!cargoResult.success) {
        console.warn("⚠️ cargo check failed, Cargo.lock may be out of sync");
      }

      console.log(
        `✅ Successfully bumped ${bumpType} version to ${newVersionString}`
      );
    }
  } catch (error) {
    console.error(
      `❌ Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
