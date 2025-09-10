#!/usr/bin/env npx tsx

/**
 * Post-build script to remove the NAPI_RS_NATIVE_LIBRARY_PATH environment
 * variable check from the generated index.js file.
 *
 * This eliminates the "unanalyzable dynamic import" warning when publishing to JSR.
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Support --dir parameter for custom directory
const dirArg = process.argv.find((arg) => arg.startsWith("--dir="));
const customDir = dirArg ? dirArg.split("=")[1] : null;
const napiIndexPath = customDir
  ? join(__dirname, "..", customDir, "index.js")
  : join(__dirname, "..", "npm", "darwin-arm64", "index.js");

try {
  if (!existsSync(napiIndexPath)) {
    console.log(`⚠️ ${napiIndexPath} not found - skipping env check removal`);
    process.exit(0);
  }

  const content = readFileSync(napiIndexPath, "utf-8");

  // Remove the entire NAPI_RS_NATIVE_LIBRARY_PATH check block
  // This regex matches the if block and its else-if continuation
  // Updated to handle the function-wrapped structure
  const modifiedContent = content.replace(
    /\s+if\s+\(process\.env\.NAPI_RS_NATIVE_LIBRARY_PATH\)\s+\{[\s\S]*?\n\s*\}\s*else\s+if/,
    "\n  if",
  );

  if (content !== modifiedContent) {
    writeFileSync(napiIndexPath, modifiedContent);
    console.log(
      `✅ Removed NAPI_RS_NATIVE_LIBRARY_PATH check from ${napiIndexPath}`,
    );
  } else {
    console.log(
      "ℹ️ NAPI_RS_NATIVE_LIBRARY_PATH check not found or already removed",
    );
  }
} catch (error) {
  console.error("❌ Error processing napi/index.js:", error);
  process.exit(1);
}
