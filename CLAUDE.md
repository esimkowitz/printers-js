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
task build

# Build individual runtimes
task build:ffi           # Build FFI library (Deno/Bun)
task build:napi          # Build N-API module (Node.js)

# Test all runtimes with comprehensive reporting
task test

# Test individual runtimes
task test:deno           # Deno tests with shared.test.ts
task test:node                    # Node.js tests with c8 coverage
task test:bun                     # Bun tests

# Runtime-specific entrypoints (use only for debugging)
deno run --allow-ffi --allow-env deno.ts   # Deno-specific
bun bun.js                                  # Bun-specific
node node.js                                # Node.js-specific
```

### Development Workflow

```bash
# Run comprehensive tests (generates JUnit XML + LCOV coverage)
task test:all

# Run CI locally with nektos/act
task ci:local

# Format code
task fmt

# Lint code
task lint

# Type check all entry points
task check:all
```

### Version Management

```bash
task bump:patch    # 0.1.4 -> 0.1.5
task bump:minor    # 0.1.4 -> 0.2.0
task bump:major    # 0.1.4 -> 1.0.0
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

- **`lib/core.rs`**: Shared business logic for all runtimes
- **`lib/ffi.rs`**: FFI bindings for Deno/Bun
- **`lib/napi.rs`**: N-API bindings for Node.js

### Testing

- **`tests/shared.test.ts`**: Cross-runtime test suite using index.ts
- **`tests/node-test-runner.mjs`**: Custom Node.js test runner with TypeScript
  support and c8 coverage generation

### Automation

**Deno Scripts** (TypeScript):

- **`scripts/build-all.ts`**: Cross-runtime build orchestration
- **`scripts/test-all.ts`**: Comprehensive test runner with coverage reports
- **`scripts/run-ci-local.ts`**: Local CI simulation
- **`scripts/bump-version.ts`**: Version management

**Node.js Scripts** (ESM JavaScript):

- **`scripts/build-napi.js`**: N-API module building (requires Node.js
  subprocess environment)
- **`scripts/remove-env-check.js`**: Post-build N-API processing for JSR
  compatibility
- **`scripts/build-all-node.js`**: Alternative Node.js-based build script

**Script Runtime Selection**: Deno handles automation/orchestration; Node.js
handles N-API builds that require specific subprocess environments and must run
on Windows ARM CI runners where Deno is not available.

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
  scripts/*.ts)
- `task lint` - Lint all files (runs both Deno and Node.js linters)
- `cargo clippy` - Lint Rust code

## File Organization

- **`src/`**: TypeScript implementation files with modular architecture
- **`lib/`**: Rust source code with modular architecture
- **`tests/`**: Test files organized by runtime and purpose
- **`scripts/`**: Mixed runtime automation - Deno TypeScript for orchestration,
  Node.js JavaScript for N-API builds
- **`.devcontainer/`**: Development container setup for all runtimes
- **`npm/`**: Platform-specific N-API packages for all N-API operations
  (gitignored)
- **`target/`**: Rust build artifacts (gitignored)
- **`test-results/`**: Generated test reports and coverage (gitignored)

## Key Gotchas

1. **N-API build architecture**: `npm run build` creates `npm/platform/`
   directories for all N-API operations - don't commit these
2. **Different binary formats**: FFI uses `.dylib/.so/.dll`, N-API uses `.node`
3. **Test files**: Use `tests/shared.test.ts` for all cross-runtime testing
4. **Simulation mode**: Always test with `PRINTERS_JS_SIMULATE=true` first
5. **Thread cleanup**: The library automatically handles background thread
   cleanup
6. **CI testing**: Use `task ci:local` to test workflows locally
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
- **No unnecessary friendly phrases** - avoid "Perfect!", "Much better!",
  "Great!", etc. in responses
- **Professional communication** - be direct and informative without excessive
  enthusiasm

## Documentation Style Preferences

### Writing Style

- **Concise and direct** - avoid verbose explanations and marketing language
- **Technical accuracy** - state facts without embellishment
- **Professional tone** - straightforward and informative

### Documentation Structure

- **Brief introductions** - get to the point quickly
- **Clear API documentation** - comprehensive but concise function/class
  descriptions
- **Practical examples** - show real usage patterns, not contrived demos
- **Logical organization** - installation → usage → API → examples → technical
  details

### Language Guidelines

- Remove marketing phrases like "comprehensive", "powerful", "seamless",
  "cutting-edge"
- Use emojis sparingly - acceptable in feature summaries for visual appeal
- Avoid superlatives and sales language
- Focus on what the code does, not how amazing it is

### README vs CONTRIBUTING

- **README.md**: User-focused with API docs, examples, installation
- **CONTRIBUTING.md**: Developer-focused with architecture, build processes,
  workflows
