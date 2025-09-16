# @printers/printers

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
- ⚡ Flexible completion control - choose immediate return or wait for job completion
- 🔧 Full CUPS options support - comprehensive printing configuration on Unix systems
- 📄 Structured print options - simple, CUPS, and raw option interfaces

## Installation

### Node.js

```bash
npm install @printers/printers
# or
yarn add @printers/printers
# or
pnpm add @printers/printers
```

### Deno

```bash
deno add npm:@printers/printers
```

**Important:** Deno requires special configuration for N-API modules:

- Add `"nodeModulesDir": "auto"` to your `deno.json`:

```json
{
  "nodeModulesDir": "auto"
}
```

- Run with the `--allow-ffi` and `--allow-env` flags:

```bash
deno run --allow-ffi --allow-env your-script.ts
```

### Bun

```bash
bun add @printers/printers
```

## Quick Start

```typescript
import { getAllPrinters, Printer } from "@printers/printers";

// List all available printers
const printers = getAllPrinters();
console.log(
  "Available printers:",
  printers.map(p => p.name)
);

// Print a file (returns a Promise with job ID)
const printer = printers[0];
try {
  const jobId = await printer.printFile("/path/to/document.pdf", {
    simple: { copies: 2, duplex: true },
    waitForCompletion: true, // Wait for job completion (default)
  });
  console.log(`Print job ${jobId} completed!`);
} catch (error) {
  console.error("Print failed:", error.message);
}
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

#### `cleanupOldJobs(maxAgeMs: number = 30000): number`

Remove old completed/failed jobs and return the count removed. The maxAgeMs
parameter is in milliseconds (default: 30000ms = 30 seconds).

#### `shutdown(): void`

Shutdown the library and cleanup all background threads. Called automatically on
process exit.

### Additional Exports

#### Legacy/Convenience Functions

- `findPrinter(name: string): Printer | null` - Alias for `getPrinterByName`
- `getDefaultPrinter(): Printer | null` - Returns the default system printer
- `createPrintJob(printerName: string, filePath: string, options?: Record<string, string>): Promise<void>` -
  Create and execute a print job

#### Constants

- `isSimulationMode: boolean` - Whether simulation mode is active
- `runtimeInfo: RuntimeInfo` - Information about the current runtime
- `PrinterConstructor: PrinterClass` - Class with static factory method for
  creating printer instances

### Classes

#### `Printer`

Represents a system printer with metadata and printing capabilities.

**Properties:**

- `name: string` - Printer display name
- `systemName?: string` - System-level printer name
- `driverName?: string` - Printer driver name
- `uri?: string` - Printer URI (if available)
- `portName?: string` - Port name (e.g., "USB001", "LPT1:")
- `processor?: string` - Print processor (e.g., "winprint")
- `dataType?: string` - Default data type (e.g., "RAW")
- `description?: string` - Printer description
- `location?: string` - Physical location description
- `isDefault?: boolean` - Whether this is the default printer
- `isShared?: boolean` - Whether the printer is shared on network
- `state?: PrinterState` - Current printer state
- `stateReasons?: string[]` - Array of state reason strings

**Methods:**

- `exists(): boolean` - Check if printer is available
- `toString(): string` - Get string representation with all fields
- `equals(other: Printer): boolean` - Compare with another printer by name
- `dispose?(): void` - Manually release printer resources (automatic cleanup
  available)
- `getName(): string` - Get the printer name
- `printFile(filePath: string, options?: PrintJobOptions): Promise<number>` -
  Print a file and return job ID
- `printBytes(data: Uint8Array, options?: PrintJobOptions): Promise<number>` -
  Print raw bytes and return job ID
- `getActiveJobs(): PrinterJob[]` - Get currently active/pending jobs
- `getJobHistory(limit?: number): PrinterJob[]` - Get completed job history
- `getJob(jobId: number): PrinterJob | null` - Get specific job details
- `getAllJobs(): PrinterJob[]` - Get all jobs (active + history)
- `cleanupOldJobs(maxAgeSeconds: number): number` - Remove old jobs

**Static Methods (via PrinterConstructor):**

- `PrinterConstructor.fromName(name: string): Printer | null` - Create printer
  instance from name

## Print Options

The library supports multiple ways to specify print options, with automatic conversion and precedence handling.

### PrintJobOptions Interface

```typescript
interface PrintJobOptions {
  /** Top-level job name (highest precedence) */
  jobName?: string;
  /** Control whether to wait for job completion (default: true) */
  waitForCompletion?: boolean;
  /** Raw CUPS-style options (lowest precedence) */
  raw?: Record<string, string>;
  /** Simple, user-friendly options (medium precedence) */
  simple?: SimplePrintOptions;
  /** Full CUPS options (high precedence) */
  cups?: CUPSOptions;
}
```

### SimplePrintOptions

Easy-to-use options that get converted to CUPS format:

```typescript
interface SimplePrintOptions {
  copies?: number;
  duplex?: boolean;
  paperSize?: "A4" | "Letter" | "Legal" | "A3" | "A5" | "Tabloid";
  quality?: "draft" | "normal" | "high";
  color?: boolean;
  pageRange?: string; // e.g., "1-5,8,10-12"
  jobName?: string;
  pagesPerSheet?: 1 | 2 | 4 | 6 | 9 | 16;
  landscape?: boolean;
}
```

### CUPSOptions

Direct CUPS option control for advanced configurations:

```typescript
interface CUPSOptions {
  "job-name"?: string;
  "job-priority"?: number;
  copies?: number | string;
  collate?: boolean;
  "media-size"?: string;
  "print-quality"?: number;
  "fit-to-page"?: boolean;
  // ... and many more CUPS options
  [key: string]: string | number | boolean | undefined;
}
```

### waitForCompletion Parameter

Controls the async behavior of print operations:

- **`true` (default)**: Wait for print job completion with intelligent delays
- **`false`**: Return immediately after job submission

```typescript
// Wait for completion (default behavior)
const jobId = await printer.printFile("document.pdf", {
  simple: { copies: 2 },
  waitForCompletion: true,
});

