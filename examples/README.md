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

Each example provides an interactive CLI demonstrating:

- ✅ Interactive printer selection and switching
- ✅ Detailed printer information display
- ✅ File printing with media directory browsing
- ✅ File path input with native tab completion (Node.js and Bun)
- ✅ Active job viewing and management
- ✅ Job history tracking
- ✅ Old job cleanup
- ✅ Simulated printing (safe testing mode)
- ✅ Runtime detection and information
- ✅ Error handling and validation

### Interactive CLI Details

- **Node.js & Bun**: Use [@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js) for interactive menus with readline tab completion for file paths
- **Deno**: Uses [@cliffy/prompt](https://cliffy.io/) for interactive menus with standard input for file paths
- All examples dynamically discover files in the `media/` directory
- Select lists display up to 20 items without scrolling when possible
- Custom file path entry available with sensible defaults
