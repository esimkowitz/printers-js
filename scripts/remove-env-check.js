#!/usr/bin/env node

/**
 * Post-build script to remove the NAPI_RS_NATIVE_LIBRARY_PATH environment
 * variable check from the generated index.js file.
 *
 * This eliminates the "unanalyzable dynamic import" warning when publishing to JSR.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Support --dir parameter for custom directory, or process all platforms
const dirArg = process.argv.find(arg => arg.startsWith("--dir="));
const customDir = dirArg ? dirArg.split("=")[1] : null;

function getIndexPaths() {
  if (customDir) {
    return [join(__dirname, "..", customDir, "index.js")];
  }

  // Process all platform directories in npm/
  const npmDir = join(__dirname, "..", "npm");
  if (!existsSync(npmDir)) {
    return [];
  }

  const platforms = readdirSync(npmDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  return platforms.map(platform => join(npmDir, platform, "index.js"));
}

const indexPaths = getIndexPaths();

function processIndexFile(indexPath) {
  if (!existsSync(indexPath)) {
    console.log(`⚠️ ${indexPath} not found - skipping env check removal`);
    return false;
  }

  try {
    const content = readFileSync(indexPath, "utf-8");

    // Remove TypeScript-specific comments that cause issues with Deno
    let modifiedContent = content.replace(/\/\/\s*@ts-nocheck\s*\n/g, "");

    // Remove the entire NAPI_RS_NATIVE_LIBRARY_PATH check block
    // This regex matches the if block and its else-if continuation
    // Updated to handle the current NAPI-RS structure
    modifiedContent = modifiedContent.replace(
      /\s+if\s+\(process\.env\.NAPI_RS_NATIVE_LIBRARY_PATH\)\s+\{[\s\S]*?\n\s*\}\s*else\s+if\s+\(process\.platform\s*===\s*['"]android['"]\)/,
      "\n  if (process.platform === 'android')"
    );

    if (content !== modifiedContent) {
      writeFileSync(indexPath, modifiedContent);
      console.log(
        `✅ Removed NAPI_RS_NATIVE_LIBRARY_PATH check from ${indexPath}`
      );
      return true;
    } else {
      console.log(
        `ℹ️ NAPI_RS_NATIVE_LIBRARY_PATH check not found or already removed in ${indexPath}`
      );
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${indexPath}:`, error);
    throw error;
  }
}

try {
  if (indexPaths.length === 0) {
    console.log(
      "⚠️ No npm platform directories found - skipping env check removal"
    );
    process.exit(0);
  }

  let processedCount = 0;
  let modifiedCount = 0;

  for (const indexPath of indexPaths) {
    processedCount++;
    if (processIndexFile(indexPath)) {
      modifiedCount++;
    }
  }

  console.log(
    `   Processed ${processedCount} platform(s), modified ${modifiedCount} file(s)`
  );
} catch (error) {
  console.error("❌ Error processing index files:", error);
  process.exit(1);
}
