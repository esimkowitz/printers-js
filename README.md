# @esimkowitz/printers

[![JSR](https://jsr.io/badges/@esimkowitz/printers)](https://jsr.io/@<scope>/<package>)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build](https://github.com/esimkowitz/deno-printers/actions/workflows/ci.yml/badge.svg)](https://github.com/esimkowitz/deno-printers/actions/workflows/ci.yml)
[![Release](https://github.com/esimkowitz/deno-printers/actions/workflows/release.yml/badge.svg)](https://github.com/esimkowitz/deno-printers/actions/workflows/release.yml)

A cross-platform Deno library for interacting with system printers via FFI to a
native Rust library.

## Features

- 🖨️ **Cross-platform printing** - Works on Windows, macOS, and Linux
- 🦀 **Native performance** - Powered by Rust's `printers` crate via FFI
- 🏗️ **Multi-architecture support** - AMD64 and ARM64 binaries included
- 🔒 **Safe testing** - Built-in simulation mode prevents accidental printing
- ⚡ **Async job tracking** - Non-blocking print jobs with status monitoring
- 📊 **Comprehensive API** - List printers, check status, manage print jobs
- 🔍 **Rich printer metadata** - Access all printer properties (driver, state,
  location, etc.)

## Quick Start

```typescript
import { getAllPrinters, Printer } from "@esimkowitz/printers";

// List all available printers
const printers = getAllPrinters();
console.log("Available printers:", printers.map((p) => p.name));

// Get a specific printer
const printer = printers[0];

// Access printer properties using getter properties
console.log(`Name: ${printer.name}`);
console.log(`Driver: ${printer.driverName}`);
console.log(`State: ${printer.state}`);
console.log(`Is Default: ${printer.isDefault}`);

// Print a file (returns a Promise)
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

## Installation

```bash
deno add @esimkowitz/printers
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

### Classes

#### `Printer`

Represents a system printer with comprehensive metadata and printing
capabilities. Printer instances are created via `Printer.fromName()` or
`getPrinterByName()` and automatically manage native memory using
FinalizationRegistry.

**Properties (getters):**

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
- `toString(): string` - Get comprehensive string representation with all fields
- `equals(other: Printer): boolean` - Compare with another printer by name
- `dispose(): void` - Manually release printer resources (optional - automatic
  cleanup available)
- `getName(): string` - Backward compatibility method (use `.name` property
  instead)
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

This library requires the following Deno permissions:

```bash
deno run --allow-ffi --unstable-ffi --allow-env your-script.ts
```

- `--allow-ffi` - Required for loading the native library
- `--unstable-ffi` - Deno's FFI is currently unstable
- `--allow-env` - Optional, for reading `DENO_PRINTERS_SIMULATE` environment
  variable

## Testing & Safety

### Simulation Mode

Set the `DENO_PRINTERS_SIMULATE=true` environment variable to enable simulation
mode, which prevents actual printing while testing all functionality:

**Unix/Linux/macOS:**

```bash
DENO_PRINTERS_SIMULATE=true deno run --allow-ffi --unstable-ffi --allow-env your-script.ts
```

**Windows:**

Command Prompt:

```cmd
set DENO_PRINTERS_SIMULATE=true
deno run --allow-ffi --unstable-ffi --allow-env your-script.ts
```

PowerShell:

```powershell
$env:DENO_PRINTERS_SIMULATE="true"
deno run --allow-ffi --unstable-ffi --allow-env your-script.ts
```

### Running Tests

```bash
# Safe tests (simulation mode)
deno test --allow-ffi --unstable-ffi --allow-env mod.test.ts

# With explicit simulation
DENO_PRINTERS_SIMULATE=true deno test --allow-ffi --unstable-ffi --allow-env mod.test.ts
```

## Platform Support

| Platform | Architecture | Binary                      |
| -------- | ------------ | --------------------------- |
| Windows  | AMD64        | `deno_printers.dll`         |
| Windows  | ARM64        | `deno_printers-arm64.dll`   |
| Linux    | AMD64        | `libdeno_printers.so`       |
| Linux    | ARM64        | `libdeno_printers-arm64.so` |
| macOS    | ARM64        | `libdeno_printers.dylib`    |

The library automatically detects your platform and architecture to load the
correct binary.

## Examples

### Basic Printing

```typescript
import { getAllPrinters } from "@esimkowitz/printers";

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
    console.log("✅ Print successful");
  } catch (error) {
    console.log("❌ Print failed:", error.message);
  }
}
```

### Advanced Job Tracking

```typescript
import { getAllPrinters, getJobStatus } from "@esimkowitz/printers";

const printer = getAllPrinters()[0];

// Start print job (non-blocking)
const jobPromise = printer.printFile("large-document.pdf");

// You can do other work while printing...
console.log("Print job started, doing other work...");

// Wait for completion
try {
  await jobPromise;
  console.log("Print completed!");
} catch (error) {
  console.log("Print failed:", error.message);
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
} from "@esimkowitz/printers";

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
import { getAllPrinters } from "@esimkowitz/printers";

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

// Comprehensive printer information
const printer = printers[0];
console.log(`
Printer: ${printer.name}
System Name: ${printer.systemName}
Driver: ${printer.driverName}
Port: ${printer.portName}
Processor: ${printer.processor}
Data Type: ${printer.dataType}
URI: ${printer.uri}
Location: ${printer.location}
Description: ${printer.description}
State: ${printer.state}
State Reasons: [${printer.stateReasons.join(", ")}]
Is Default: ${printer.isDefault}
Is Shared: ${printer.isShared}
`);
```

## Technical Details

### Memory Management

Printer instances wrap native Rust structures and automatically manage memory
through JavaScript's FinalizationRegistry:

- **Automatic cleanup**: When Printer instances are garbage collected, native
  memory is automatically freed
- **Manual cleanup**: Call `printer.dispose()` for immediate resource release
- **Safe disposal**: Multiple calls to `dispose()` are safe, and accessing
  disposed instances throws descriptive errors
- **No memory leaks**: The FinalizationRegistry ensures native resources are
  always cleaned up

### Printer Properties

All printer properties are implemented as getter properties that call into the
native layer on each access. This ensures you always get the most current
information:

```typescript
const printer = getPrinterByName("My Printer");

// These properties call the native layer each time
console.log(printer.name); // Current printer name
console.log(printer.state); // Current state (may change)
console.log(printer.isDefault); // Current default status
```

## Architecture

This library consists of:

1. **Rust native library** (`src/lib.rs`) - Handles actual printer operations
   via the `printers` crate with FFI-safe wrapper functions
2. **TypeScript FFI layer** (`mod.ts`) - Provides JavaScript-friendly API via
   Deno's FFI with automatic memory management
3. **Multi-platform binaries** - Pre-compiled for all supported platforms and
   architectures

The native library is built as a C dynamic library (cdylib) and loaded via
Deno's FFI capabilities, providing near-native performance for printer
operations while maintaining memory safety.

## Contributing

This library is built with:

- **Rust** - Native library with printer operations
- **Deno** - TypeScript runtime and FFI host
- **GitHub Actions** - CI/CD with multi-platform builds

## License

MIT License - see LICENSE file for details.

## Repository

Source code:
[github.com/esimkowitz/deno-printers](https://github.com/esimkowitz/deno-printers)
