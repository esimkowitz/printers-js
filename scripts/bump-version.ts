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

interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

type BumpType = "major" | "minor" | "patch";

function parseVersion(version: string): SemanticVersion {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

function bumpVersion(version: SemanticVersion, type: BumpType): SemanticVersion {
  const newVersion = { ...version };
  
  switch (type) {
    case "major":
      newVersion.major++;
      newVersion.minor = 0;
      newVersion.patch = 0;
      break;
    case "minor":
      newVersion.minor++;
      newVersion.patch = 0;
      break;
    case "patch":
      newVersion.patch++;
      break;
    default:
      throw new Error(`Invalid bump type: ${type}`);
  }
  
  return newVersion;
}

function formatVersion(version: SemanticVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

async function updateDenoJson(newVersion: string): Promise<void> {
  const denoJsonPath = join(Deno.cwd(), "deno.json");
  const content = await Deno.readTextFile(denoJsonPath);
  const config = JSON.parse(content);
  
  config.version = newVersion;
  
  await Deno.writeTextFile(denoJsonPath, JSON.stringify(config, null, 2) + "\n");
}

async function updateCargoToml(newVersion: string): Promise<void> {
  const cargoTomlPath = join(Deno.cwd(), "Cargo.toml");
  const content = await Deno.readTextFile(cargoTomlPath);
  
  const updatedContent = content.replace(
    /^version = "[\d.]+"/m,
    `version = "${newVersion}"`
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
  console.log("Usage: deno run --allow-read --allow-write scripts/bump-version.ts <type>");
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
    const currentVersion = parseVersion(currentVersionString);
    
    console.log(`Current version: ${currentVersionString}`);
    
    // Calculate new version
    const newVersion = bumpVersion(currentVersion, bumpType);
    const newVersionString = formatVersion(newVersion);
    
    console.log(`New version: ${newVersionString}`);
    
    // Update files
    console.log("Updating deno.json...");
    await updateDenoJson(newVersionString);
    
    console.log("Updating Cargo.toml...");
    await updateCargoToml(newVersionString);
    
    console.log(`✅ Successfully bumped ${bumpType} version to ${newVersionString}`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}