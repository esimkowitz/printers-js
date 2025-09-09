# @printers/printers

[![JSR](https://jsr.io/badges/@printers/printers)](https://jsr.io/@printers/printers)
[![NPM](https://img.shields.io/npm/v/%40printers%2Fprinters)](https://www.npmjs.com/package/@printers/printers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/esimkowitz/printers-js/blob/main/LICENSE)
[![Build](https://github.com/esimkowitz/printers-js/actions/workflows/ci.yml/badge.svg)](https://github.com/esimkowitz/printers-js/actions/workflows/ci.yml)

Cross-runtime printer library for Deno, Bun, and Node.js.

## Features

- 🔄 Cross-runtime compatibility - works in Deno, Bun, and Node.js
- 🖨️ Cross-platform printing - Windows, macOS, and Linux
- 🦀 Native performance - Rust backend using the `printers` crate
- 🏗️ Multi-architecture support - AMD64 and ARM64 binaries
- 🔒 Safe testing - simulation mode prevents accidental printing
- 📊 Async job tracking - non-blocking print jobs with status monitoring
- 🔍 Rich printer metadata - access all printer properties

## Installation

### JSR (Recommended)

JSR provides smaller bundle sizes through tree-shaking and is recommended for new projects.

**Deno:**
```bash
deno add @printers/printers
```

**Node.js:**
```bash
npx jsr add @printers/printers
```

**Bun:**
```bash
bunx jsr add @printers/printers
```

### NPM

**Node.js:**
```bash
npm install @printers/printers
# or
yarn add @printers/printers
# or
pnpm add @printers/printers
```

**Bun:**
```bash
bun add @printers/printers
```

## Quick Start

### Deno

```typescript
import { getAllPrinters, Printer } from "@printers/printers";

// List all available printers
const printers = getAllPrinters();
console.log("Available printers:", printers.map((p) => p.name));

// Print a file (returns a Promise)
const printer = printers[0];
try {
  await printer.printFile("/path/to/document.pdf", {
    copies: "2",
    orientation: "landscape",
  });
  console.log("Print job completed!");
} catch (error) {
  console.error("Print failed:", error.message);
}
```

### Bun

```javascript
import { getAllPrinters } from "@printers/printers";

const printers = getAllPrinters();
const printer = printers[0];
await printer.printFile("document.pdf");
```

### Node.js

```javascript
const { getAllPrinters } = require("@printers/printers");

const printers = getAllPrinters();
const printer = printers[0];
await printer.printFile("document.pdf");
```

## API Reference

### Functions

#### `getAllPrinters(): Printer[]`

Returns an array of all available system printers.

#### `getAllPrinterNames(): string[]`

Returns an array of printer names.

#### `getPrinterByName(name: string): Printer | null`

Find a printer by its exact name.

#### `printerExists(name: string): boolean`

Check if a printer exists on the system.

#### `getJobStatus(jobId: number): JobStatus | null`

Get the status of a print job by ID.

#### `cleanupOldJobs(maxAgeSeconds: number): number`

Remove old completed/failed jobs and return the count removed.

#### `shutdown(): void`

Shutdown the library and cleanup all background threads. Called automatically on
process exit.

### Classes

#### `Printer`

Represents a system printer with metadata and printing capabilities.

**Properties:**

- `name: string` - Printer display name
- `systemName: string` - System-level printer name
- `driverName: string` - Printer driver name
- `uri: string` - Printer URI (if available)
- `portName: string` - Port name (e.g., "USB001", "LPT1:")
- `processor: string` - Print processor (e.g., "winprint")
- `dataType: string` - Default data type (e.g., "RAW")
- `description: string` - Printer description
- `location: string` - Physical location description
- `isDefault: boolean` - Whether this is the default printer
- `isShared: boolean` - Whether the printer is shared on network
- `state: PrinterState` - Current printer state ("READY", "OFFLINE", etc.)
- `stateReasons: string[]` - Array of state reason strings

**Methods:**

- `static fromName(name: string): Printer | null` - Create printer instance from
  name
- `exists(): boolean` - Check if printer is available
- `toString(): string` - Get string representation with all fields
- `equals(other: Printer): boolean` - Compare with another printer by name
- `dispose(): void` - Manually release printer resources (automatic cleanup
  available)
- `printFile(filePath: string, jobProperties?: Record<string, string>): Promise<void>` -
  Print a file

### Interfaces

#### `JobStatus`

```typescript
interface JobStatus {
  id: number;
  printer_name: string;
  file_path: string;
  status: "queued" | "printing" | "completed" | "failed";
  error_message?: string;
  age_seconds: number;
}
```

#### `PrinterState`

```typescript
type PrinterState = "idle" | "processing" | "stopped" | "unknown";
```

Note: The actual printer state comes from the native printer system and may
include values like "READY", "OFFLINE", "PAUSED", etc.

## Permissions

### Deno

```bash
deno run --allow-ffi --allow-env your-script.ts
```

- `--allow-ffi` - Required for loading the native library
- `--allow-env` - Optional, for reading `PRINTERS_JS_SIMULATE` environment
  variable

### Node.js / Bun

No special permissions required - uses native N-API bindings.

## Testing & Safety

### Simulation Mode

Set `PRINTERS_JS_SIMULATE=true` to enable simulation mode, which prevents actual
printing while testing all functionality:

**Unix/Linux/macOS:**

```bash
PRINTERS_JS_SIMULATE=true deno run --allow-ffi --allow-env your-script.ts
```

**Windows Command Prompt:**

```cmd
set PRINTERS_JS_SIMULATE=true
deno run --allow-ffi --allow-env your-script.ts
```

**Windows PowerShell:**

```powershell
$env:PRINTERS_JS_SIMULATE="true"
deno run --allow-ffi --allow-env your-script.ts
```

## Examples

### Basic Printing

```typescript
import { getAllPrinters } from "@printers/printers";

const printers = getAllPrinters();
if (printers.length > 0) {
  const printer = printers[0];

  // Access printer information
  console.log(`Using printer: ${printer.name}`);
  console.log(`Driver: ${printer.driverName}`);
  console.log(`State: ${printer.state}`);
  console.log(`Default: ${printer.isDefault}`);

  try {
    await printer.printFile("document.pdf");
    console.log("Print successful");
  } catch (error) {
    console.log("Print failed:", error.message);
  }
}
```

### Printer Information & Management

```typescript
import {
  cleanupOldJobs,
  getAllPrinterNames,
  getAllPrinters,
  getPrinterByName,
  printerExists,
} from "@printers/printers";

// List all printers with detailed information
const printers = getAllPrinters();
for (const printer of printers) {
  console.log(`\n${printer.name}:`);
  console.log(`  Driver: ${printer.driverName}`);
  console.log(`  State: ${printer.state}`);
  console.log(`  Port: ${printer.portName}`);
  console.log(`  Default: ${printer.isDefault ? "Yes" : "No"}`);
  console.log(`  Shared: ${printer.isShared ? "Yes" : "No"}`);

  if (printer.location) {
    console.log(`  Location: ${printer.location}`);
  }

  if (printer.stateReasons.length > 0 && printer.stateReasons[0] !== "none") {
    console.log(`  Issues: ${printer.stateReasons.join(", ")}`);
  }
}

// Check if specific printer exists
if (printerExists("My Printer")) {
  const printer = getPrinterByName("My Printer");
  console.log("Found printer:", printer?.name);
}

// Clean up old print jobs (older than 1 hour)
const cleaned = cleanupOldJobs(3600);
console.log(`Cleaned up ${cleaned} old print jobs`);
```

### Working with Printer Properties

```typescript
import { getAllPrinters } from "@printers/printers";

const printers = getAllPrinters();

// Find default printer
const defaultPrinter = printers.find((p) => p.isDefault);
console.log(`Default printer: ${defaultPrinter?.name || "None"}`);

// Find printers by state
const readyPrinters = printers.filter((p) => p.state === "READY");
console.log(`Ready printers: ${readyPrinters.map((p) => p.name).join(", ")}`);

// Find network printers
const networkPrinters = printers.filter((p) => p.isShared);
console.log(
  `Network printers: ${networkPrinters.map((p) => p.name).join(", ")}`,
);
```

## Platform Support

### FFI Binaries (Deno/Bun)

| Platform | Architecture | Binary                    |
| -------- | ------------ | ------------------------- |
| Windows  | AMD64        | `printers_js.dll`         |
| Windows  | ARM64        | `printers_js-arm64.dll`   |
| Linux    | AMD64        | `libprinters_js.so`       |
| Linux    | ARM64        | `libprinters_js-arm64.so` |
| macOS    | ARM64        | `libprinters_js.dylib`    |

### N-API Binaries (Node.js)

Node.js uses platform-specific `.node` binaries automatically downloaded during
installation:

- Windows (x86, x64, ARM64)
- macOS (x64, ARM64)
- Linux (x64, ARM64, ARMv7)
- FreeBSD (x64)

## Development & Contributing

For technical information about architecture, build systems, development
workflow, and contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT License - see [LICENSE](./LICENSE) file for details.
