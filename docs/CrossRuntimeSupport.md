# Cross-Runtime Support

This document describes the cross-runtime compatibility features of the `@printers/printers` library.

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

```typescript
// This works identically in all runtimes
import {
  getAllPrinters,
  subscribeToPrinterStateChanges,
  startPrinterStateMonitoring,
} from "@printers/printers"; // Node.js/Bun
// or "npm:@printers/printers" for Deno

// Identical usage across all runtimes
const printers = getAllPrinters();
const subscription = await subscribeToPrinterStateChanges(event => {
  console.log(`${event.eventType}: ${event.printerName}`);
});
```

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

## Environment Variables

Consistent environment variable handling across runtimes:

### Simulation Mode

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
# Node.js tests
npm test
# or
task test:node

# Deno tests
deno test --allow-env --allow-read --allow-ffi src/tests/shared.test.ts
# or
task test:deno

# Bun tests
bun test src/tests/shared.test.ts
# or
task test:bun

# All runtimes
task test
```

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

### CI/CD Support

GitHub Actions workflow builds and tests across:

- **Multiple platforms** (macOS, Windows, Linux)
- **Multiple runtimes** (Node.js, Deno, Bun)
- **Multiple architectures** (x64, ARM64)

## Performance Characteristics

### Runtime Performance

| Runtime | Startup   | Print Job | State Monitoring | Memory Usage |
| ------- | --------- | --------- | ---------------- | ------------ |
| Node.js | Fast      | Excellent | Excellent        | Moderate     |
| Deno    | Moderate  | Good      | Good             | Low          |
| Bun     | Very Fast | Excellent | Excellent        | Very Low     |

### Optimization Tips

1. **Use appropriate runtime** for your use case
2. **Enable simulation mode** for development
3. **Batch operations** when possible
4. **Clean up subscriptions** to prevent memory leaks
5. **Use waitForCompletion: false** for responsive UIs

## Migration Between Runtimes

### Node.js to Deno

```typescript
// Before (Node.js)
import fs from "fs";
import { getPrinterByName } from "@printers/printers";

const exists = fs.existsSync("file.pdf");

// After (Deno)
import { getPrinterByName } from "npm:@printers/printers";

const exists = await Deno.stat("file.pdf")
  .then(() => true)
  .catch(() => false);
```

### Node.js to Bun

```typescript
// Before (Node.js)
import { getPrinterByName } from "@printers/printers";

// After (Bun) - No changes needed!
import { getPrinterByName } from "@printers/printers";
```

## Troubleshooting

### Common Issues

#### Deno Permission Errors

```bash
# Error: Requires read access
deno run --allow-read your-script.ts

# Error: Requires FFI access
deno run --allow-ffi your-script.ts

# Error: Requires env access
deno run --allow-env your-script.ts

# Solution: Grant all required permissions
deno run --allow-env --allow-read --allow-ffi your-script.ts
```

#### Module Not Found Errors

```typescript
// Error: Cannot find module '@printers/printers-{platform}'
// Solution: Build the N-API modules
task build:napi

// Or install platform-specific packages
npm install @printers/printers-darwin-arm64
```

#### Runtime Detection Issues

```typescript
// Check runtime detection
import { runtimeInfo } from "@printers/printers";
console.log("Detected runtime:", runtimeInfo.name);

// Force runtime if needed (not recommended)
if (runtimeInfo.name === "unknown") {
  console.warn("Runtime detection failed");
}
```

## Best Practices

1. **Use the universal entry point** - Always import from the main package
2. **Test in simulation mode** - Set `PRINTERS_JS_SIMULATE=true` for development
3. **Handle permissions properly** - Grant required permissions for Deno
4. **Use consistent APIs** - Avoid runtime-specific code when possible
5. **Monitor performance** - Different runtimes have different characteristics
6. **Keep dependencies minimal** - The library has zero runtime dependencies
7. **Update regularly** - Cross-runtime compatibility improves with each release