// Quick return - fire and forget
const jobId = await printer.printFile("document.pdf", {
  simple: { copies: 2 },
  waitForCompletion: false,
});
```

### Option Precedence

Options are merged with the following precedence (highest to lowest):

1. **Top-level `jobName`** - Always takes precedence
2. **CUPS options** - Direct CUPS control
3. **Simple options** - Converted to CUPS format
4. **Raw options** - Base level options

```typescript
await printer.printFile("document.pdf", {
  jobName: "Final Job Name", // Will override everything
  raw: { "job-name": "Raw Name", copies: "1" },
  simple: { copies: 2 }, // Will override raw copies
  cups: { "job-priority": 75 }, // Adds to final options
});
// Result: job-name="Final Job Name", copies="2", job-priority="75"
```

### Types and Interfaces

#### `PrinterJob`

```typescript
interface PrinterJob {
  id: number;
  name: string;
  state:
    | "pending"
    | "paused"
    | "processing"
    | "cancelled"
    | "completed"
    | "unknown";
  mediaType: string;
  createdAt: number; // Unix timestamp
  printerName: string;
  ageSeconds: number;
  processedAt?: number; // Unix timestamp
  completedAt?: number; // Unix timestamp
  errorMessage?: string;
}
```

#### `JobStatus` (Legacy)

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

#### `PrintError`

```typescript
enum PrintError {
  InvalidParams = 1,
  InvalidPrinterName = 2,
  InvalidFilePath = 3,
  InvalidJson = 4,
  InvalidJsonEncoding = 5,
  PrinterNotFound = 6,
  FileNotFound = 7,
  SimulatedFailure = 8,
}
```

#### `RuntimeInfo`

```typescript
interface RuntimeInfo {
  name: "deno" | "node" | "bun" | "unknown";
  isDeno: boolean;
  isNode: boolean;
  isBun: boolean;
  version: string;
}
```

## Runtime Permissions

### Deno Permissions

```bash
deno run --allow-ffi --allow-env your-script.ts
```

- `--allow-ffi` - Required for loading the N-API native module
- `--allow-env` - Required for reading `PRINTERS_JS_SIMULATE` environment
  variable and runtime detection

### Node.js / Bun Permissions

No special permissions required.

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
    // Simple printing with job ID return
    const jobId = await printer.printFile("document.pdf");
    console.log(`Print job ${jobId} completed successfully`);
  } catch (error) {
    console.log("Print failed:", error.message);
  }
}
```

