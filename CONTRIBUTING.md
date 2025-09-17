# Contributing to @printers/printers

This document provides technical documentation for contributing to the cross-runtime printer library.

## Quick Start

```bash
# Install dependencies
npm install

# Build everything
task build

# Run tests in simulation mode (safe)
task test

# Format and lint code
task fmt
task lint
```

## Architecture Overview

- **Cross-runtime compatibility**: N-API modules for Node.js, Deno, and Bun
- **Native performance**: Rust backend with shared business logic
- **Single API**: Identical interface across all supported runtimes

### File Structure

```
lib/                    # Rust backend source
├── core.rs            # Business logic and state monitoring
├── napi.rs            # N-API bindings
└── lib.rs             # Module orchestration

src/
└── index.ts           # Universal TypeScript entry point

docs/                   # Feature documentation
├── README.md          # Documentation hub
├── CrossRuntimeSupport.md
├── PrintingOptions.md
├── JobTracking.md
└── PrinterStateMonitoring.md

tests/
├── shared.test.ts     # Cross-runtime test suite
└── node-test-runner.ts

scripts/               # Build automation (Node.js)
# Generated (gitignored)
npm/                   # N-API platform packages
target/                # Rust build artifacts
```

## Development Setup

### Prerequisites

**Required:**

1. **Rust** - Backend development

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Task** - Build automation ([taskfile.dev](https://taskfile.dev/))

   ```bash
   # macOS
   brew install go-task

   # Linux/Windows
   go install github.com/go-task/task/v3/cmd/task@latest
   ```

3. **Node.js 20+** - Build scripts and N-API builds

**Optional (for testing specific runtimes):**

- **Deno** - Requires `"nodeModulesDir": "auto"` in `deno.json` and `--allow-ffi` flag
- **Bun** - For Bun runtime testing

### Build System

```bash
# Complete build
task build              # Builds N-API + compiles TypeScript

# Individual steps
task build:napi         # Build N-API module for current platform
task compile            # Compile TypeScript only
```

**N-API Build Process:**

1. Auto-detects platform (darwin-arm64, linux-x64-gnu, etc.)
2. Creates npm platform directories with `napi create-npm-dirs`
3. Builds platform-specific `.node` binaries
4. Removes `NAPI_RS_NATIVE_LIBRARY_PATH` check for npm compatibility

## Testing

```bash
# Simulation mode (recommended for development)
task test               # All runtimes
task test:deno          # Deno only
task test:node          # Node.js only
task test:bun           # Bun only

# Real printing (use with caution)
task test:real          # All runtimes with actual printing
```

**Safety:** All tests use `PRINTERS_JS_SIMULATE=true` by default to prevent accidental printing.

## Code Quality

**Run these commands before committing:**

```bash
task fmt                # Format all code (Prettier + Rust)
task lint               # Lint all code (ESLint + Clippy)
task check              # Type check everything
```

**Individual tools:**

```bash
# Formatting
task fmt:prettier:check # Check TypeScript/JavaScript
task fmt:rust:check     # Check Rust

# Linting
task lint:eslint        # Lint TypeScript/JavaScript
task lint:rust          # Lint Rust with Clippy

# Type checking
task check:node         # TypeScript
task check:rust         # Rust
```

## Release Process

1. **Version bump:**

   ```bash
   task bump:patch    # 0.4.2 → 0.4.3
   task bump:minor    # 0.4.2 → 0.5.0
   task bump:major    # 0.4.2 → 1.0.0
   ```

2. **Commit and tag:**
   ```bash
   git add .
   git commit -m "v0.4.3"
   git push
   git tag v0.4.3
   git push origin v0.4.3
   ```

The GitHub Actions release workflow handles cross-platform builds and npm publishing automatically when version tags are pushed.

## Platform Support

**Supported platforms:**

- **Linux**: x64-gnu, arm64-gnu (all runtimes)
- **macOS**: x64, arm64 (all runtimes)
- **Windows**: x64-msvc (all runtimes), arm64-msvc (Node.js only)

## Publishing Architecture

**Distribution via npm:**

- **Main package**: `@printers/printers` with `optionalDependencies`
- **Platform packages**: `@printers/printers-{platform}` (auto-selected)

**Runtime access:**

- Node.js: `npm install @printers/printers`
- Deno: `deno add npm:@printers/printers`
- Bun: `bun add @printers/printers`

## CI/CD Pipeline

### Workflows

1. **`.github/workflows/ci.yml`** - PR and main branch testing
   - Cross-runtime compatibility tests
   - Code quality checks (formatting, linting)
   - Test coverage generation
   - Runs with minimal permissions (secure)

2. **`.github/workflows/ci-report.yml`** - PR reporting
   - Posts test results and coverage to PRs
   - Creates status checks
   - Never executes PR code (secure)

3. **`.github/workflows/release.yml`** - Release automation
   - Cross-platform N-API builds
   - npm publishing

### Security Design

- Uses `pull_request` trigger (not `pull_request_target`) for security
- Separates code execution from privileged operations
- Artifact-based communication between workflows

### Local CI Testing

```bash
task ci:local           # Simulate full CI pipeline
```

## Memory Management

The Rust backend automatically cleans up background threads on process exit. Manual cleanup is available via `shutdown()` if needed.

## Dependencies

**Core dependencies:**

- **Rust**: `printers = "2.2.0"`, `napi = "3"`
- **Node.js**: `@napi-rs/cli`, `prettier`, `eslint`, `typescript`

## Troubleshooting

### Windows Symlink Issues

If encountering symlink errors on Windows:

1. **Enable Developer Mode** (recommended)
2. **Clone with symlink support:**
   ```bash
   git clone -c core.symlinks=true <repository-url>
   ```

### PR Comments/Status Checks

- Comments appear after both `ci.yml` and `ci-report.yml` complete
- Status checks: "Code Quality" and "CI / Tests"
- Check Actions tab if workflows don't trigger

### Build Issues

```bash
# Clean build
rm -rf npm/ target/ node_modules/
npm install
task build
```

## Documentation

When adding features:

1. **Add to appropriate feature doc** in `docs/`
2. **Update API reference** in README.md if needed
3. **Add examples** to feature documentation
4. **Update CLAUDE.md** for AI development guidance

See the [documentation structure](./docs/README.md) for organization guidelines.

## Contributing Guidelines

1. **Fork and create feature branch**
2. **Make changes with tests**
3. **Run code quality checks:** `task fmt && task lint && task check`
4. **Test across runtimes:** `task test`
5. **Update documentation** as needed
6. **Submit PR with clear description**

For detailed feature documentation and examples, see the [docs directory](./docs/README.md).
