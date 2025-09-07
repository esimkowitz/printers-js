#!/usr/bin/env deno run --allow-read --allow-write
/**
 * Version bump utility script
 * Updates version in both deno.json and Cargo.toml
 *
 * Usage:
 *   deno run --allow-read --allow-write scripts/bump-version.ts <type>
 *   where <type> is: major, minor, or patch
 */

import { join } from "@std/path";
import { format, increment, parse } from "@std/semver";

type BumpType = "major" | "minor" | "patch";

async function updateDenoJson(newVersion: string): Promise<void> {
  const denoJsonPath = join(Deno.cwd(), "deno.json");
  const content = await Deno.readTextFile(denoJsonPath);
  const config = JSON.parse(content);

  config.version = newVersion;

  await Deno.writeTextFile(
    denoJsonPath,
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
  const denoJsonPath = join(Deno.cwd(), "deno.json");
  const content = await Deno.readTextFile(denoJsonPath);
  const config = JSON.parse(content);
  return config.version;
}

function showUsage(): void {
  console.log(
    "Usage: deno run --allow-read --allow-write scripts/bump-version.ts <type>",
  );
  console.log("  where <type> is one of: major, minor, patch");
  console.log("");
  console.log("Examples:");
  console.log("  deno task bump:patch   # 0.1.3 -> 0.1.4");
  console.log("  deno task bump:minor   # 0.1.3 -> 0.2.0");
  console.log("  deno task bump:major   # 0.1.3 -> 1.0.0");
}

async function main(): Promise<void> {
  const args = Deno.args;

  if (args.length !== 1 || !["major", "minor", "patch"].includes(args[0])) {
    showUsage();
    Deno.exit(1);
  }

  const bumpType = args[0] as BumpType;

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

    // Update files
    console.log("Updating deno.json...");
    await updateDenoJson(newVersionString);

    console.log("Updating Cargo.toml...");
    await updateCargoToml(newVersionString);

    console.log(
      `✅ Successfully bumped ${bumpType} version to ${newVersionString}`,
    );
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
