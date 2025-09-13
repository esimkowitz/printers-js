# Contributing to @printers/printers

This document provides technical documentation for contributing to this cross-runtime printer library.

## Architecture Overview

This library provides unified printer functionality across multiple JavaScript runtimes:

- **Cross-runtime compatibility**: Uses N-API modules (`.node`) for Deno, Bun, and Node.js
- **Native performance**: Rust backend provides shared business logic
- **Single API**: Identical interface across all supported runtimes

### File Structure

```
lib/                    # Rust backend source
├── core.rs            # Shared business logic
├── napi.rs            # N-API bindings (all runtimes)
└── lib.rs             # Module orchestration

src/                    # TypeScript/JavaScript source
└── index.ts           # Universal entry point (N-API based, all runtimes)

tests/
├── shared.test.ts     # Cross-runtime test suite
└── node-test-runner.ts # Custom Node.js test runner

scripts/                # Build and automation scripts (Node.js)
├── build-all.js       # Cross-runtime build orchestration
├── test-all.js        # Comprehensive test runner
├── bump-version.js    # Version management
├── run-ci-local.js    # Local CI simulation
├── compile.js         # TypeScript compilation
└── remove-env-check.js # Post-build N-API processing

# Generated artifacts (gitignored)
npm/               # N-API platform packages for publishing
target/release/    # N-API binaries
test-results/      # Test reports and coverage
dist/              # Compiled JavaScript output
```

## Development

### Prerequisites

Install the required development tools:

**Required Tools:**

1. **Rust** - Core backend development
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup update
   ```

2. **Task** - Build automation ([taskfile.dev](https://taskfile.dev/))
   ```bash
   # macOS (Homebrew)
   brew install go-task
   
   # Linux/Windows (Go)
   go install github.com/go-task/task/v3/cmd/task@latest
   
   # Or download binary from https://github.com/go-task/task/releases
   ```

**JavaScript Runtimes (install as needed):**

1. **Node.js** - Required for build scripts and N-API builds
   ```bash
   # Use nvm, fnm, or download from nodejs.org
   # Requires Node.js 20+ for N-API builds and automation scripts
   ```

2. **Deno** - For Deno runtime testing
   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   ```

3. **Bun** - For Bun runtime testing
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

**Verify installation:**

```bash
task --version
rustc --version
deno --version    # if installed
node --version    # if installed
bun --version     # if installed
```

### Build Commands

```bash
# Build everything (recommended)
task build

# Individual build steps
task build:napi          # Build N-API module
task compile             # Compile TypeScript to JavaScript
```

The N-API build process:

1. Auto-detects current platform (darwin-arm64, linux-x64-gnu, etc.)
2. Creates npm platform directories using `napi create-npm-dirs`
3. Builds platform-specific binaries with napi-rs directly to `npm/platform/`
4. Removes `NAPI_RS_NATIVE_LIBRARY_PATH` check for npm compatibility

This approach uses the official NAPI-RS `npm/` directory structure for all N-API
operations.

### Scripts and Automation

All build and automation scripts use Node.js for consistency:

**Node.js Scripts** (ESM JavaScript with Node runtime):

- `scripts/build-all.js` - Cross-runtime build orchestration
- `scripts/test-all.js` - Comprehensive test runner with coverage
- `scripts/run-ci-local.js` - Local CI simulation
- `scripts/bump-version.js` - Version management
- `scripts/compile.js` - TypeScript compilation
- `scripts/remove-env-check.js` - Post-build N-API processing

**Why Node.js scripts?**

- Node.js provides the most consistent cross-platform compatibility
- N-API builds integrate seamlessly with Node.js tooling
- All CI environments support Node.js, ensuring reliable automation
- Unified toolchain simplifies development and maintenance

### Testing

**Primary test commands:**
```bash
task test               # Run all tests (simulation mode) - recommended
task test:real          # Run all tests with real printing
```

**Runtime-specific testing:**
```bash
# Simulation mode (safe testing)
task test:deno          # Deno tests
task test:node          # Node.js tests
task test:bun           # Bun tests

# Real printing mode (use with caution)
task test:deno:real     # Deno tests with actual printing
task test:node:real     # Node.js tests with actual printing
task test:bun:real      # Bun tests with actual printing
```

**Additional test commands:**
```bash
task test:doc           # Documentation tests
```

All tests use `PRINTERS_JS_SIMULATE=true` by default. Use `:real` variants to
actually print.

### Code Quality

**Essential commands to run after making changes:**

**Formatting:**
```bash
task fmt                # Format all code (Prettier + Rust fmt)
task fmt:check          # Check formatting without changes
```

**Linting:**
```bash
task lint               # Lint all code
task lint:fix           # Auto-fix linting issues
```

**Type Checking:**
```bash
task check              # Type check all code
```

**Individual tools:**
```bash
# Format specific languages
task fmt:prettier:check # Check TypeScript/JavaScript formatting
task fmt:rust:check     # Check Rust formatting

# Lint specific components
task lint:node          # Lint Node.js files
task lint:rust          # Lint Rust code with Clippy

# Type check specific components
task check:node         # Type check Node.js code
task check:rust         # Type check Rust code
```

