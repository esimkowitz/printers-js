# @esimkowitz/printers

A cross-platform Deno library for interacting with system printers via FFI to a
native Rust library.

## Features

- 🖨️ **Cross-platform printing** - Works on Windows, macOS, and Linux
- 🦀 **Native performance** - Powered by Rust's `printers` crate via FFI
- 🏗️ **Multi-architecture support** - AMD64 and ARM64 binaries included
- 🔒 **Safe testing** - Built-in simulation mode prevents accidental printing
- ⚡ **Async job tracking** - Non-blocking print jobs with status monitoring
- 📊 **Comprehensive API** - List printers, check status, manage print jobs

## Quick Start

```typescript
import { getAllPrinters, Printer } from "@esimkowitz/printers";

// List all available printers
const printers = getAllPrinters();
console.log("Available printers:", printers.map((p) => p.getName()));

// Get a specific printer
const printer = printers[0];

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

Represents a system printer with methods for printing and status checking.

**Methods:**

- `getName(): string` - Get the printer name
- `exists(): boolean` - Check if printer is available
- `toString(): string` - Get string representation
- `equals(other: Printer): boolean` - Compare with another printer
- `toJSON()` - Get JSON representation
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

**Windows:**

```cmd
set DENO_PRINTERS_SIMULATE=true
deno run --allow-ffi --unstable-ffi --allow-env your-script.ts
```

**Unix/Linux/macOS:**

```bash
DENO_PRINTERS_SIMULATE=true deno run --allow-ffi --unstable-ffi --allow-env your-script.ts
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

### Printer Management

```typescript
import {
  cleanupOldJobs,
  getAllPrinterNames,
  getPrinterByName,
  printerExists,
} from "@esimkowitz/printers";

// List available printers
console.log("Printers:", getAllPrinterNames());

// Check if specific printer exists
if (printerExists("My Printer")) {
  const printer = getPrinterByName("My Printer");
  console.log("Found printer:", printer?.getName());
}

// Clean up old print jobs (older than 1 hour)
const cleaned = cleanupOldJobs(3600);
console.log(`Cleaned up ${cleaned} old print jobs`);
```

## Architecture

This library consists of:

1. **Rust native library** (`src/lib.rs`) - Handles actual printer operations
   via the `printers` crate
2. **TypeScript FFI layer** (`mod.ts`) - Provides JavaScript-friendly API via
   Deno's FFI
3. **Multi-platform binaries** - Pre-compiled for all supported platforms and
   architectures

The native library is built as a C dynamic library (cdylib) and loaded via
Deno's FFI capabilities, providing near-native performance for printer
operations.

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
