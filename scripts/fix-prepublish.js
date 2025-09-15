#!/usr/bin/env node
/**
 * fix-prepublish.js - Fix issues after napi prepublish runs
 *
 * This script runs AFTER napi prepublish to ensure platform packages
 * have the correct structure for ESM modules.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const npmDir = join(__dirname, "..", "npm");

// Get all platform directories
const platforms = readdirSync(npmDir).filter(dir => {
  const pkgPath = join(npmDir, dir, "package.json");
  return existsSync(pkgPath);
});

console.log(`Fixing ${platforms.length} platform packages after napi prepublish...`);

for (const platform of platforms) {
  const platformDir = join(npmDir, platform);
  const pkgPath = join(platformDir, "package.json");

  // Read package.json
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

  // Check if ESM files exist
  const indexJsPath = join(platformDir, "index.js");
  const indexDtsPath = join(platformDir, "index.d.ts");
  const hasIndexJs = existsSync(indexJsPath);
  const hasIndexDts = existsSync(indexDtsPath);

  // Find the .node file
  const files = readdirSync(platformDir);
  const nodeFile = files.find(f => f.endsWith('.node'));

  if (!nodeFile) {
    console.log(`⚠️  Warning: No .node file found in ${platform}`);
    continue;
  }

  // If we have ESM files, update package.json to use them
  if (hasIndexJs) {
    pkg.main = "index.js";

    if (hasIndexDts) {
      pkg.types = "index.d.ts";
    }

    // Ensure files array includes everything needed
    pkg.files = [
      nodeFile,
      "index.js",
      hasIndexDts ? "index.d.ts" : null,
      "README.md"
    ].filter(Boolean);

    // Write updated package.json
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

    console.log(`✅ Fixed ${platform}:`);
    console.log(`   - main: "${pkg.main}"`);
    console.log(`   - types: "${pkg.types || 'not set'}"`);
    console.log(`   - files: ${JSON.stringify(pkg.files)}`);
    console.log(`   - .node file: ${nodeFile}`);
  } else {
    console.log(`⚠️  Skipping ${platform}: No ESM files found`);
  }
}

console.log("\n✅ Post-prepublish fixes complete");