#!/usr/bin/env -S deno run --allow-run --allow-read --allow-env
/**
 * build-all.ts - Build script for all runtimes
 * Cross-platform build script that works on Windows, macOS, and Linux
 */

// Colors for output
const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  reset: "\x1b[0m", // No Color
};

function colorize(color: keyof typeof colors, text: string): string {
  return `${colors[color]}${text}${colors.reset}`;
}

async function runCommand(
  command: string[],
  options: { cwd?: string; env?: Record<string, string> } = {},
): Promise<{ success: boolean; output: string }> {
  try {
    const cmd = new Deno.Command(command[0], {
      args: command.slice(1),
      cwd: options.cwd,
      env: {
        ...Deno.env.toObject(),
        ...options.env,
      },
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await cmd.output();
    const output = new TextDecoder().decode(stdout) +
      new TextDecoder().decode(stderr);

    return {
      success: code === 0,
      output,
    };
  } catch (error) {
    return {
      success: false,
      output: `Command failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

async function commandExists(command: string): Promise<boolean> {
  const result = await runCommand([command, "--version"]);
  return result.success;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

async function directoryExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isDirectory;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  console.log("Building cross-runtime printer library...");
  console.log();

  let buildSuccess = true;

  // Build for Deno/Bun (FFI)
  console.log(colorize("yellow", "Building FFI library for Deno/Bun..."));
  const ffiResult = await runCommand(["cargo", "build", "--release"]);

  if (ffiResult.success) {
    console.log(colorize("green", "✓ FFI library built successfully"));
  } else {
    console.log(colorize("red", "✗ FFI library build failed"));
    console.log(ffiResult.output);
    buildSuccess = false;
  }

  console.log();

  // Build for Node.js (N-API) - requires npm/napi-cli
  const npxExists = await commandExists("npx");
  const packageJsonExists = await fileExists("package.json");

  if (npxExists && packageJsonExists) {
    console.log(colorize("yellow", "Building N-API library for Node.js..."));

    // Install dependencies if needed
    const nodeModulesExists = await directoryExists("node_modules");
    if (!nodeModulesExists) {
      console.log("Installing Node.js dependencies...");
      const installResult = await runCommand(["npm", "install"]);
      if (!installResult.success) {
        console.log(colorize("red", "Failed to install Node.js dependencies"));
        console.log(installResult.output);
        buildSuccess = false;
      }
    }

    if (buildSuccess || nodeModulesExists) {
      // Build with napi-rs CLI directly
      const napiResult = await runCommand([
        "node",
        "scripts/build-napi.js",
        "--release",
      ]);

      if (napiResult.success) {
        console.log(colorize("green", "✓ N-API library built successfully"));
      } else {
        console.log(colorize("red", "✗ N-API library build failed"));
        console.log("Note: N-API build requires Node.js and @napi-rs/cli");
        console.log(napiResult.output);
        buildSuccess = false;
      }
    }
  } else {
    console.log(
      colorize(
        "yellow",
        "Skipping N-API build (Node.js/npm not available or package.json missing)",
      ),
    );
  }

  console.log();

  if (buildSuccess) {
    console.log(colorize("green", "Build complete!"));
  } else {
    console.log(colorize("red", "Build completed with errors!"));
  }

  console.log();
  console.log("Available libraries:");

  // Detect platform and show appropriate library files
  const os = Deno.build.os;
  const libExtension = os === "windows"
    ? ".dll"
    : os === "darwin"
    ? ".dylib"
    : ".so";
  const libPrefix = os === "windows" ? "" : "lib";
  const libName = `${libPrefix}printers_js${libExtension}`;

  console.log(`  - target/release/${libName} (${os.toUpperCase()} FFI)`);
  console.log("  - npm/**/*.node (Node.js N-API, if built)");

  if (!buildSuccess) {
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
