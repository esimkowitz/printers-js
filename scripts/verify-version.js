#!/usr/bin/env node
/**
 * Release version consistency check
 *
 * Fails if the git tag, package.json, deno.json (if it declares a version),
 * and Cargo.toml do not all agree.
 *
 * Usage:
 *   node scripts/verify-version.js [tag]
 *   The tag defaults to $GITHUB_REF_NAME and may include a leading "v".
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

function readJsonVersion(file) {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), file), "utf8")).version;
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

function readCargoVersion() {
  const content = readFileSync(join(process.cwd(), "Cargo.toml"), "utf8");
  const packageSection = content.split(/^\[(?!package\])/m)[0];
  return packageSection.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
}

const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;
if (!tag) {
  console.error("No tag provided (pass as argument or set GITHUB_REF_NAME)");
  process.exit(1);
}

const versions = {
  [`git tag (${tag})`]: tag.replace(/^v/, ""),
  "package.json": readJsonVersion("package.json"),
  "deno.json": readJsonVersion("deno.json"),
  "deno.jsonc": readJsonVersion("deno.jsonc"),
  "Cargo.toml": readCargoVersion(),
};

for (const [source, version] of Object.entries(versions)) {
  if (version === undefined) delete versions[source];
  else console.log(`${source.padEnd(24)} ${version}`);
}

const expected = Object.values(versions)[0];
const mismatched = Object.entries(versions).filter(([, v]) => v !== expected);
if (mismatched.length > 0) {
  console.error(
    `\nVersion mismatch: ${mismatched.map(([s, v]) => `${s}=${v}`).join(", ")} (expected ${expected})`
  );
  process.exit(1);
}
console.log(`\nAll versions match: ${expected}`);
