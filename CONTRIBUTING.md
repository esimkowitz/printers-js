# Contributing to @printers/printers

Technical documentation for this cross-runtime printer library.

## Architecture

This library supports Deno, Bun, and Node.js with identical APIs:

- **Deno/Bun**: Use FFI to load shared libraries (`.dylib/.so/.dll`)
- **Node.js**: Uses N-API modules (`.node`)
- **Rust backend**: Shared business logic for all runtimes

### File Structure

```
lib/                    # Rust backend source
├── core.rs            # Shared business logic
├── ffi.rs             # FFI bindings (Deno/Bun)
├── napi.rs            # N-API bindings (Node.js)
├── node.rs            # Node.js-specific functionality
└── lib.rs             # Module orchestration

src/                    # TypeScript/JavaScript source
├── index.ts           # Universal entry point (auto-detects runtime)
├── deno.ts            # Deno-specific implementation (FFI-based)
├── bun.ts             # Bun-specific implementation (FFI-based)
├── node.ts            # Node.js-specific implementation (N-API wrapper)
└── ffi-loader.ts      # FFI loading utilities

tests/
├── shared.test.ts     # Cross-runtime test suite
└── node-test-runner.ts # Custom Node.js test runner

scripts/                # Build and automation scripts
├── build-all.ts       # Cross-runtime build orchestration (Deno)
├── test-all.ts        # Comprehensive test runner (Deno)
├── bump-version.ts    # Version management (Deno)
├── run-ci-local.ts    # Local CI simulation (Deno)
├── build-napi.js      # N-API module building (Node.js)
└── remove-env-check.js # Post-build N-API processing (Node.js)

# Generated artifacts (gitignored)
npm/               # N-API platform packages for publishing
target/release/    # FFI binaries
test-results/      # Test reports and coverage
```

## Development

### Prerequisites

Install the required development tools:

**Required:**

- **Rust** - Core backend development
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  rustup update
  ```
- **Task** - Build automation ([taskfile.dev](https://taskfile.dev/))
  ```bash
  # macOS (Homebrew)
  brew install go-task

  # Linux/Windows (Go)
  go install github.com/go-task/task/v3/cmd/task@latest

  # Or download binary from https://github.com/go-task/task/releases
  ```

**Runtime-specific (install as needed):**

- **Deno** - For Deno runtime and automation scripts
  ```bash
  curl -fsSL https://deno.land/install.sh | sh
  ```
- **Node.js** - For Node.js runtime and N-API builds
  ```bash
  # Use nvm, fnm, or download from nodejs.org
  # Requires Node.js 18+ for N-API builds
  ```
- **Bun** - For Bun runtime testing
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

### Build

```bash
# FFI library (for Deno/Bun)
task build

# N-API module (for Node.js) 
task build:napi
```

The N-API build process:

1. Auto-detects current platform (darwin-arm64, linux-x64-gnu, etc.)
2. Creates npm platform directories using `napi create-npm-dirs`
3. Builds platform-specific binaries with napi-rs directly to `npm/platform/`
4. Removes `NAPI_RS_NATIVE_LIBRARY_PATH` check for JSR compatibility

This approach uses the official NAPI-RS `npm/` directory structure for all N-API
operations.

### Scripts and Runtimes

The project uses different runtime environments for different script types:

**Deno Scripts** (TypeScript with Deno runtime):

- `scripts/build-all.ts` - Cross-runtime build orchestration
- `scripts/test-all.ts` - Comprehensive test runner with coverage
- `scripts/run-ci-local.ts` - Local CI simulation
- `scripts/bump-version.ts` - Version management

**Node.js Scripts** (ESM JavaScript with Node runtime):

- `scripts/build-napi.js` - N-API module building (requires Node.js subprocess
  environment)
- `scripts/remove-env-check.js` - Post-build N-API processing
- `scripts/build-all-node.js` - Alternative Node.js-based build script

**Why different runtimes?**

- Deno scripts handle complex automation and cross-runtime orchestration
- Node.js scripts handle N-API builds which require specific subprocess
  environments that work better with native Node.js execution
- Node.js scripts must run on Windows ARM CI runners where Deno is not available
- This separation ensures optimal compatibility for each build target and CI
  environment

### Test

```bash
# All runtimes (recommended)
task test

