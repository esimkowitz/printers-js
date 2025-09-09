#!/usr/bin/env npx tsx

import { existsSync, mkdirSync, readdirSync, renameSync } from "fs";
import { join } from "path";

// Create napi directory if it doesn't exist
if (!existsSync("napi")) {
  mkdirSync("napi", { recursive: true });
}

// Move files to napi directory
const filesToMove: string[] = ["index.js", "index.d.ts"];
const files = readdirSync(".");

// Add all .node files from current directory
for (const file of files) {
  if (file.endsWith(".node")) {
    filesToMove.push(file);
  }
}

// Move each file
for (const file of filesToMove) {
  const sourcePath = join(".", file);
  const destPath = join("napi", file);

  if (existsSync(sourcePath)) {
    try {
      renameSync(sourcePath, destPath);
      console.log(`Moved ${file} to napi/`);
    } catch (err: any) {
      console.error(`Failed to move ${file}: ${err.message}`);
    }
  }
}

// List contents of napi directory
console.log("\nContents of napi/ directory:");
try {
  const napiFiles = readdirSync("napi");
  for (const file of napiFiles) {
    console.log(`  ${file}`);
  }
} catch (err: any) {
  console.error(`Failed to read napi directory: ${err.message}`);
}
