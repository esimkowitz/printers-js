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
napi/              # N-API modules (gitignored)
target/release/    # FFI binaries (gitignored)
```

## Development

### Build

```bash
# FFI library (for Deno/Bun)
deno task build

# N-API module (for Node.js) 
npm run build
```

The N-API build does post-processing:

1. Builds platform-specific binaries with napi-rs
2. Moves artifacts to `napi/` directory
3. Removes `NAPI_RS_NATIVE_LIBRARY_PATH` check for JSR compatibility

### Test

```bash
# All runtimes (recommended)
deno run --allow-run --allow-write --allow-read --allow-env scripts/test-all.ts

# Individual runtimes
deno task test
npm test
bun test tests/
```

All tests use `PRINTERS_JS_SIMULATE=true` by default. Use `test:real` tasks to
actually print.

### Code Quality

Run after changes:

```bash
deno fmt && deno lint
cargo fmt && cargo clippy
```

## Release Process

1. **Bump version**: `deno task bump:patch` (or `minor`/`major`)
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
      "napi/**",
      "target/release/*.{dll,dylib,so}"
    ],
    "exclude": ["!napi"]
  }
}
```

### NAPI Environment Variable Removal

napi-rs generates code that checks `NAPI_RS_NATIVE_LIBRARY_PATH`, causing JSR
warnings. The `scripts/remove-env-check.ts` script removes this check during
build.

This is safe because:

- The variable is only for development/testing
- Production uses standard platform-specific loading
- All functionality remains intact

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

Node.js N-API module has runtime initialization issues. Deno and Bun work
correctly.
