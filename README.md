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

### Main Functions

#### `getAllPrinters(): Printer[]`

Returns an array of all available system printers with complete metadata.

```typescript
import { getAllPrinters } from "@printers/printers";

const printers = getAllPrinters();
for (const printer of printers) {
  console.log(`${printer.name} - ${printer.state}`);
}
```

#### `getAllPrinterNames(): string[]`

Returns an array of printer names for quick enumeration.

```typescript
import { getAllPrinterNames } from "@printers/printers";

const names = getAllPrinterNames();
console.log("Available printers:", names.join(", "));
```

#### `getPrinterByName(name: string): Printer | null`

Find a printer by its exact name, returns null if not found.

```typescript
import { getPrinterByName } from "@printers/printers";

const printer = getPrinterByName("My Printer");
if (printer) {
  console.log("Found printer:", printer.name);
}
```

#### `printerExists(name: string): boolean`

Check if a printer exists on the system without creating a Printer instance.

```typescript
import { printerExists } from "@printers/printers";

if (printerExists("HP LaserJet")) {
  console.log("Printer is available");
}
```

#### `shutdown(): void`

Clean up resources and shutdown the printer module. Called automatically on process exit.

```typescript
import { shutdown } from "@printers/printers";

// Manually cleanup before exit
shutdown();
```

### Option Conversion Functions

#### `simpleToCUPS(options: Partial<SimplePrintOptions>): Record<string, string>`

Convert user-friendly simple options to CUPS format.

```typescript
import { simpleToCUPS } from "@printers/printers";

const cupsOptions = simpleToCUPS({
  copies: 3,
  duplex: true,
  quality: "high",
  color: false
});
// Result: { copies: "3", sides: "two-sided-long-edge", "print-quality": "5", "print-color-mode": "monochrome" }
```

#### `cupsToRaw(options: Partial<CUPSOptions>): Record<string, string>`

Convert CUPS options to raw string properties for the backend.

```typescript
import { cupsToRaw } from "@printers/printers";

const rawOptions = cupsToRaw({
  "job-name": "My Document",
  "print-quality": 5,
  copies: 2
});
// Result: { "job-name": "My Document", "print-quality": "5", "copies": "2" }
```

#### `printJobOptionsToRaw(options?: PrintJobOptions): Record<string, string>`

Convert unified PrintJobOptions to raw properties with proper precedence handling.

```typescript
import { printJobOptionsToRaw } from "@printers/printers";

const rawOptions = printJobOptionsToRaw({
  jobName: "Final Name",
  simple: { copies: 2, quality: "high" },
  cups: { "job-priority": 75 }
});
// Handles precedence: jobName > cups > simple > raw
```

#### `createCustomPageSize(width: number, length: number, unit?: CustomPageSizeUnit): string`

Generate a custom page size string for CUPS media option.

```typescript
import { createCustomPageSize } from "@printers/printers";

const customSize = createCustomPageSize(4, 6, "in");
// Returns: "Custom.4x6in"

// Use in print options
await printer.printFile("photo.jpg", {
  cups: { media: createCustomPageSize(4, 6, "in") }
});
```

### Additional Exports

#### Legacy/Convenience Functions

- `findPrinter(name: string): Printer | null` - Alias for `getPrinterByName`
- `getDefaultPrinter(): Printer | null` - Returns the default system printer
- `printFile(printerName: string, filePath: string, options?: PrintJobOptions | Record<string, string>): Promise<number>` - Print a file to a specific printer
- `printBytes(printerName: string, data: Uint8Array | Buffer, options?: PrintJobOptions | Record<string, string>): Promise<number>` - Print raw bytes to a specific printer

```typescript
import { getDefaultPrinter, printFile } from "@printers/printers";

// Get default printer
const defaultPrinter = getDefaultPrinter();
console.log("Default printer:", defaultPrinter?.name);

// Direct print file function
const jobId = await printFile("My Printer", "document.pdf", {
  simple: { copies: 2, duplex: true }
});
```

#### Constants

- `isSimulationMode: boolean` - Whether simulation mode is active (read-only)
- `runtimeInfo: RuntimeInfo` - Information about the current runtime environment
- `PrinterConstructor: PrinterClass` - Class with static factory method for creating printer instances

```typescript
import { isSimulationMode, runtimeInfo, PrinterConstructor } from "@printers/printers";

// Check simulation mode
console.log("Simulation mode:", isSimulationMode);

// Runtime information
console.log(`Running on ${runtimeInfo.name} v${runtimeInfo.version}`);
console.log("Runtime flags:", { 
  isDeno: runtimeInfo.isDeno,
  isNode: runtimeInfo.isNode,
  isBun: runtimeInfo.isBun 
});

// Create printer using constructor
const printer = PrinterConstructor.fromName("My Printer");
```

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

#### `PrinterClass`

Interface for the PrinterConstructor static methods:

```typescript
interface PrinterClass {
  fromName(name: string): Printer | null;
  new(): never; // Constructor is disabled
}
```

**Usage:**
```typescript
import { PrinterConstructor } from "@printers/printers";

// Create printer instance
const printer = PrinterConstructor.fromName("My Printer");
if (printer) {
  console.log("Found printer:", printer.name);
}
```

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

