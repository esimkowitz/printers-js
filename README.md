# @printers/printers

[![NPM](https://img.shields.io/npm/v/%40printers%2Fprinters)](https://www.npmjs.com/package/@printers/printers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/esimkowitz/printers-js/blob/main/LICENSE)
[![Build](https://github.com/esimkowitz/printers-js/actions/workflows/ci.yml/badge.svg)](https://github.com/esimkowitz/printers-js/actions/workflows/ci.yml)

Cross-runtime printer library for Node.js, Deno, and Bun with native performance and comprehensive printing capabilities.

## Features

- 🔄 **Cross-runtime compatibility** - Node.js, Deno, and Bun support
- 🖨️ **Cross-platform printing** - Windows, macOS, and Linux
- 🦀 **Native performance** - Rust backend with N-API bindings
- 🔒 **Safe testing** - Simulation mode prevents accidental printing
- 📊 **Real-time monitoring** - Printer state changes and job tracking
- 🔧 **Flexible options** - Simple, CUPS, and raw printing configuration
- ⚡ **Async control** - Choose immediate return or wait for completion

## Installation

### Node.js

```bash
npm install @printers/printers
```

### Deno

```bash
deno add npm:@printers/printers
```

Add to `deno.json`:

```json
{
  "nodeModulesDir": "auto"
}
```

Run with required permissions:

```bash
deno run --allow-ffi --allow-env your-script.ts
```

### Bun

```bash
bun add @printers/printers
```

## Documentation

📚 **[Complete Documentation](./docs/README.md)** - Comprehensive guides and examples

### Feature Guides

- **[Cross-Runtime Support](./docs/CrossRuntimeSupport.md)** - Node.js, Deno, and Bun compatibility
- **[Printing Options](./docs/PrintingOptions.md)** - Simple, CUPS, and raw printing configuration
- **[Job Tracking](./docs/JobTracking.md)** - Monitor and manage print jobs
- **[Printer State Monitoring](./docs/PrinterStateMonitoring.md)** - Real-time printer state change events

## Quick Start

```typescript
import { getAllPrinters, getPrinterByName } from "@printers/printers";

// List all available printers
const printers = getAllPrinters();
console.log(
  "Available printers:",
  printers.map(p => p.name)
);

// Print a document
const printer = getPrinterByName("My Printer");
if (printer) {
  const jobId = await printer.printFile("document.pdf", {
    simple: {
      copies: 2,
      duplex: true,
      quality: "high",
    },
  });
  console.log("Print job submitted:", jobId);
}
```

## API Reference

### Core Functions

#### `getAllPrinters(): Printer[]`

Returns an array of all available system printers.

#### `getPrinterByName(name: string): Printer | null`

Find a printer by its exact name.

#### `getAllPrinterNames(): string[]`

Returns an array of printer names.

#### `printerExists(name: string): boolean`

Check if a printer exists on the system.

### Printer Class

#### Properties

- `name: string` - Printer display name
- `state?: PrinterState` - Current printer state (`"idle"`, `"printing"`, `"paused"`, `"offline"`, `"unknown"`)
- `isDefault?: boolean` - Whether this is the default printer
- `location?: string` - Physical location description
- `driverName?: string` - Printer driver name
- `stateReasons?: string[]` - Array of state reason strings

#### Methods

- `printFile(filePath: string, options?: PrintJobOptions): Promise<number>` - Print a file and return job ID
- `printBytes(data: Uint8Array, options?: PrintJobOptions): Promise<number>` - Print raw bytes and return job ID
- `getActiveJobs(): PrinterJob[]` - Get currently active/pending jobs
- `getJobHistory(limit?: number): PrinterJob[]` - Get completed job history
- `getJob(jobId: number): PrinterJob | null` - Get specific job details
- `cleanupOldJobs(maxAgeSeconds: number): number` - Remove old jobs

### State Monitoring

#### `subscribeToPrinterStateChanges(callback): Promise<PrinterStateSubscription>`

Subscribe to real-time printer state change events.

```typescript
const subscription = await subscribeToPrinterStateChanges(event => {
  console.log(`${event.eventType}: ${event.printerName}`);
});

// Later: unsubscribe
await subscription.unsubscribe();
```

#### `getPrinterStateSnapshots(): Map<string, PrinterStateSnapshot>`

Get current state of all printers.

#### `startPrinterStateMonitoring(config?): Promise<void>`

Start printer state monitoring with optional configuration.

### Print Options

#### `PrintJobOptions`

```typescript
interface PrintJobOptions {
  jobName?: string; // Job name for identification
  waitForCompletion?: boolean; // Wait for completion (default: true)
  simple?: SimplePrintOptions; // Easy-to-use options
  cups?: CUPSOptions; // Full CUPS options
  raw?: Record<string, string>; // Raw key-value options
}
```

#### `SimplePrintOptions`

```typescript
interface SimplePrintOptions {
  copies?: number;
  duplex?: boolean;
  paperSize?: "A4" | "Letter" | "Legal" | "A3" | "A5" | "Tabloid";
  quality?: "draft" | "normal" | "high";
  color?: boolean;
  pageRange?: string; // e.g., "1-5,8,10-12"
  landscape?: boolean;
}
```

## Examples

### Basic Printing

```typescript
const printer = getPrinterByName("My Printer");

// Simple printing
await printer.printFile("document.pdf", {
  simple: { copies: 2, duplex: true },
});

// With job tracking
const jobId = await printer.printFile("document.pdf", {
  waitForCompletion: false,
});

const job = printer.getJob(jobId);
console.log(`Job ${jobId}: ${job?.state}`);
```

### State Monitoring

```typescript
// Subscribe to printer events
const subscription = await subscribeToPrinterStateChanges(event => {
  switch (event.eventType) {
    case "connected":
      console.log(`Printer ${event.printerName} connected`);
      break;
    case "disconnected":
      console.log(`Printer ${event.printerName} disconnected`);
      break;
    case "state_changed":
      console.log(
        `${event.printerName}: ${event.oldState} → ${event.newState}`
      );
      break;
  }
});
```

### Custom Page Sizes

```typescript
import { createCustomPageSize } from "@printers/printers";

const photoSize = createCustomPageSize(4, 6, "in"); // "Custom.4x6in"

await printer.printFile("photo.jpg", {
  cups: {
    media: photoSize,
    "print-quality": 5,
  },
});
```

## Testing & Safety

### Simulation Mode

Enable simulation mode to test without real printing:

```bash
# Unix/Linux/macOS
PRINTERS_JS_SIMULATE=true node your-script.js

# Windows Command Prompt
set PRINTERS_JS_SIMULATE=true && node your-script.js

# Windows PowerShell
$env:PRINTERS_JS_SIMULATE="true"; node your-script.js
```

Check simulation status:

```typescript
import { isSimulationMode } from "@printers/printers";
console.log("Simulation mode:", isSimulationMode);
```

## Platform Support

| OS      | Architecture | Node.js | Deno | Bun |
| ------- | ------------ | ------- | ---- | --- |
| Windows | x64          | ✅      | ✅   | ✅  |
| Windows | ARM64        | ✅      | ❌   | ❌  |
| macOS   | x64          | ✅      | ✅   | ✅  |
| macOS   | ARM64        | ✅      | ✅   | ✅  |
| Linux   | x64          | ✅      | ✅   | ✅  |
| Linux   | ARM64        | ✅      | ✅   | ✅  |

## Development

For development setup, build instructions, and contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT License - see [LICENSE](./LICENSE) file for details.
