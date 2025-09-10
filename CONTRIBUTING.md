# Contributing to @printers/printers

Technical documentation for this cross-runtime printer library.

## Architecture

This library supports Deno, Bun, and Node.js with identical APIs:

- **Deno/Bun**: Use FFI to load shared libraries (`.dylib/.so/.dll`)
- **Node.js**: Uses N-API modules (`.node`)
- **Rust backend**: Shared business logic for all runtimes

### File Structure

```
src/
├── core.rs        # Shared business logic
├── ffi.rs         # FFI bindings (Deno/Bun)
├── napi.rs        # N-API bindings (Node.js)
└── lib.rs         # Module orchestration

# Runtime entry points
deno.ts            # Deno entry point
bun.js             # Bun entry point  
node.ts            # Node.js entry point
index.ts           # Universal entry point (auto-detects runtime)

# Generated artifacts
npm/               # N-API platform packages for all publishing and local development (gitignored)
target/release/    # FFI binaries (gitignored)
```

## Development

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
2. **Commit and push**: `git add . && git commit -m "v0.3.8" && git push`
3. **Create GitHub release**: `gh release create v0.3.8` (triggers automation)

The GitHub Actions workflow handles building and publishing to JSR/npm.

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

### NAPI Build Architecture

The N-API build process has been redesigned for better CI/CD integration:

**Local Development:**

- `scripts/build-napi.js` (Node.js ESM) - auto-detects platform and builds
  directly to `npm/platform/`
- Builds directly to `npm/platform/` directories using NAPI-RS --output-dir
- `scripts/remove-env-check.js` (Node.js ESM) - removes
  `NAPI_RS_NATIVE_LIBRARY_PATH` check for JSR compatibility

**CI/CD Pipeline:**

- Each platform builds its specific `.node` file to its `npm/platform/`
  directory
- Artifacts are uploaded by platform and later organized for publishing
- Both JSR and NPM use the same `npm/platform/` directories with all binaries

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

GitHub Actions runs cross-runtime tests and generates coverage reports. Use
`deno run --allow-run --allow-env --allow-read scripts/run-ci-local.ts` to test
locally.

## Known Issues

All runtimes (Deno, Bun, and Node.js) work correctly with proper cross-runtime
compatibility.
