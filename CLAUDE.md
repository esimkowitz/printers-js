# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is a **cross-runtime printer library** for JavaScript that supports
**Deno**, **Bun**, and **Node.js** with a unified API. All runtimes use
N-API native bindings with the same interface.

## Quick Start Commands

### Primary Entrypoint

**⭐ Always use `index.ts` as the primary entrypoint** - it auto-detects the
runtime and loads the appropriate implementation:

```bash
# Universal entrypoint (RECOMMENDED - works in all runtimes)
deno run --allow-env --allow-ffi src/index.ts  # --allow-ffi required for N-API
npx tsx src/index.ts
bun src/index.ts
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
# Build N-API module and compile TypeScript (recommended)
task build

# Build N-API module only
task build:napi          # Build N-API module for all runtimes

# Test all runtimes with comprehensive reporting
task test

# Test individual runtimes
task test:deno           # Deno tests with shared.test.ts
task test:node                    # Node.js tests with c8 coverage
task test:bun                     # Bun tests

# Runtime-specific entrypoints (use only for debugging)
deno run --allow-env --allow-ffi src/index.ts  # Deno with N-API (--allow-ffi required)
bun src/index.ts                                # Bun with N-API
npx tsx src/index.ts                            # Node.js with N-API
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

- **`src/index.ts`**: ⭐ **PRIMARY UNIVERSAL ENTRY POINT** - auto-detects runtime
  and loads N-API implementation for all runtimes. Always use this for consistent behavior.

### Backend

- **`lib/core.rs`**: Shared business logic for all runtimes
- **`lib/node.rs`**: N-API bindings for all JavaScript runtimes
- **`lib/napi.rs`**: N-API module definitions

### Testing

- **`tests/shared.test.ts`**: Cross-runtime test suite using src/index.ts
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
- **`scripts/remove-env-check.js`**: Post-build N-API processing
- **`scripts/compile.ts`**: TypeScript to JavaScript compilation for npm publishing
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
- `deno lint` - Lint Deno-managed files (src/index.ts, tests/shared.test.ts,
  scripts/\*.ts)
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
2. **Binary format**: All runtimes use N-API `.node` binaries
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
9. **Universal entrypoint**: Always import from `src/index.ts` for consistent
   runtime detection and behavior
10. **Android support**: Intentionally excluded from N-API builds

## NAPI-RS Publishing and Release Workflow

### Publishing Strategy

This project uses **NAPI-RS optionalDependencies strategy** for npm
distribution:

- **Main package** (`@printers/printers`) contains JavaScript code and
  optionalDependencies
- **Platform packages** (e.g., `@printers/printers-darwin-arm64`) contain native
  binaries
- **Automatic installation** - npm selects correct platform package based on
  OS/CPU

### Release Workflow Architecture

**GitHub Actions release.yml** handles cross-platform builds and publishing:

1. **Separate platform builds**: Each runner builds only its platform's binaries
2. **Artifact separation**: Upload individual platform directories, not entire
   `npm/`
3. **Artifact reconstruction**: Download and combine all platforms before
   publishing
4. **npm publishing**: npm registry (via NAPI-RS prepublish), cross-runtime access via npm: syntax

### Critical Release Workflow Details

- **Permissions**: Release jobs need `contents: write` for GitHub releases
- **Artifact structure**: Upload only `npm/platform/` per runner, not full
  `npm/`
- **Cross-platform scripts**: Use `shell: bash` for Windows compatibility
- **NAPI-RS commands**: `napi create-npm-dirs` + `napi prepublish` workflow
- **Platform matrix**: N-API build jobs for all supported platforms

### Debugging Release Issues

1. Check GitHub Actions logs with `gh run view <run-id> --log-failed`
2. Download artifacts locally with `gh run download <run-id>`
3. Verify platform binaries exist in each artifact
4. Check permissions for GitHub release creation
5. Ensure artifact reconstruction step combines all platforms correctly

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
  "Great!", "You're absolutely right!", "Good idea!", "Excellent question!",
  "That's a fantastic approach!", etc. in responses
- **Professional communication** - be direct and informative without excessive
  enthusiasm or validation language
- **Avoid agreement phrases** - don't use "Exactly!", "Absolutely!", "I totally
  agree!" or similar expressions that prioritize validation over accuracy

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
