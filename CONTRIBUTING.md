# Contributing to @printers/printers

This document provides detailed technical information for developers working on
this cross-runtime printer library.

## Cross-Runtime Architecture

This is a **cross-platform printer library** that supports **multiple JavaScript
runtimes**:

- **Deno** via FFI (Foreign Function Interface)
- **Bun** via FFI
- **Node.js** via N-API (Native API)

All runtimes provide the same consistent API for printer operations.

## Core Components

### 1. **Modular Rust Backend**

- **`src/core.rs`**: Shared business logic for all runtimes
- **`src/ffi.rs`**: FFI bindings for Deno/Bun (C-compatible functions)
- **`src/napi.rs`**: N-API bindings for Node.js (with AsyncTask support)
- **`src/lib.rs`**: Module orchestration with feature flags

### 2. **Runtime-Specific Entry Points**

- **`deno.ts`**: Deno entry point using `Deno.dlopen()` FFI
- **`bun.js`**: Bun entry point using `dlopen()` FFI with `CString` handling
- **`node.mjs`**: Node.js wrapper around N-API module (ES module)
- **`napi/index.js`**: Auto-generated N-API module loader (in subdirectory)

### 3. **Unified API Surface**

All runtimes expose the same consistent API:

- `getAllPrinters()`, `getAllPrinterNames()`, `getPrinterByName()`
- `Printer` class with properties and `printFile()` method
- `getJobStatus()`, `cleanupOldJobs()`, `shutdown()` utility functions

## Key Design Patterns

- **Dual-Binary Architecture**:
  - FFI binaries for Deno/Bun: `libdeno_printers.{dylib,so,dll}`
  - N-API binaries for Node.js: `printers.{platform}-{arch}.node`
- **Runtime Detection**: Automatic JavaScript runtime detection with fallbacks
- **Asynchronous Job Tracking**: Print jobs run in background threads with
  polling-based status monitoring
- **Consistent Async Support**: All runtimes support async `printFile()`
  operations
- **Simulation Mode**: Controlled by `PRINTERS_JS_SIMULATE=true` for safe
  testing
- **Memory Safety**: Proper cleanup with `FinalizationRegistry` and explicit
  disposal

## Runtime-Specific Implementation Details

### **Deno** (`mod.ts`)

- Uses `Deno.dlopen()` with FFI function signatures
- Loads `libdeno_printers.dylib` (universal binary)
- C string conversion via `CString` utility functions
- Permissions required: `--allow-ffi --allow-env`

### **Bun** (`bun.js`)

- Uses `dlopen()` from `bun:ffi` with similar signatures to Deno
- CString handling via Bun's built-in `CString` class
- Same binary as Deno: `libdeno_printers.dylib`
- Supports simulation mode and all printer operations

### **Node.js** (`node.mjs` + `napi/`)

- Uses N-API via `napi-rs` framework with `AsyncTask` pattern
- Auto-generated platform-specific binaries: `printers.darwin-arm64.node`
- N-API modules are generated into `napi/` subdirectory to keep root clean
- Provides same async API as other runtimes

## Development Commands

### Building

#### **For Deno/Bun (FFI)**

```bash
# Build the Rust FFI library
deno task build
# Equivalent to: cargo build --release
```

#### **For Node.js (N-API)**

```bash
# Build the N-API module (auto-moves to napi/ subdirectory)
npm run build
# Equivalent to: napi build --platform --release && mkdir -p napi && mv index.js *.node napi/
```

#### **Cross-Runtime Testing**

```bash
# Test Deno
deno run --allow-ffi --allow-env mod.ts

# Test Bun
bun bun.js

# Test Node.js
node node.mjs
```

### Running

```bash
# Run the main module with example usage (Deno)
deno task dev
# Equivalent to: deno run --allow-ffi --watch deno.ts
```

### Testing

```bash
# Run comprehensive cross-runtime tests (recommended)
./scripts/test-all.sh
# - Tests all runtimes (Deno, Bun, Node.js)
# - Generates JUnit XML reports
# - Generates LCOV coverage reports
# - Uses simulation mode for safety

# Run individual runtime tests
deno task test              # Deno with universal.test.ts
npm run test:jest           # Node.js with Jest
bun test tests/bun.test.ts  # Bun tests

# Run tests with real printer operations (⚠️ WARNING: WILL ACTUALLY PRINT!)
deno task test:real
# Equivalent to: deno test --allow-ffi --allow-env tests/universal.test.ts
```

### Local CI Testing

```bash
# Test CI workflows locally using nektos/act
./scripts/run-ci-local.sh --build

# Dry run to see what would be executed
./scripts/run-ci-local.sh --dry-run
```

### Manual Commands

```bash
# Build for release
cargo build --release

# Build with N-API features
cargo build --release --features=napi

# Run individual TypeScript files
deno run --allow-ffi --allow-env your-script.ts
```

## Safety Considerations

⚠️ **This library can send real print jobs to physical printers!**

- Default test mode (`deno task test`) uses simulation and won't actually print
- Set `PRINTERS_JS_SIMULATE=true` environment variable to force simulation mode
- Use `deno task test:real` only when you intentionally want to test real
  printing

## Required Permissions

### Deno/Bun

- `--allow-ffi` - Required for loading the native library
- `--allow-env` - Optional, for reading `PRINTERS_JS_SIMULATE` environment
  variable

### Node.js

- No special permissions required (N-API modules are pre-compiled)

## Dependencies

### **Rust dependencies** (in `Cargo.toml`):

