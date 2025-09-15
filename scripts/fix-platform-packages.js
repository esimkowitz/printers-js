#!/usr/bin/env node
/**
 * fix-platform-packages.js - Fix platform-specific package.json files for ESM
 *
 * This script updates the package.json files in npm/* directories to:
 * 1. Set "main" to "index.js" instead of the .node file
 * 2. Include all necessary files in the "files" array
 * 3. Add "types" field pointing to index.d.ts
 *
 * This must run AFTER napi build but BEFORE napi prepublish
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const npmDir = join(__dirname, "..", "npm");

// Get all platform directories
const platforms = readdirSync(npmDir).filter(dir => {
  const pkgPath = join(npmDir, dir, "package.json");
  return existsSync(pkgPath);
});

console.log(`Fixing package.json files for ${platforms.length} platforms...`);

for (const platform of platforms) {
  const pkgPath = join(npmDir, platform, "package.json");
  const indexJsPath = join(npmDir, platform, "index.js");
  const indexDtsPath = join(npmDir, platform, "index.d.ts");

  // Check if ESM files exist
  const hasIndexJs = existsSync(indexJsPath);
  const hasIndexDts = existsSync(indexDtsPath);

  if (!hasIndexJs) {
    console.log(`⚠️  Skipping ${platform}: index.js not found`);
    continue;
  }

  // Read and parse package.json
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

  // Find the .node file in the directory
  const files = readdirSync(join(npmDir, platform));
  const nodeFile = files.find(f => f.endsWith('.node'));

  if (!nodeFile) {
    console.log(`⚠️  Warning: No .node file found in ${platform}`);
  }

  // Update package.json for ESM
  pkg.main = "index.js";
  pkg.types = "index.d.ts";

  // Set files array to include all necessary files
  // napi prepublish might expect a specific format
  const filesToInclude = [
    nodeFile,     // The native binary (if it exists)
    "index.js",   // ESM wrapper
    "index.d.ts", // TypeScript definitions
    "README.md"   // Include README if it exists
  ].filter(file => {
    // Only include files that actually exist
    if (!file) return false;
    const filePath = join(npmDir, platform, file);
    return existsSync(filePath);
  });

  pkg.files = filesToInclude;

  // Write updated package.json
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  console.log(`✅ Fixed ${platform}/package.json:`);
  console.log(`   - main: "${pkg.main}"`);
  console.log(`   - types: "${pkg.types}"`);
  console.log(`   - files: ${JSON.stringify(pkg.files)}`);
}

console.log("\n✅ All platform package.json files have been fixed for ESM");
