#!/usr/bin/env -S npx tsx
/**
 * Common utilities shared across build and development scripts
 * Provides standardized functions for command execution, file system operations,
 * and console output formatting.
 */

import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { existsSync, mkdirSync, rmSync } from "node:fs";

// Standard colors for console output
export const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  blue: "\x1b[0;34m",
  reset: "\x1b[0m", // No Color
};

/**
 * Colorize text with ANSI color codes
 */
export function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Universal command runner that supports all script use cases
 * Provides consistent command execution across all scripts with flexible options
 */
export async function runCommand(command, options = {}) {
  return new Promise(resolve => {
    try {
      const [cmd, ...args] = command;
      const {
        cwd,
        env = {},
        showOutput = true,
        simulate = false,
        useShell = process.platform === "win32",
      } = options;

      // Build environment variables
      const processEnv = {
        ...process.env,
        ...env,
      };

      // Add simulation mode if requested
      if (simulate) {
        processEnv.PRINTERS_JS_SIMULATE = "true";
      }

      const child = spawn(cmd, args, {
        cwd,
        env: processEnv,
        stdio: showOutput ? "inherit" : ["inherit", "pipe", "pipe"],
        shell: useShell,
      });

      if (!showOutput) {
        let stdout = "";
        let stderr = "";

        child.stdout?.on("data", data => {
          stdout += data.toString();
        });

        child.stderr?.on("data", data => {
          stderr += data.toString();
        });

        child.on("close", code => {
          resolve({
            success: code === 0,
            output: stdout + stderr,
            code: code ?? undefined,
          });
        });

        child.on("error", error => {
          resolve({
            success: false,
            output: `Command failed: ${error.message}`,
          });
        });
      } else {
        child.on("close", code => {
          resolve({
            success: code === 0,
            output: "",
            code: code ?? undefined,
          });
        });

        child.on("error", error => {
          resolve({
            success: false,
            output: `Command failed: ${error.message}`,
          });
        });
      }
    } catch (error) {
      resolve({
        success: false,
        output: `Command failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });
}

/**
 * Check if a command exists and is available in the system PATH
 */
export async function commandExists(command) {
  const result = await runCommand([command, "--version"], {
    showOutput: false,
  });
  return result.success;
}

/**
 * Check if a file exists at the given path
 */
export async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists at the given path
 */
export async function directoryExists(path) {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Ensure a directory exists, creating it recursively if needed
 */
export function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Remove a directory and all its contents
 */
export function removeDir(dir) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true });
  }
}

/**
 * Legacy runCommand for compile.js compatibility
 * Returns a promise that rejects on failure instead of always resolving
 */
export function runCommandLegacy(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const useShell = process.platform === "win32";
    const childProcess = spawn(command, args, {
      cwd,
      stdio: ["inherit", "pipe", "pipe"],
      shell: useShell,
    });

    let stdout = "";
    let stderr = "";

    childProcess.stdout?.on("data", data => {
      stdout += data.toString();
    });

    childProcess.stderr?.on("data", data => {
      stderr += data.toString();
    });

    childProcess.on("close", code => {
      if (code === 0) {
        resolve({ code: code ?? 0, stdout, stderr });
      } else {
        reject({ code: code ?? 1, stdout, stderr });
      }
    });

    childProcess.on("error", error => {
      reject({ code: 1, stdout, stderr: error.message });
    });
  });
}
