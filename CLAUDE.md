# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Development Commands

### Building

```bash
# Build the Rust library (required before running TypeScript code)
deno task build
# Equivalent to: cargo build --release
```

### Running

```bash
# Run the main module with example usage
deno task dev
# Equivalent to: deno run --allow-ffi --unstable-ffi --watch mod.ts
```

### Testing

```bash
# Run safe tests (simulation mode, no actual printing)
deno task test
# Equivalent to: deno test --allow-ffi --unstable-ffi --allow-env test_safe.ts

# Run tests with real printer operations (⚠️ WARNING: WILL ACTUALLY PRINT!)
deno task test:real
# Equivalent to: deno test --allow-ffi --unstable-ffi mod.test.ts
```

### Manual Commands

```bash
# Build for release
cargo build --release

# Run individual TypeScript files
deno run --allow-ffi --unstable-ffi --allow-env your-script.ts
```

## Architecture

This is a **Deno library** that provides **FFI (Foreign Function Interface)
bindings** to a **Rust native library** for printer operations.

### Core Components

1. **Rust Native Library** (`src/lib.rs`)
   - Built as a `cdylib` (C dynamic library)
   - Uses the Rust `printers` crate for actual printer operations
   - Exports C-compatible functions for FFI
   - Handles job tracking with background threads
   - Supports both real printing and simulation modes

2. **TypeScript FFI Layer** (`mod.ts`)
   - Uses Deno's `Deno.dlopen()` to load the compiled Rust library
   - Provides JavaScript-friendly wrapper around C functions
   - Includes the main `Printer` class and utility functions
   - Handles C string conversion and memory management

3. **TypeScript Type Definitions** (`types.d.ts`)
   - Contains type definitions for public API
   - Exports interfaces like `JobStatus` and enums like `PrintError`

### Key Design Patterns

- **FFI Bridge**: TypeScript calls native Rust functions through FFI
- **Asynchronous Job Tracking**: Print jobs run in background threads with
  polling-based status monitoring
- **Simulation Mode**: Controlled by `DENO_PRINTERS_SIMULATE` environment
  variable for safe testing
- **Memory Safety**: Proper C string allocation/deallocation through
  `free_string()` function

### Platform Compatibility

- Windows: Loads `deno_printers.dll`
- macOS: Loads `deno_printers.dylib`
- Linux: Loads `deno_printers.so`

## Safety Considerations

⚠️ **This library can send real print jobs to physical printers!**

- Default test mode (`deno task test`) uses simulation and won't actually print
- Set `DENO_PRINTERS_SIMULATE=true` environment variable to force simulation
  mode
- Use `deno task test:real` only when you intentionally want to test real
  printing

## Required Permissions

All scripts using this library must run with:

- `--allow-ffi` - Required for loading the native library
- `--unstable-ffi` - Deno's FFI is still unstable
- `--allow-env` - Optional, for reading `DENO_PRINTERS_SIMULATE` environment
  variable

## Dependencies

- **Rust dependencies** (in `Cargo.toml`):
  - `printers = "2.2.0"` - Core printer functionality
  - `lazy_static = "1.5.0"` - Global static variables
  - `serde_json = "1.0.143"` - JSON serialization

- **Deno dependencies** (in `deno.json`):
  - `@std/assert` - Testing assertions
  - `@std/path` - Path manipulation utilities

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

## Critical Architecture Changes (Recent Updates)

### Thread Management and Memory Safety

⚠️ **IMPORTANT**: The library now includes proper thread cleanup to prevent
segfaults:

- **Background Thread Management**: The Rust library spawns background threads
  for print job monitoring. These threads must be properly cleaned up to prevent
  segfaults on process exit.

- **Shutdown Mechanism**: A `shutdown_library()` function is now available that:
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
- The `DENO_PRINTERS_SIMULATE=true` environment variable remains the safest way
  to test
- Background threads are properly terminated after test completion

### Debugging Segfaults

If you encounter segfaults in the future:

1. **Check Thread Management**: Verify all spawned threads are being tracked and
   cleaned up
2. **Verify Shutdown Calls**: Ensure `shutdown_library()` is being called before
   process exit
3. **Monitor Static Resources**: Check that global static variables aren't being
   accessed after cleanup
4. **Test in Simulation**: Use `DENO_PRINTERS_SIMULATE=true` to isolate FFI vs.
   printer driver issues
