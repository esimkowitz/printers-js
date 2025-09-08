# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is a **cross-runtime printer library** for JavaScript that supports
**Deno**, **Bun**, and **Node.js** with a unified API. Each runtime uses
different native bindings but exposes the same interface.

## Quick Start Commands

### Primary Entrypoint

**⭐ Always use `index.ts` as the primary entrypoint** - it auto-detects the
runtime and loads the appropriate implementation:

```bash
# Universal entrypoint (RECOMMENDED - works in all runtimes)
deno run --allow-ffi --allow-env index.ts
node -e "import('./index.ts')"
bun index.ts
```

### CI and Status Checks

The CI system provides comprehensive testing with:

- **Cross-runtime compatibility tests** across Deno, Bun, and Node.js
- **Rust library unit tests** with simulation mode
- **Automated PR status checks** with detailed test result reporting
- **LCOV coverage analysis** with actual percentage calculations
- **JUnit XML test reports** for all runtimes

### Building and Testing

```bash
# Build all runtimes (recommended)
deno run --allow-run --allow-read --allow-env scripts/build-all.ts

# Build individual runtimes
deno task build          # Build FFI library (Deno/Bun)
npm run build            # Build N-API module (Node.js)

# Test all runtimes with comprehensive reporting
deno run --allow-run --allow-write --allow-read --allow-env scripts/test-all.ts

# Test individual runtimes
deno task test                    # Deno tests with shared.test.ts
npx tsx tests/node-test-runner.ts # Node.js tests with c8 coverage
bun test tests/                   # Bun tests

# Runtime-specific entrypoints (use only for debugging)
deno run --allow-ffi --allow-env deno.ts   # Deno-specific
bun bun.js                                  # Bun-specific
node node.js                                # Node.js-specific
```

### Development Workflow

```bash
# Run comprehensive tests (generates JUnit XML + LCOV coverage)
deno run --allow-run --allow-write --allow-read --allow-env scripts/test-all.ts

# Run CI locally with nektos/act
deno run --allow-run --allow-env --allow-read scripts/run-ci-local.ts --build

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

### Primary Entry Point

- **`index.ts`**: ⭐ **PRIMARY UNIVERSAL ENTRY POINT** - auto-detects runtime
  and loads appropriate implementation. Always use this for consistent behavior.

### Runtime-Specific Implementation Files

- **`deno.ts`**: Deno-specific implementation (FFI-based)
- **`bun.js`**: Bun-specific implementation (FFI-based)
- **`node.js`**: Node.js-specific implementation (N-API wrapper)

### Backend

- **`src/core.rs`**: Shared business logic for all runtimes
- **`src/ffi.rs`**: FFI bindings for Deno/Bun
- **`src/napi.rs`**: N-API bindings for Node.js

### Testing

- **`tests/shared.test.ts`**: Cross-runtime test suite using index.ts
- **`tests/node-test-runner.mjs`**: Custom Node.js test runner with TypeScript
  support and c8 coverage generation

### Automation

- **`scripts/`**: Cross-platform Deno TypeScript automation scripts

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
- `deno lint` - Lint Deno-managed files (deno.ts, tests/shared.test.ts,
  scripts/)
- `npm run lint` - Lint non-Deno files (index.ts, node.ts, bun.ts,
  tests/node-test-runner.ts)
- `cargo clippy` - Lint Rust code

## File Organization

- **Root**: Runtime entry points (`deno.ts`, `bun.js`, `node.js`, `index.ts`)
- **`src/`**: Rust source code with modular architecture
- **`tests/`**: Test files organized by runtime and purpose
- **`scripts/`**: Cross-platform Deno TypeScript build and test automation
  scripts
- **`.devcontainer/`**: Development container setup for all runtimes
- **`napi/`**: Auto-generated N-API modules (gitignored)
- **`target/`**: Rust build artifacts (gitignored)
- **`test-results/`**: Generated test reports and coverage (gitignored)

## Key Gotchas

1. **N-API modules auto-generate into `napi/` subdirectory** - don't commit
   these
2. **Different binary formats**: FFI uses `.dylib/.so/.dll`, N-API uses `.node`
3. **Test files**: Use `tests/shared.test.ts` for all cross-runtime testing
4. **Simulation mode**: Always test with `PRINTERS_JS_SIMULATE=true` first
5. **Thread cleanup**: The library automatically handles background thread
   cleanup
6. **CI testing**: Use `deno run scripts/run-ci-local.ts` to test workflows
   locally
7. **Coverage reporting**: Tests generate comprehensive JUnit XML and LCOV
   coverage reports with actual percentage calculations (deno-lcov.info,
   node-lcov.info, bun-lcov.info, rust.lcov)
8. **Cross-platform scripts**: All build and test scripts are now Deno
   TypeScript for cross-platform compatibility
9. **Universal entrypoint**: Always import from `index.ts` for consistent
   runtime detection and behavior
10. **Android support**: Intentionally excluded from N-API builds

## Detailed Documentation

For comprehensive technical details, architecture documentation, and
contribution guidelines, see:

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Complete development documentation
- **[README.md](./README.md)** - User-facing documentation and examples

---

**Key Principle**: This codebase prioritizes **cross-runtime compatibility**
while maintaining **identical APIs** across Deno, Bun, and Node.js. When making
changes, always ensure all three runtimes continue to work consistently.

## Response Guidelines

- Prioritize technical accuracy over validation
- Verify claims by examining the codebase or external sources
- Disagree when technical facts contradict statements
- Focus on objective problem-solving rather than agreement
- never commit changes on behalf of the user, always let the user submit changes