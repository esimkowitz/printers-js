#!/usr/bin/env node
/**
 * publish-platform-packages.js - Publish platform-specific packages to npm
 *
 * This script publishes each platform package in npm/* directories to npm.
 * It ensures the package.json files are correctly configured for ESM before publishing.
 *
 * This is used as an alternative to `napi prepublish` to ensure ESM files are included.
 */

import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const npmDir = join(__dirname, "..", "npm");

// Check if we're in dry-run mode
const isDryRun = process.argv.includes("--dry-run");

// Get all platform directories
const platforms = readdirSync(npmDir).filter(dir => {
  const pkgPath = join(npmDir, dir, "package.json");
  return existsSync(pkgPath);
});

console.log(
  `${isDryRun ? "[DRY RUN] Would publish" : "Publishing"} ${platforms.length} platform packages...`
);

// First, fix all package.json files
console.log("Fixing package.json files for ESM...");
execSync("node scripts/fix-platform-packages.js", { stdio: "inherit" });

// Now publish each platform package
for (const platform of platforms) {
  const platformDir = join(npmDir, platform);
  const pkgPath = join(platformDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

  console.log(
    `\n${isDryRun ? "[DRY RUN] Would publish" : "Publishing"} ${pkg.name}@${pkg.version}...`
  );

  // List files that would be included
  if (isDryRun) {
    console.log("  Files:");
    const files = readdirSync(platformDir);
    for (const file of files) {
      console.log(`    - ${file}`);
    }
  }

  if (!isDryRun) {
    try {
      // Use npm publish with --access public for scoped packages
      execSync("npm publish --access public", {
        cwd: platformDir,
        stdio: "inherit",
      });
      console.log(`✅ Successfully published ${pkg.name}@${pkg.version}`);
    } catch (error) {
      console.error(`❌ Failed to publish ${pkg.name}:`, error.message);
      process.exit(1);
    }
  }
}

console.log(
  `\n✅ ${isDryRun ? "[DRY RUN] Would have published" : "Published"} all platform packages successfully`
);
