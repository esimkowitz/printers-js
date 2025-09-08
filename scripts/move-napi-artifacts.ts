#!/usr/bin/env deno run --allow-read --allow-write

import { join } from "@std/path";

// Create napi directory if it doesn't exist
try {
  await Deno.stat("napi");
} catch {
  await Deno.mkdir("napi", { recursive: true });
}

// Move files to napi directory
const filesToMove: string[] = ["index.js", "index.d.ts"];

// Add all .node files from current directory
for await (const dirEntry of Deno.readDir(".")) {
  if (dirEntry.isFile && dirEntry.name.endsWith(".node")) {
    filesToMove.push(dirEntry.name);
  }
}

// Move each file
for (const file of filesToMove) {
  const sourcePath = join(".", file);
  const destPath = join("napi", file);

  try {
    await Deno.stat(sourcePath);
    try {
      await Deno.rename(sourcePath, destPath);
      console.log(`Moved ${file} to napi/`);
    } catch (err) {
      console.error(
        `Failed to move ${file}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  } catch {
    // File doesn't exist, skip silently
  }
}

// List contents of napi directory
console.log("\nContents of napi/ directory:");
try {
  for await (const dirEntry of Deno.readDir("napi")) {
    if (dirEntry.isFile) {
      console.log(`  ${dirEntry.name}`);
    }
  }
} catch (err) {
  console.error(
    `Failed to read napi directory: ${
      err instanceof Error ? err.message : String(err)
    }`,
  );
}