## Release Process

**Manual release steps:**

1. **Version bump**:
   ```bash
   task bump:patch    # Bug fixes (0.4.2 → 0.4.3)
   task bump:minor    # New features (0.4.2 → 0.5.0)
   task bump:major    # Breaking changes (0.4.2 → 1.0.0)
   ```

2. **Commit and tag**:
   ```bash
   git add .
   git commit -m "v0.4.3"
   git push
   git tag v0.4.3
   git push origin v0.4.3
   ```

The release workflow (`.github/workflows/release.yml`) is triggered by version
tags and handles:

**Automated CI/CD pipeline** (triggered by version tags):

1. **Cross-platform builds** - N-API modules for all supported platforms
2. **Cross-runtime testing** - Deno, Bun, and Node.js on all platforms
3. **Artifact collection** - Combines all platform-specific binaries
4. **npm publishing** - Publishes with cross-runtime compatibility

### Platform Support

**Supported platforms**:
- **Linux**: `x64-gnu`, `arm64-gnu` (all runtimes)
- **Windows**: `x64-msvc` (all runtimes), `arm64-msvc` (Node.js only)
- **macOS**: `x64`, `arm64` (all runtimes)

### Publishing Strategy

**Primary distribution** via npm registry:
- **Main package**: `@printers/printers` with `optionalDependencies`
- **Platform packages**: `@printers/printers-{platform}` (auto-selected)
- **Cross-runtime access**:
  - Node.js: `npm install @printers/printers`
  - Deno: `deno add npm:@printers/printers`
  - Bun: `bun add @printers/printers`

## npm Publishing

### N-API Build Architecture

The N-API build process integrates with the NAPI-RS publishing workflow:

**Local Development:**

- `scripts/build-napi.js` (Node.js ESM) auto-detects current platform
- Calls `napi create-npm-dirs` to create all platform directories with
  `package.json` files
- Builds using `napi build --platform` for current platform only
- `scripts/remove-env-check.js` removes `NAPI_RS_NATIVE_LIBRARY_PATH` check for
  npm compatibility

**CI/CD Pipeline:**

1. **Cross-platform builds**: Each runner builds only its platform's `.node`
   binary
2. **Artifact separation**: Each platform uploads only its own directory
   (`npm/platform/`)
3. **Artifact reconstruction**: Publish job downloads and combines all platform
   directories
4. **NAPI-RS publishing**: `napi prepublish` publishes main package + all
   platform packages

**Build Flow:**

```bash
# Local: builds current platform only
task build:napi
# → npm/darwin-arm64/printers.darwin-arm64.node (+ other empty dirs)

# CI: each runner builds its platform
# → darwin-arm64 runner: npm/darwin-arm64/printers.darwin-arm64.node
# → linux-x64 runner: npm/linux-x64-gnu/printers.linux-x64-gnu.node
# → etc.

# Publishing: combines all platforms
# → npm/darwin-arm64/printers.darwin-arm64.node
# → npm/linux-x64-gnu/printers.linux-x64-gnu.node
# → npm/win32-x64-msvc/printers.win32-x64-msvc.node
# → etc.
```

### Manual Testing

```bash
# Test npm publishing configuration
npm pack --dry-run
npm publish --dry-run
```

## Memory Management

The Rust backend spawns background threads for job monitoring. These are cleaned
up automatically on process exit, but you can call `shutdown()` manually if
needed.

## Dependencies

**Rust** (`Cargo.toml`):

- `printers = "2.2.0"` - Core printer functionality
- `napi = "3"` - N-API bindings

**Node.js** (`package.json`):

- `@napi-rs/cli` - N-API build toolchain
- `prettier` - Code formatting
- `eslint` - Code linting
- `typescript` - TypeScript compilation
- `semver` - Version management

## CI/CD

### GitHub Actions Workflows

**.github/workflows/build.yml** - PR and main branch testing:

- Cross-runtime compatibility tests (Deno, Bun, Node.js)
- Code quality checks (linting, formatting, type checking)
- Test coverage reporting with JUnit XML and LCOV

**.github/workflows/release.yml** - Release automation:

- Cross-platform native library builds
- Cross-platform N-API module builds
- Cross-runtime integration testing
- npm publishing with cross-runtime support

### Local CI Testing

```bash
# Simulate full CI pipeline locally
task ci:local

# Run comprehensive test suite with coverage
task test

# Individual runtime testing
task test:deno task test:node task test:bun
```

### Coverage Reports

Tests generate comprehensive coverage reports:

- **JUnit XML**: `test-results/{deno,node,bun}-test.xml`
- **LCOV**: `test-results/{deno,node,bun}-lcov.info` + `test-results/rust.lcov`
- **Text summaries**: Console output with actual percentages

## Known Issues

All runtimes (Deno, Bun, and Node.js) work correctly with proper cross-runtime
compatibility.