### Advanced Print Options

```typescript
import { getAllPrinters } from "@printers/printers";

const printer = getAllPrinters()[0];

// Using simple options
const jobId1 = await printer.printFile("document.pdf", {
  simple: {
    copies: 3,
    duplex: true,
    paperSize: "A4",
    quality: "high",
    color: false,
  },
  waitForCompletion: true, // Wait for completion (default)
});

// Using CUPS options for advanced control
const jobId2 = await printer.printFile("document.pdf", {
  cups: {
    "job-name": "Important Document",
    "job-priority": 75,
    "print-quality": 5,
    "media-size": "A4",
    sides: "two-sided-long-edge",
  },
});

// Quick fire-and-forget printing
const jobId3 = await printer.printFile("document.pdf", {
  simple: { copies: 1 },
  waitForCompletion: false, // Return immediately
});

console.log(`Submitted jobs: ${jobId1}, ${jobId2}, ${jobId3}`);
```

### Job Tracking and Management

```typescript
import { getAllPrinters } from "@printers/printers";

const printer = getAllPrinters()[0];

// Submit a print job
const jobId = await printer.printFile("large-document.pdf", {
  simple: { copies: 5, duplex: true },
  waitForCompletion: false, // Don't wait, track manually
});

// Check job status
const job = printer.getJob(jobId);
if (job) {
  console.log(`Job ${job.id}: ${job.name}`);
  console.log(`State: ${job.state}`);
  console.log(`Media: ${job.mediaType}`);
  console.log(`Age: ${job.ageSeconds}s`);
}

// Monitor active jobs
const activeJobs = printer.getActiveJobs();
console.log(`${activeJobs.length} jobs currently active`);

// View job history
const history = printer.getJobHistory(10); // Last 10 jobs
for (const historicalJob of history) {
  console.log(`${historicalJob.name}: ${historicalJob.state}`);
}

// Cleanup old completed jobs
const cleaned = printer.cleanupOldJobs(3600); // Remove jobs older than 1 hour
console.log(`Cleaned up ${cleaned} old jobs`);
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
const cleaned = cleanupOldJobs(3600000); // 3600000ms = 1 hour
console.log(`Cleaned up ${cleaned} old print jobs`);
```

### Working with Printer Properties

```typescript
import { getAllPrinters } from "@printers/printers";

const printers = getAllPrinters();

// Find default printer
const defaultPrinter = printers.find(p => p.isDefault);
console.log(`Default printer: ${defaultPrinter?.name || "None"}`);

// Find printers by state
const readyPrinters = printers.filter(
  p => p.state === "idle" || p.state === "processing"
);
console.log(`Ready printers: ${readyPrinters.map(p => p.name).join(", ")}`);

// Find network printers
const networkPrinters = printers.filter(p => p.isShared);
console.log(`Network printers: ${networkPrinters.map(p => p.name).join(", ")}`);
```

## Platform Support

| OS      | Architecture | Deno | Bun | Node.js |
| ------- | ------------ | ---- | --- | ------- |
| Windows | x64          | ✅   | ✅  | ✅      |
| Windows | ARM64        | ❌   | ❌  | ✅      |
| macOS   | x64          | ✅   | ✅  | ✅      |
| macOS   | ARM64        | ✅   | ✅  | ✅      |
| Linux   | x64          | ✅   | ✅  | ✅      |
| Linux   | ARM64        | ✅   | ✅  | ✅      |

## Development & Contributing

For technical information about architecture, build systems, development
workflow, and contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT License - see [LICENSE](./LICENSE) file for details.
