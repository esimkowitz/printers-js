#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Post-build script to remove the NAPI_RS_NATIVE_LIBRARY_PATH environment
 * variable check from the generated napi/index.js file.
 *
 * This eliminates the "unanalyzable dynamic import" warning when publishing to JSR.
 */

const napiIndexPath = new URL("../napi/index.js", import.meta.url).pathname;

try {
  const content = await Deno.readTextFile(napiIndexPath);

  // Remove the entire NAPI_RS_NATIVE_LIBRARY_PATH check block
  // This regex matches the if block and its else-if continuation
  const modifiedContent = content.replace(
    /if \(process\.env\.NAPI_RS_NATIVE_LIBRARY_PATH\) \{[\s\S]*?\n  \} else if/,
    "if",
  );

  if (content !== modifiedContent) {
    await Deno.writeTextFile(napiIndexPath, modifiedContent);
    console.log(
      "✅ Removed NAPI_RS_NATIVE_LIBRARY_PATH check from napi/index.js",
    );
  } else {
    console.log(
      "ℹ️ NAPI_RS_NATIVE_LIBRARY_PATH check not found or already removed",
    );
  }
} catch (error) {
  if (error instanceof Deno.errors.NotFound) {
    console.log("⚠️ napi/index.js not found - skipping env check removal");
  } else {
    console.error("❌ Error processing napi/index.js:", error);
    Deno.exit(1);
  }
}