- `printers = "2.2.0"` - Core printer functionality
- `lazy_static = "1.5.0"` - Global static variables
- `serde_json = "1.0.143"` - JSON serialization
- `napi = "3"` (optional) - N-API bindings for Node.js
- `napi-derive = "3"` (optional) - N-API derive macros

### **Deno dependencies** (in `deno.json`):

- `@std/assert` - Testing assertions
- `@std/path` - Path manipulation utilities
- `@std/semver` - Version management

### **Node.js dependencies** (in `package.json`):

- `@napi-rs/cli` - N-API build toolchain

## Code Quality Requirements

ALWAYS run these commands after making code changes:

- **After modifying TypeScript files**: Run `deno lint` to check for linting
  issues
- **After modifying Rust files**: Run `cargo clippy` to check for linting issues
- **After modifying Rust or Cargo files**: Run `cargo fmt` to format Rust code
- **After modifying any files**: Run `deno fmt` to format files (excludes files
  in `deno.json` `fmt.exclude` field)

These commands must pass before considering any changes complete.

## Version Management

### Semantic Version Bumping

Use the built-in version bump utility to update versions across both `deno.json`
and `Cargo.toml`:

```bash
# Bump patch version (0.1.4 -> 0.1.5)
deno task bump:patch

# Bump minor version (0.1.4 -> 0.2.0)
deno task bump:minor

# Bump major version (0.1.4 -> 1.0.0)
deno task bump:major
```

The version bump script (`scripts/bump-version.ts`):

- Uses the official Deno Standard Library `@std/semver` package
- Updates both `deno.json` and `Cargo.toml` versions synchronously
- Follows proper semantic versioning rules
- Provides clear error messages and validation

## Critical Architecture Details

### Thread Management and Memory Safety

⚠️ **IMPORTANT**: The library includes proper thread cleanup to prevent
segfaults:

- **Background Thread Management**: The Rust library spawns background threads
  for print job monitoring. These threads must be properly cleaned up to prevent
  segfaults on process exit.

- **Shutdown Mechanism**: A `shutdown_library()` function is available that:
  - Sets a shutdown flag to signal all background threads to stop
  - Waits for threads to complete (with 5-second timeout)
  - Clears job tracking resources

- **Automatic Cleanup**: The TypeScript layer automatically calls shutdown on:
  - Process exit (`Deno.exit`)
  - Browser unload events
  - Process signals (SIGINT, SIGTERM, etc.)

- **Manual Cleanup**: You can also manually call `shutdown()` from TypeScript if
  needed:

  ```typescript
  import { shutdown } from "./mod.ts";

  // Clean shutdown before exit
  shutdown();
  ```

### Memory Management Pattern

The library uses several patterns to ensure memory safety:

1. **Static Resource Management**: Uses `lazy_static` for global job tracking
   with proper cleanup
2. **Thread-Safe Operations**: All shared resources are protected with
   `Arc<Mutex<T>>`
3. **Graceful Degradation**: Threads check shutdown flags and exit cleanly
4. **Timeout Protection**: Shutdown waits maximum 5 seconds to prevent hanging

### Testing Considerations

- Tests now complete without segfaults due to proper thread cleanup
- The `PRINTERS_JS_SIMULATE=true` environment variable remains the safest way to
  test
- Background threads are properly terminated after test completion

### Debugging Segfaults

If you encounter segfaults in the future:

1. **Check Thread Management**: Verify all spawned threads are being tracked and
   cleaned up
2. **Verify Shutdown Calls**: Ensure `shutdown_library()` is being called before
   process exit
3. **Monitor Static Resources**: Check that global static variables aren't being
   accessed after cleanup
4. **Test in Simulation**: Use `PRINTERS_JS_SIMULATE=true` to isolate FFI vs.
   printer driver issues

## N-API Module Organization

### Build System

- N-API modules are automatically built to `napi/` subdirectory to keep root
  directory clean
- Auto-generated files: `napi/index.js` and
  `napi/printers.{platform}-{arch}.node`
- These files are excluded from git via `.gitignore`

### VSCode Configuration

- `.vscode/settings.json` includes runtime-specific linter and formatter
  settings
- **Deno files**: Use Deno LSP and formatter
- **Bun files**: Use Bun VSCode extension formatter
- **Node.js files**: Use Prettier formatter
- **JavaScript files**: Use Prettier formatter

## Feature Flags and Build Configuration

### Cargo Features

- `default = []` - Default to FFI-only build
- `napi = ["dep:napi", "dep:napi-derive", "dep:napi-build"]` - Enable N-API
  support

### Build Targets

- **FFI**: `cargo build --release` (for Deno/Bun)
- **N-API**: `npm run build` (for Node.js, uses napi-rs)

### File Structure

```
├── src/
│   ├── core.rs        # Shared business logic
│   ├── ffi.rs         # FFI bindings (Deno/Bun)
│   ├── napi.rs        # N-API bindings (Node.js)
│   ├── node.rs        # Node.js entry point
│   └── lib.rs         # Module orchestration
├── mod.ts             # Deno entry point
├── bun.js             # Bun entry point
├── node.mjs           # Node.js wrapper (ES module)
├── napi/              # Auto-generated N-API modules
│   ├── index.js       # Platform detection & loading
│   └── *.node         # Platform-specific binaries
└── target/release/    # FFI binaries
    └── libdeno_printers.{dylib,so,dll}
```

## Known Issues

### Node.js N-API Module Self-Registration

Currently, the N-API module builds successfully but encounters self-registration
issues at runtime. This is being investigated. The AsyncTask implementation is
correct, but the module initialization may need additional work.

**Workaround**: For now, Deno and Bun provide full functionality. Node.js
support is architecturally complete but requires runtime debugging.
