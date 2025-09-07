# Examples

This directory contains example projects demonstrating how to use `@esimkowitz/printers` across different JavaScript runtimes and package managers.

## Directory Structure

```
examples/
├── deno/
│   ├── jsr-import/         # Using JSR import
│   └── npm-import/         # Using NPM import
├── node/
│   ├── jsr-import/         # Using JSR import (requires Node.js 22+)
│   └── npm-import/         # Using NPM package
└── bun/
    ├── jsr-import/         # Using JSR import
    └── npm-import/         # Using NPM package
```

## Quick Start

### Deno Examples

```bash
# JSR import
cd examples/deno/jsr-import
deno task start
# or: deno run --allow-ffi --allow-env main.ts

# NPM import  
cd examples/deno/npm-import
deno task start
# or: deno run --allow-ffi --allow-env --allow-read --allow-net main.ts
```

### Node.js Examples

```bash
# JSR import (Node.js 22+)
cd examples/node/jsr-import
npm start
# or: node --experimental-strip-types main.js

# NPM import
cd examples/node/npm-import  
npm install
npm start
```

### Bun Examples

```bash
# JSR import
cd examples/bun/jsr-import
bun start
# or: bun run main.ts

# NPM import
cd examples/bun/npm-import
bun install
bun start
# or: bun run main.ts
```

## Configuration Files

Each example includes the appropriate configuration files for its runtime:

### Deno Examples
- **`deno.json`**: Contains tasks, imports, and compiler options
- Import configurations for both JSR and NPM packages
- Predefined tasks: `start`, `dev`

### Node.js Examples  
- **`package.json`**: Standard Node.js package configuration
- JSR example includes import maps for Node.js 22+ JSR support
- Scripts: `start`, `dev`, `start:legacy` (JSR example)

### Bun Examples
- **`package.json`**: Package configuration and scripts
- **`bunfig.toml`**: Bun-specific configuration
- Registry configurations for both JSR and NPM
- Environment variables preset for simulation mode

## Safety Notice

⚠️ **All examples run in simulation mode by default** (`PRINTERS_JS_SIMULATE=true`)

To test with real printers, modify the environment variable in each example, but **use caution** as this will send actual print jobs to your printers.

## Example Features

Each example demonstrates:
- ✅ Basic printer discovery
- ✅ Printer information display  
- ✅ Simulated printing (safe)
- ✅ Error handling
- ✅ Runtime detection
- ✅ Proper cleanup