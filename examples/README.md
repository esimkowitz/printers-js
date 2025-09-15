# Examples

This directory contains example projects demonstrating how to use
`@printers/printers` across different JavaScript runtimes.

## Directory Structure

```
examples/
├── deno/           # Deno runtime using npm:@printers/printers
├── node/           # Node.js using @printers/printers
└── bun/            # Bun runtime using @printers/printers
```

## Quick Start

### Deno Example

```bash
cd examples/deno
deno task start
# or: deno run --allow-env --allow-read --allow-net --allow-ffi main.ts
```

**Note:** The Deno example requires `"nodeModulesDir": "auto"` in `deno.json` for N-API modules to work correctly.

### Node.js Example

```bash
cd examples/node
npm install
npm start
```

### Bun Example

```bash
cd examples/bun
bun install
bun start
# or: bun run main.ts
```

## Configuration Files

Each example includes the appropriate configuration files for its runtime:

### Deno Example

- **`deno.json`**: Contains tasks, npm imports, and compiler options
- Uses `npm:@printers/printers` for cross-runtime compatibility
- Predefined tasks: `start`, `dev`

### Node.js Example

- **`package.json`**: Standard Node.js package configuration
- Uses `@printers/printers` npm package
- Scripts: `start`, `dev`

### Bun Example

- **`package.json`**: Package configuration and scripts
- **`bunfig.toml`**: Bun-specific configuration
- Uses `@printers/printers` npm package

## Safety Notice

⚠️ **Examples respect environment variable for simulation mode**

- Set `PRINTERS_JS_SIMULATE=true` to use simulated printers (safe testing)
- Set `PRINTERS_JS_SIMULATE=false` or leave unset to use real printers
- **Use caution** when testing with real printers as this will send actual print jobs

```bash
# Safe testing with simulated printers
PRINTERS_JS_SIMULATE=true deno task start
PRINTERS_JS_SIMULATE=true npm start
PRINTERS_JS_SIMULATE=true bun start

# Real printer testing (sends actual print jobs!)
deno task start
npm start
bun start
```

## Example Features

Each example demonstrates:

- ✅ Basic printer discovery
- ✅ Printer information display
- ✅ Simulated printing (safe)
- ✅ Error handling
- ✅ Runtime detection
- ✅ Proper cleanup
