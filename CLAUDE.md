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
