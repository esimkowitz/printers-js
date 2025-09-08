#!/usr/bin/env deno run --allow-read --allow-write
/**
 * Version bump utility script
 * Updates version in jsr.json, package.json, and Cargo.toml
 *
 * Usage:
 *   deno run --allow-read --allow-write scripts/bump-version.ts <type>
 *   where <type> is: major, minor, or patch
 */

import { join } from "@std/path";
import { format, increment, parse } from "@std/semver";

type BumpType = "major" | "minor" | "patch";

async function updateJsrJson(newVersion: string): Promise<void> {
  const jsrJsonPath = join(Deno.cwd(), "jsr.json");
  const content = await Deno.readTextFile(jsrJsonPath);
  const config = JSON.parse(content);

  config.version = newVersion;

  await Deno.writeTextFile(
    jsrJsonPath,
    JSON.stringify(config, null, 2) + "\n",
  );
}

async function updatePackageJson(newVersion: string): Promise<void> {
  const packageJsonPath = join(Deno.cwd(), "package.json");
  const content = await Deno.readTextFile(packageJsonPath);
  const config = JSON.parse(content);

  config.version = newVersion;

  await Deno.writeTextFile(
    packageJsonPath,
    JSON.stringify(config, null, 2) + "\n",
  );
}

async function updateCargoToml(newVersion: string): Promise<void> {
  const cargoTomlPath = join(Deno.cwd(), "Cargo.toml");
  const content = await Deno.readTextFile(cargoTomlPath);

  const updatedContent = content.replace(
    /^version = "[\d.]+"/m,
    `version = "${newVersion}"`,
  );

  await Deno.writeTextFile(cargoTomlPath, updatedContent);
}

async function getCurrentVersion(): Promise<string> {
  const jsrJsonPath = join(Deno.cwd(), "jsr.json");
  const content = await Deno.readTextFile(jsrJsonPath);
  const config = JSON.parse(content);
  return config.version;
}

function showUsage(): void {
  console.log(
    "Usage: deno run --allow-read --allow-write scripts/bump-version.ts <type> [--dry-run]",
  );
  console.log("  where <type> is one of: major, minor, patch");
  console.log(
    "  --dry-run: Show what would be changed without modifying files",
  );
  console.log("");
  console.log("Examples:");
  console.log("  deno task bump:patch         # 0.1.3 -> 0.1.4");
  console.log("  deno task bump:minor         # 0.1.3 -> 0.2.0");
  console.log("  deno task bump:major         # 0.1.3 -> 1.0.0");
  console.log(
    "  deno run --allow-read scripts/bump-version.ts patch --dry-run  # Preview changes",
  );
}

async function main(): Promise<void> {
  const args = Deno.args;

  // Parse arguments
  const isDryRun = args.includes("--dry-run");
  const filteredArgs = args.filter((arg) => arg !== "--dry-run");

  if (
    filteredArgs.length !== 1 ||
    !["major", "minor", "patch"].includes(filteredArgs[0])
  ) {
    showUsage();
    Deno.exit(1);
  }

  const bumpType = filteredArgs[0] as BumpType;

  try {
    // Get current version
    const currentVersionString = await getCurrentVersion();
    const currentVersion = parse(currentVersionString);

    if (!currentVersion) {
      throw new Error(`Invalid version format: ${currentVersionString}`);
    }

    console.log(`Current version: ${currentVersionString}`);

    // Calculate new version using semver library
    const newVersion = increment(currentVersion, bumpType);
    const newVersionString = format(newVersion);

    console.log(`New version: ${newVersionString}`);

    if (isDryRun) {
      console.log("\n🔍 DRY RUN MODE - No files will be modified");
      console.log("\nFiles that would be updated:");
      console.log("  - jsr.json");
      console.log("  - package.json");
      console.log("  - Cargo.toml");
      console.log(
        `\n✅ Would bump ${bumpType} version from ${currentVersionString} to ${newVersionString}`,
      );
    } else {
      // Update files
      console.log("Updating jsr.json...");
      await updateJsrJson(newVersionString);

      console.log("Updating package.json...");
      await updatePackageJson(newVersionString);

      console.log("Updating Cargo.toml...");
      await updateCargoToml(newVersionString);

      console.log(
        `✅ Successfully bumped ${bumpType} version to ${newVersionString}`,
      );
    }
  } catch (error) {
    console.error(
      `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
