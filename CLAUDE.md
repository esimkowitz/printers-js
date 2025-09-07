# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is a **cross-runtime printer library** for JavaScript that supports
**Deno**, **Bun**, and **Node.js** with a unified API. Each runtime uses
different native bindings but exposes the same interface.

## Quick Start Commands

### Building and Testing

```bash
# Build all runtimes (recommended)
./scripts/build-all.sh

# Build individual runtimes
deno task build          # Build FFI library (Deno/Bun)
npm run build            # Build N-API module (Node.js)

# Test all runtimes with comprehensive reporting
./scripts/test-all.sh

# Test individual runtimes
deno task test           # Deno tests with universal.test.ts
npm run test:jest        # Node.js Jest tests  
bun test tests/bun.test.ts  # Bun tests

# Run programs
deno run --allow-ffi --allow-env deno.ts   # Deno
bun bun.js                                  # Bun  
node node.js                                # Node.js
deno run --allow-ffi --allow-env index.ts  # Universal entrypoint
```

### Development Workflow

```bash
# Run comprehensive tests (generates JUnit XML + LCOV coverage)
./scripts/test-all.sh

# Run CI locally with nektos/act
./scripts/run-ci-local.sh --build

# Format code
deno fmt
cargo fmt

# Lint code
deno lint
cargo clippy

# Type check all entry points
deno task check:all
```

### Version Management

```bash
deno task bump:patch    # 0.1.4 -> 0.1.5
deno task bump:minor    # 0.1.4 -> 0.2.0
deno task bump:major    # 0.1.4 -> 1.0.0
```

## Architecture Summary

- **`src/core.rs`**: Shared business logic for all runtimes
- **`src/ffi.rs`**: FFI bindings for Deno/Bun
- **`src/napi.rs`**: N-API bindings for Node.js
- **`deno.ts`**: Deno entry point (native Deno API)
- **`bun.js`**: Bun entry point (FFI-based)
- **`node.js`**: Node.js wrapper around N-API module in `napi/` subdirectory
- **`index.ts`**: Universal entry point - auto-detects runtime and loads
  appropriate implementation
- **`tests/universal.test.ts`**: Cross-runtime test suite using universal entry
  point
- **`tests/*.jest.js`**: Node.js-specific Jest tests with JUnit XML output
- **`tests/bun.test.ts`**: Bun-specific tests with coverage

## Safety Reminders

⚠️ **This library sends real print jobs to physical printers!**

- Always use `PRINTERS_JS_SIMULATE=true` for safe testing
- Default tests use simulation mode automatically
- Scripts like `test-all.sh` automatically set simulation mode
- Only disable simulation mode when intentionally testing real printing
- The devcontainer sets `PRINTERS_JS_SIMULATE=true` by default

## Code Quality Requirements

ALWAYS run these after changes:

- `deno fmt` - Format TypeScript/JavaScript
- `cargo fmt` - Format Rust code
- `deno lint` - Lint Deno files
- `cargo clippy` - Lint Rust code

## File Organization

- **Root**: Runtime entry points (`deno.ts`, `bun.js`, `node.js`, `index.ts`)
- **`src/`**: Rust source code with modular architecture
- **`tests/`**: Test files organized by runtime and purpose
- **`scripts/`**: Build and test automation scripts
- **`.devcontainer/`**: Development container setup for all runtimes
- **`napi/`**: Auto-generated N-API modules (gitignored)
- **`target/`**: Rust build artifacts (gitignored)
- **`test-results/`**: Generated test reports and coverage (gitignored)

## Key Gotchas

1. **N-API modules auto-generate into `napi/` subdirectory** - don't commit
   these
2. **Different binary formats**: FFI uses `.dylib/.so/.dll`, N-API uses `.node`
3. **Test files**: Use `tests/universal.test.ts`, not the old `mod.test.ts`
4. **Simulation mode**: Always test with `PRINTERS_JS_SIMULATE=true` first
5. **Thread cleanup**: The library automatically handles background thread
   cleanup
6. **CI testing**: Use `./scripts/run-ci-local.sh` to test workflows locally
7. **Coverage reporting**: Tests generate both JUnit XML and LCOV coverage
8. **Android support**: Intentionally excluded from N-API builds

## Detailed Documentation

For comprehensive technical details, architecture documentation, and
contribution guidelines, see:

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Complete development documentation
- **[README.md](./README.md)** - User-facing documentation and examples

---

**Key Principle**: This codebase prioritizes **cross-runtime compatibility**
while maintaining **identical APIs** across Deno, Bun, and Node.js. When making
changes, always ensure all three runtimes continue to work consistently.
