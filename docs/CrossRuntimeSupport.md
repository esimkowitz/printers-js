# Cross-Runtime Support

This document describes the cross-runtime compatibility features of the `@printers/printers` library.

## Overview

The `@printers/printers` library provides identical functionality across three major JavaScript runtimes: Node.js, Deno, and Bun.

## Key Features

- **Identical APIs** - Same function signatures and behavior across all runtimes
- **Universal entry point** - Single import works everywhere
- **Automatic runtime detection** - Library adapts to the current environment
- **Consistent N-API bindings** - Same native code across platforms
- **Cross-runtime testing** - Shared test suite validates all runtimes

## Runtime Detection

The library automatically detects the current runtime and loads appropriate modules:

```typescript
import { runtimeInfo } from "@printers/printers";

console.log(runtimeInfo);
// Node.js: { name: "node", isDeno: false, isNode: true, isBun: false, version: "20.x.x" }
// Deno:    { name: "deno", isDeno: true, isNode: false, isBun: false, version: "1.x.x" }
// Bun:     { name: "bun", isDeno: false, isNode: false, isBun: true, version: "1.x.x" }
```

## Universal Entry Point

All runtimes use the same entry point (`src/index.ts`) which automatically:

1. **Detects the runtime** environment
2. **Loads the appropriate N-API module** for the platform
3. **Provides consistent APIs** regardless of runtime
4. **Handles simulation mode** uniformly

## N-API Module Loading

The library uses platform-specific N-API modules that work across all runtimes:

### Supported Platforms

- **macOS**: `darwin-x64`, `darwin-arm64`
- **Windows**: `win32-x64-msvc`, `win32-arm64-msvc`
- **Linux**: `linux-x64-gnu`, `linux-arm64-gnu`

### Module Resolution

The library automatically resolves the correct N-API module:

```typescript
// For local development
import("../npm/{platform}/index.js");

// For published packages
import("@printers/printers-{platform}");
```

## Runtime-Specific Considerations

### Node.js and Bun

No special considerations; works out of the box.

### Deno

Required permissions:

- `--allow-env` - For environment variable access (simulation mode)
- `--allow-read` - For file operations and N-API module loading
- `--allow-ffi` - For N-API native module execution

```typescript
// Deno specific usage
import { getPrinterByName } from "npm:@printers/printers";

// Set simulation mode using Deno API
Deno.env.set("PRINTERS_JS_SIMULATE", "true");

const printer = getPrinterByName("My Printer");
await printer.printFile("document.pdf");
```

## Simulation Mode

```typescript
// Node.js & Bun
process.env.PRINTERS_JS_SIMULATE = "true";

// Deno
Deno.env.set("PRINTERS_JS_SIMULATE", "true");

// Check simulation mode (works in all runtimes)
import { isSimulationMode } from "@printers/printers";
console.log("Simulation mode:", isSimulationMode);
```

## Cross-Runtime Testing

The library includes a comprehensive test suite that validates functionality across all runtimes:

### Test Structure

- **Shared test suite** (`tests/shared.test.ts`) - Cross-runtime compatibility tests
- **Runtime-specific runners** - Adapt tests for each environment
- **Simulation mode** - Safe testing without real hardware

### Running Tests

```bash
# All runtimes with comprehensive reporting
task test                      # All runtimes via test-runtimes.js
task test -- rust              # Only Rust tests
task test -- deno node bun     # Only JavaScript runtimes

# Direct runtime testing (verbose output)
task test:direct               # All runtimes with direct commands
task test:direct:rust          # cargo test
task test:direct:deno          # deno test (verbose)
task test:direct:node          # Node.js test runner (verbose)
task test:direct:bun           # bun test (verbose)
```

**Test Strategies:**

- **test-runtimes.js wrapper** (`task test`): Provides test count summaries, JUnit XML reports, and LCOV coverage. Use for CI-like testing.
- **Direct runtime commands** (`task test:direct:*`): Provides verbose output directly from each test runner. Use for debugging test failures.

### Test Examples

```typescript
// Test that works across all runtimes
test("should work in all runtimes", async () => {
  const printers = getAllPrinters();

  // Runtime detection works everywhere
  const { name } = runtimeInfo;
  console.log(`Running in ${name}`);

  // API works identically
  if (printers.length > 0) {
    const printer = printers[0];
    const jobId = await printer.printFile("test.pdf", {
      waitForCompletion: false,
    });

    // Job tracking works everywhere
    const job = printer.getJob(jobId);
    assert(typeof job?.id === "number");
  }
});
```

## Build and Distribution

### Platform-Specific Packages

The library is distributed as:

- **Main package** (`@printers/printers`) - JavaScript code and metadata
- **Platform packages** (`@printers/printers-{platform}`) - Native binaries

### Build Process

```bash
# Build for all platforms
task build

# Build N-API modules only
task build:napi

# Build TypeScript only
task build:ts
```

## Best Practices

1. **Use the universal entry point** - Always import from the main package
2. **Test in simulation mode** - Set `PRINTERS_JS_SIMULATE=true` for development
3. **Handle permissions properly** - Grant required permissions for Deno
4. **Use consistent APIs** - Avoid runtime-specific code when possible
5. **Monitor performance** - Different runtimes have different characteristics
6. **Keep dependencies minimal** - The library has zero runtime dependencies
7. **Update regularly** - Cross-runtime compatibility improves with each release