Comprehensive CUPS printing options interface for advanced configurations. Based on [CUPS documentation](https://www.cups.org/doc/options.html).

```typescript
interface CUPSOptions {
  // Job identification and control
  "job-name"?: string;
  "job-priority"?: number; // 1-100
  "job-hold-until"?: JobHoldUntil;
  "job-billing"?: string;
  "job-sheets"?: string; // Banner pages

  // Copies and collation
  copies?: number;
  collate?: boolean;

  // Media selection
  media?: string; // Can be size, type, or source
  "media-size"?: MediaSize;
  "media-type"?: MediaType;
  "media-source"?: MediaSource;

  // Page orientation and layout
  landscape?: boolean;
  "orientation-requested"?: OrientationRequested;

  // Duplex printing
  sides?: Sides;

  // Page selection and arrangement
  "page-ranges"?: string; // e.g., "1-4,7,9-12"
  "number-up"?: NumberUp;
  "number-up-layout"?: NumberUpLayout;
  "page-border"?: PageBorder;

  // Print quality and appearance
  "print-quality"?: PrintQuality;
  "print-color-mode"?: ColorMode;
  resolution?: string; // e.g., "300dpi", "600x300dpi"

  // Output control
  "output-order"?: OutputOrder;
  outputbin?: string;

  // Image and document options
  "fit-to-page"?: boolean;
  mirror?: boolean;
  "natural-scaling"?: number; // Percentage
  scaling?: number; // Percentage

  // Document format
  "document-format"?: DocumentFormat;

  // Finishing options
  finishings?: string; // Stapling, hole punching, etc.

  // Color management
  gamma?: number;
  brightness?: number;

  // Custom options (catch-all for printer-specific options)
  [key: string]: string | number | boolean | undefined;
}
```

**Example usage:**
```typescript
const jobId = await printer.printFile("document.pdf", {
  cups: {
    "job-name": "Important Document",
    "job-priority": 75,
    "print-quality": 5, // High quality
    "media-size": "A4",
    sides: "two-sided-long-edge",
    "page-ranges": "1-10,15,20-25",
    collate: true
  }
});
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

#### Core Enums

##### `PrintError`

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

#### CUPS Printing Option Types

##### `MediaSize`

Supported paper sizes including standard formats:

```typescript
type MediaSize = 
  | "Letter" | "Legal" | "A4" | "A3" | "A5" | "B4" | "B5" 
  | "Executive" | "Tabloid" | "COM10" | "DL" | "C5" 
  | "B5-envelope" | "Monarch" | "Invoice" | "Folio" 
  | "QuartoUs" | "a0" | "a1" | "a2" 
  | string; // Allow custom sizes
```

##### `MediaType`

Paper/media types for print jobs:

```typescript
type MediaType = 
  | "auto" | "plain" | "bond" | "letterhead" | "transparency" 
  | "envelope" | "envelope-manual" | "continuous" | "continuous-long" 
  | "continuous-short" | "tab-stock" | "pre-printed" | "labels" 
  | "multi-layer" | "screen" | "stationery" | "stationery-coated" 
  | "stationery-inkjet" | "stationery-preprinted" | "stationery-letterhead" 
  | "stationery-fine" | "multi-part-form" | "other" 
  | string; // Allow custom types
```

##### `MediaSource`

Paper tray/source selection:

```typescript
type MediaSource = 
  | "auto" | "main" | "alternate" | "large-capacity" | "manual" 
  | "envelope" | "envelope-manual" | "auto-select" 
  | "tray-1" | "tray-2" | "tray-3" | "tray-4" 
  | "left" | "middle" | "right" | "rear" | "side" 
  | "top" | "bottom" | "center" | "photo" | "disc" 
  | string; // Allow custom sources
```

##### Other CUPS Types

```typescript
type OrientationRequested = 3 | 4 | 5 | 6; // Portrait, Landscape, Reverse landscape, Reverse portrait
type PrintQuality = 3 | 4 | 5; // Draft, Normal, High
type Sides = "one-sided" | "two-sided-long-edge" | "two-sided-short-edge";
type NumberUp = 1 | 2 | 4 | 6 | 9 | 16; // Pages per sheet
type NumberUpLayout = "lrtb" | "lrbt" | "rltb" | "rlbt" | "tblr" | "tbrl" | "btlr" | "btrl";
type PageBorder = "none" | "single" | "single-thick" | "double" | "double-thick";
type OutputOrder = "normal" | "reverse";
type JobHoldUntil = "no-hold" | "indefinite" | "day-time" | "evening" | "night" | "second-shift" | "third-shift" | "weekend" | string;
type ColorMode = "monochrome" | "color" | "auto";
type DocumentFormat = "application/pdf" | "application/postscript" | "application/vnd.cups-raw" | "text/plain" | "image/jpeg" | "image/png" | "image/gif" | "application/vnd.cups-raster" | "image/urf" | string;
type CustomPageSizeUnit = "pt" | "in" | "cm" | "mm";
```

#### Job and Printer State Types

##### `PrinterJobState`

```typescript
type PrinterJobState = 
  | "pending"    // Job queued, waiting to be processed
  | "paused"     // Job temporarily halted
  | "processing" // Job currently being printed
  | "cancelled"  // Job cancelled by user or system
  | "completed"  // Job finished successfully
  | "unknown";   // Undetermined state
```

##### `PrinterState`

```typescript
type PrinterState = "idle" | "processing" | "stopped" | "unknown";
```

#### Main Interfaces

#### `PrinterJob`

```typescript
interface PrinterJob {
  id: number;
  name: string;
  state: PrinterJobState;
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
