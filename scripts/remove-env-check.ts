#!/usr/bin/env npx tsx

/**
 * Post-build script to remove the NAPI_RS_NATIVE_LIBRARY_PATH environment
 * variable check from the generated napi/index.js file.
 *
 * This eliminates the "unanalyzable dynamic import" warning when publishing to JSR.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const napiIndexPath = join(__dirname, "..", "napi", "index.js");

try {
  if (!existsSync(napiIndexPath)) {
    console.log("⚠️ napi/index.js not found - skipping env check removal");
    process.exit(0);
  }

  const content = readFileSync(napiIndexPath, "utf-8");

  // Remove the entire NAPI_RS_NATIVE_LIBRARY_PATH check block
  // This regex matches the if block and its else-if continuation
  // Using \\s+ to avoid the no-regex-spaces lint warning
  const modifiedContent = content.replace(
    /if\s+\(process\.env\.NAPI_RS_NATIVE_LIBRARY_PATH\)\s+\{[\s\S]*?\n\s+\}\s+else\s+if/,
    "if"
  );

  if (content !== modifiedContent) {
    writeFileSync(napiIndexPath, modifiedContent);
    console.log(
      "✅ Removed NAPI_RS_NATIVE_LIBRARY_PATH check from napi/index.js"
    );
  } else {
    console.log(
      "ℹ️ NAPI_RS_NATIVE_LIBRARY_PATH check not found or already removed"
    );
  }
} catch (error) {
  console.error("❌ Error processing napi/index.js:", error);
  process.exit(1);
}
