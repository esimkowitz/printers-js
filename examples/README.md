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
- Environment variables preset for simulation mode

## Safety Notice

⚠️ **All examples run in simulation mode by default**
(`PRINTERS_JS_SIMULATE=true`)

To test with real printers, modify the environment variable in each example, but
**use caution** as this will send actual print jobs to your printers.

## Example Features

Each example demonstrates:

- ✅ Basic printer discovery
- ✅ Printer information display
- ✅ Simulated printing (safe)
- ✅ Error handling
- ✅ Runtime detection
- ✅ Proper cleanup