# Individual runtimes
task test:deno
task test:node
task test:bun
```

All tests use `PRINTERS_JS_SIMULATE=true` by default. Use `test:real` tasks to
actually print.

### Code Quality

Run after changes:

```bash
task fmt && task lint
cargo fmt && cargo clippy
```

## Release Process

1. **Bump version**: `task bump:patch` (or `minor`/`major`)
2. **Commit and push**: `git add . && git commit -m "v0.4.3" && git push`
3. **Create tag and push**: `git tag v0.4.3 && git push origin v0.4.3`

The release workflow (`.github/workflows/release.yml`) is triggered by version tags and handles:

### Automated Release Pipeline

1. **Cross-platform builds**: Builds native libraries and N-API modules for all supported platforms
2. **Cross-runtime testing**: Runs comprehensive tests on Deno, Bun, and Node.js across all platforms  
3. **Artifact collection**: Downloads and combines all platform-specific binaries
4. **Dual publishing**: Publishes to both JSR and npm simultaneously

### Platform Matrix

**FFI Libraries** (for Deno/Bun):
- `x86_64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu`
- `x86_64-pc-windows-msvc`  
- `x86_64-apple-darwin`, `aarch64-apple-darwin`

**N-API Modules** (for Node.js):
- `linux-x64-gnu`, `linux-arm64-gnu`
- `win32-x64-msvc`, `win32-arm64-msvc`
- `darwin-x64`, `darwin-arm64`

### Publishing Strategy

**JSR**: Direct publish from universal `src/index.ts` with all platform binaries included

**npm**: Uses NAPI-RS `prepublish` workflow:
- Main package (`@printers/printers`) with `optionalDependencies`  
- Platform-specific packages (`@printers/printers-darwin-arm64`, etc.)
- Automatic platform detection during installation

## JSR Publishing

### Configuration

`deno.json` includes N-API artifacts despite gitignore:

```json
{
  "publish": {
    "include": [
      "*.ts",
      "README.md",
      "LICENSE",
      "npm/**",
      "target/release/*.{dll,dylib,so}"
    ],
    "exclude": ["!napi"]
  }
}
```

### N-API Build Architecture

The N-API build process integrates with the NAPI-RS publishing workflow:

**Local Development:**

- `scripts/build-napi.js` (Node.js ESM) auto-detects current platform
- Calls `napi create-npm-dirs` to create all platform directories with `package.json` files
- Builds using `napi build --platform` for current platform only  
- `scripts/remove-env-check.js` removes `NAPI_RS_NATIVE_LIBRARY_PATH` check for JSR compatibility

**CI/CD Pipeline:**

1. **Cross-platform builds**: Each runner builds only its platform's `.node` binary
2. **Artifact separation**: Each platform uploads only its own directory (`npm/platform/`)  
3. **Artifact reconstruction**: Publish job downloads and combines all platform directories
4. **NAPI-RS publishing**: `napi prepublish` publishes main package + all platform packages

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
# Test JSR configuration
deno publish --dry-run --no-check --allow-dirty
```

## Memory Management

The Rust backend spawns background threads for job monitoring. These are cleaned
up automatically on process exit, but you can call `shutdown()` manually if
needed.

## Dependencies

**Rust** (`Cargo.toml`):

- `printers = "2.2.0"` - Core printer functionality
- `napi = "3"` - N-API bindings (optional)

**Deno** (`deno.json`):

- `@std/assert`, `@std/path`, `@std/semver`

**Node.js** (`package.json`):

- `@napi-rs/cli` - N-API build toolchain

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
- Simultaneous JSR and npm publishing

### Local CI Testing

```bash
# Simulate full CI pipeline locally
task ci:local

# Run comprehensive test suite with coverage
task test

# Individual runtime testing
task test:deno test:node test:bun
```

### Coverage Reports

Tests generate comprehensive coverage reports:
- **JUnit XML**: `test-results/{deno,node,bun}-test.xml`
- **LCOV**: `test-results/{deno,node,bun}-lcov.info` + `test-results/rust.lcov`
- **Text summaries**: Console output with actual percentages

## Known Issues

All runtimes (Deno, Bun, and Node.js) work correctly with proper cross-runtime
compatibility.
