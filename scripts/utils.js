#!/usr/bin/env node

/**
 * Shared utilities for build and test scripts.
 */

import { exec as execCallback, spawn } from "child_process";
import { promisify } from "util";
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const exec = promisify(execCallback);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root directory
export const rootDir = resolve(__dirname, "..");

// Colors for terminal output
export const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

/**
 * Log a message with optional color.
 * @param {string} message - Message to log
 * @param {string} color - Color code (from colors object)
 */
export function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Log a section header.
 * @param {string} title - Section title
 */
export function logSection(title) {
  console.log();
  log(`${"=".repeat(60)}`, colors.bright);
  log(title, colors.bright + colors.blue);
  log(`${"=".repeat(60)}`, colors.bright);
}

/**
 * Log an error message.
 * @param {string} message - Error message
 */
export function logError(message) {
  console.error(`${colors.red}❌ ${message}${colors.reset}`);
}

/**
 * Log a success message.
 * @param {string} message - Success message
 */
export function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

/**
 * Log a warning message.
 * @param {string} message - Warning message
 */
export function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

/**
 * Log an info message.
 * @param {string} message - Info message
 */
export function logInfo(message) {
  console.log(`${colors.cyan}ℹ️  ${message}${colors.reset}`);
}

/**
 * Run a command and return the result.
 * @param {string} command - Command to run
 * @param {string} cwd - Working directory (defaults to project root)
 * @param {object} options - Additional options for exec
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
export async function runCommand(command, cwd = rootDir, options = {}) {
  log(`Running: ${command}`, colors.dim);
  try {
    const result = await exec(command, { cwd, ...options });
    if (result.stdout && result.stdout.trim()) {
      console.log(result.stdout);
    }
    if (result.stderr && result.stderr.trim()) {
      console.error(result.stderr);
    }
    return result;
  } catch (error) {
    logError(`Command failed: ${command}`);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    throw error;
  }
}

/**
 * Run a command and stream output in real-time.
 * @param {string} command - Command to run
 * @param {string[]} args - Command arguments
 * @param {string} cwd - Working directory (defaults to project root)
 * @param {object} options - Additional options for spawn
 * @returns {Promise<number>} Exit code
 */
export function runCommandStream(
  command,
  args = [],
  cwd = rootDir,
  options = {}
) {
  return new Promise((resolve, reject) => {
    log(`Running: ${command} ${args.join(" ")}`, colors.dim);

    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });

    child.on("close", code => {
      if (code !== 0) {
        reject(
          new Error(
            `Command failed with exit code ${code}: ${command} ${args.join(" ")}`
          )
        );
      } else {
        resolve(code);
      }
    });

    child.on("error", error => {
      reject(error);
    });
  });
}

/**
 * Check if a command exists.
 * @param {string} command - Command to check
 * @returns {Promise<boolean>}
 */
export async function commandExists(command) {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    await exec(`${cmd} ${command}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the package.json content.
 * @param {string} dir - Directory containing package.json (defaults to project root)
 * @returns {object} Parsed package.json
 */
export function getPackageJson(dir = rootDir) {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error(`package.json not found in ${dir}`);
  }
  return JSON.parse(readFileSync(pkgPath, "utf8"));
}

/**
 * Check if running in CI environment.
 * @returns {boolean}
 */
export function isCI() {
  return process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
}

/**
 * Get platform string for the current system.
 * @returns {string} Platform string (e.g., "darwin-x64", "win32-x64-msvc")
 */
export function getPlatformString() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "darwin") {
    if (arch === "x64") return "darwin-x64";
    if (arch === "arm64") return "darwin-arm64";
  } else if (platform === "win32") {
    if (arch === "x64") return "win32-x64-msvc";
    if (arch === "arm64") return "win32-arm64-msvc";
  } else if (platform === "linux") {
    if (arch === "x64") return "linux-x64-gnu";
    if (arch === "arm64") return "linux-arm64-gnu";
  }

  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

/**
 * Measure execution time of an async function.
 * @param {string} name - Name of the operation
 * @param {Function} fn - Async function to measure
 * @returns {Promise<*>} Result of the function
 */
export async function measureTime(name, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    logSuccess(`${name} completed in ${duration}s`);
    return result;
  } catch (error) {
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    logError(`${name} failed after ${duration}s`);
    throw error;
  }
}

/**
 * Retry an async operation with exponential backoff.
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise<*>} Result of the function
 */
export async function retry(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  let delay = initialDelay;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        logWarning(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  throw lastError;
}

/**
 * Check if a file or directory exists.
 * @param {string} path - Path to check
 * @returns {boolean}
 */
export function exists(path) {
  return existsSync(path);
}

/**
 * Exit with error message.
 * @param {string} message - Error message
 * @param {number} code - Exit code
 */
export function exitWithError(message, code = 1) {
  logError(message);
  process.exit(code);
}

/**
 * Parse command line arguments.
 * @param {string[]} argv - Command line arguments (defaults to process.argv.slice(2))
 * @returns {object} Parsed arguments
 */
export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    _: [], // Positional arguments
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const nextArg = argv[i + 1];

      if (nextArg && !nextArg.startsWith("-")) {
        args[key] = nextArg;
        i++;
      } else {
        args[key] = true;
      }
    } else if (arg.startsWith("-")) {
      const key = arg.slice(1);
      args[key] = true;
    } else {
      args._.push(arg);
    }
  }

  return args;
}
