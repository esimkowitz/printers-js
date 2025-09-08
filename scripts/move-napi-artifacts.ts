#!/usr/bin/env tsx

import { existsSync, mkdirSync, readdirSync, renameSync } from "fs";
import { join } from "path";

// Create napi directory if it doesn't exist
if (!existsSync("napi")) {
  mkdirSync("napi", { recursive: true });
}

// Move files to napi directory
const filesToMove: string[] = ["index.js", "index.d.ts"];
const files = readdirSync(".");

// Add all .node files
files.forEach((file) => {
  if (file.endsWith(".node")) {
    filesToMove.push(file);
  }
});

// Move each file
filesToMove.forEach((file) => {
  const sourcePath = join(".", file);
  const destPath = join("napi", file);

  if (existsSync(sourcePath)) {
    try {
      renameSync(sourcePath, destPath);
      console.log(`Moved ${file} to napi/`);
      // deno-lint-ignore no-explicit-any
    } catch (err: any) {
      console.error(`Failed to move ${file}: ${err.message}`);
    }
  }
});

// List contents of napi directory
console.log("\nContents of napi/ directory:");
const napiFiles = readdirSync("napi");
napiFiles.forEach((file) => {
  console.log(`  ${file}`);
});
