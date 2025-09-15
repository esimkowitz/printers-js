#!/usr/bin/env node

/**
 * Test script to verify package linking works correctly before publishing.
 * Tests npm link for Node.js, and equivalent local package loading for Deno and Bun.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import {
  rootDir,
  colors,
  log,
  logSection,
  logSuccess,
  logError,
  logWarning,
  runCommand,
  exists,
} from "./utils.js";

async function setupTestEnvironment() {
  logSection("Setting up test environment");

  // Create temporary test directory
  const testDir = join(rootDir, "test-package-linking");
  if (existsSync(testDir)) {
    log("Cleaning up existing test directory", colors.yellow);
    rmSync(testDir, { recursive: true, force: true });
  }
  mkdirSync(testDir, { recursive: true });

  return testDir;
}

async function testNpmLinking(testDir) {
  logSection("Testing npm link for Node.js");

  try {
    // First, create npm global link for main package
    log("Creating npm link for main package", colors.blue);
    await runCommand("npm link", rootDir);

    // Link platform-specific packages
    const npmDir = join(rootDir, "npm");
    if (existsSync(npmDir)) {
      const platforms = readFileSync(
        join(npmDir, "..", "package.json"),
        "utf8"
      );
      const pkg = JSON.parse(platforms);
      const optionalDeps = pkg.optionalDependencies || {};

      for (const [depName, version] of Object.entries(optionalDeps)) {
        if (depName.startsWith("@printers/printers-")) {
          const platform = depName.replace("@printers/printers-", "");
          const platformDir = join(npmDir, platform);
          if (existsSync(platformDir)) {
            log(`Creating npm link for ${depName}`, colors.blue);
            await runCommand("npm link", platformDir);
          }
        }
      }
    }

    // Create test Node.js project
    const nodeTestDir = join(testDir, "node-test");
    mkdirSync(nodeTestDir, { recursive: true });

    // Create package.json
    writeFileSync(
      join(nodeTestDir, "package.json"),
      JSON.stringify(
        {
          name: "test-node-package",
          type: "module",
          dependencies: {},
        },
        null,
        2
      )
    );

    // Link the main package
    log("Linking @printers/printers in test project", colors.blue);
    await runCommand("npm link @printers/printers", nodeTestDir);

    // Create test script
    const testScript = `
import { getAllPrinters, runtimeInfo, isSimulationMode } from "@printers/printers";

console.log("Runtime:", runtimeInfo.name, runtimeInfo.version);
console.log("Simulation mode:", isSimulationMode);

const printers = getAllPrinters();
console.log("Found", printers.length, "printers");

if (printers.length > 0) {
  console.log("First printer:", printers[0].name);
}

console.log("✅ Node.js package linking test passed!");
`;

    writeFileSync(join(nodeTestDir, "test.mjs"), testScript);

    // Run the test
    log("Running Node.js test with linked package", colors.green);
    await runCommand("PRINTERS_JS_SIMULATE=true node test.mjs", nodeTestDir);

    // Test examples if they exist
    const nodeExampleDir = join(rootDir, "examples", "node");
    if (existsSync(nodeExampleDir)) {
      log("Testing Node.js example with linked package", colors.green);

      // Temporarily link in examples directory
      await runCommand("npm link @printers/printers", nodeExampleDir);
      await runCommand(
        "PRINTERS_JS_SIMULATE=true node main.js",
        nodeExampleDir
      );

      // Unlink from examples
      await runCommand("npm unlink @printers/printers", nodeExampleDir);
    }

    logSuccess("Node.js npm link tests completed successfully!");
  } finally {
    // Clean up npm links
    try {
      await runCommand("npm unlink -g @printers/printers", rootDir);
    } catch (e) {
      // Ignore unlink errors
    }
  }
}

async function testBunLinking(testDir) {
  logSection("Testing package loading for Bun");

  // Create test Bun project
  const bunTestDir = join(testDir, "bun-test");
  mkdirSync(bunTestDir, { recursive: true });

  // Create package.json with local file dependency
  const mainPackagePath = resolve(rootDir);
  writeFileSync(
    join(bunTestDir, "package.json"),
    JSON.stringify(
      {
        name: "test-bun-package",
        dependencies: {
          "@printers/printers": `file:${mainPackagePath}`,
        },
      },
      null,
      2
    )
  );

  // Install with bun
  log("Installing local package with Bun", colors.blue);
  await runCommand("bun install", bunTestDir);

  // Create test script
  const testScript = `
import { getAllPrinters, runtimeInfo, isSimulationMode } from "@printers/printers";

console.log("Runtime:", runtimeInfo.name, runtimeInfo.version);
console.log("Simulation mode:", isSimulationMode);

const printers = getAllPrinters();
console.log("Found", printers.length, "printers");

if (printers.length > 0) {
  console.log("First printer:", printers[0].name);
}

console.log("✅ Bun package loading test passed!");
`;

  writeFileSync(join(bunTestDir, "test.ts"), testScript);

  // Run the test
  log("Running Bun test with local package", colors.green);
  await runCommand("PRINTERS_JS_SIMULATE=true bun test.ts", bunTestDir);

  // Test examples if they exist
  const bunExampleDir = join(rootDir, "examples", "bun");
  if (existsSync(bunExampleDir)) {
    log("Testing Bun example", colors.green);

    // Update package.json to use local package
    const pkgPath = join(bunExampleDir, "package.json");
    const originalPkg = existsSync(pkgPath)
      ? readFileSync(pkgPath, "utf8")
      : null;

    writeFileSync(
      pkgPath,
      JSON.stringify(
        {
          name: "bun-example",
          dependencies: {
            "@printers/printers": `file:${mainPackagePath}`,
          },
        },
        null,
        2
      )
    );

    await runCommand("bun install", bunExampleDir);
    await runCommand("PRINTERS_JS_SIMULATE=true bun main.ts", bunExampleDir);

    // Restore original package.json
    if (originalPkg) {
      writeFileSync(pkgPath, originalPkg);
    }
  }

  logSuccess("Bun package loading tests completed successfully!");
}

async function testDenoLinking(testDir) {
  logSection("Testing package loading for Deno");

  // Create test Deno project
  const denoTestDir = join(testDir, "deno-test");
  mkdirSync(denoTestDir, { recursive: true });

  // Create import map for local package
  const importMap = {
    imports: {
      "@printers/printers": `file://${resolve(rootDir, "src", "index.ts")}`,
    },
  };

  writeFileSync(
    join(denoTestDir, "import_map.json"),
    JSON.stringify(importMap, null, 2)
  );

  // Create deno.json
  writeFileSync(
    join(denoTestDir, "deno.json"),
    JSON.stringify(
      {
        importMap: "./import_map.json",
        nodeModulesDir: "auto",
        tasks: {
          test: "deno run --allow-env --allow-read --allow-ffi test.ts",
        },
      },
      null,
      2
    )
  );

  // Create test script
  const testScript = `
import { getAllPrinters, runtimeInfo, isSimulationMode } from "@printers/printers";

console.log("Runtime:", runtimeInfo.name, runtimeInfo.version);
console.log("Simulation mode:", isSimulationMode);

const printers = getAllPrinters();
console.log("Found", printers.length, "printers");

if (printers.length > 0) {
  console.log("First printer:", printers[0].name);
}

console.log("✅ Deno package loading test passed!");
`;

  writeFileSync(join(denoTestDir, "test.ts"), testScript);

  // Run the test
  log("Running Deno test with local package", colors.green);
  await runCommand(
    "PRINTERS_JS_SIMULATE=true deno run --allow-env --allow-read --allow-ffi --import-map=import_map.json test.ts",
    denoTestDir
  );

  // Test examples if they exist
  const denoExampleDir = join(rootDir, "examples", "deno");
  if (existsSync(denoExampleDir)) {
    log("Testing Deno example", colors.green);

    // Create temporary import map for example
    const exampleImportMap = join(denoExampleDir, "test_import_map.json");
    writeFileSync(
      exampleImportMap,
      JSON.stringify(
        {
          imports: {
            "@printers/printers": `file://${resolve(rootDir, "src", "index.ts")}`,
            "npm:@printers/printers": `file://${resolve(rootDir, "src", "index.ts")}`,
          },
        },
        null,
        2
      )
    );

    await runCommand(
      `PRINTERS_JS_SIMULATE=true deno run --allow-env --allow-read --allow-ffi --import-map=${exampleImportMap} main.ts`,
      denoExampleDir
    );

    // Clean up temporary import map
    rmSync(exampleImportMap);
  }

  logSuccess("Deno package loading tests completed successfully!");
}

async function cleanup(testDir) {
  logSection("Cleaning up");

  if (existsSync(testDir)) {
    logWarning("Removing test directory");
    rmSync(testDir, { recursive: true, force: true });
  }

  logSuccess("Cleanup completed");
}

async function main() {
  let testDir;
  let success = true;

  try {
    // Check if we have built packages
    const npmDir = join(rootDir, "npm");
    if (!existsSync(npmDir)) {
      throw new Error(
        "No npm directory found. Please build packages first with 'task build:napi'"
      );
    }

    // Check if compiled JavaScript exists
    const distDir = join(rootDir, "dist");
    if (!existsSync(distDir)) {
      logWarning("Compiling TypeScript for package testing");
      await runCommand("task compile");
    }

    testDir = await setupTestEnvironment();

    // Test Node.js with npm link
    try {
      await testNpmLinking(testDir);
    } catch (error) {
      logError(`Node.js npm link test failed: ${error.message}`);
      success = false;
    }

    // Test Bun with local file dependency
    try {
      await testBunLinking(testDir);
    } catch (error) {
      logError(`Bun package loading test failed: ${error.message}`);
      success = false;
    }

    // Test Deno with import maps
    try {
      await testDenoLinking(testDir);
    } catch (error) {
      logError(`Deno package loading test failed: ${error.message}`);
      success = false;
    }

    if (success) {
      logSection("All package linking tests passed!");
      logSuccess("Packages are ready for publishing");
    } else {
      logSection("Some tests failed");
      process.exit(1);
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (testDir) {
      await cleanup(testDir);
    }
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
