# @printers/printers Documentation

Welcome to the comprehensive documentation for the `@printers/printers` library - a cross-runtime printer library for JavaScript with Node.js, Deno, and Bun support.

## Quick Start

```typescript
import { getAllPrinters, getPrinterByName } from "@printers/printers";

// Get all available printers
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

## Documentation Structure

### Core Features

- **[Cross-Runtime Support](./CrossRuntimeSupport.md)** - Node.js, Deno, and Bun compatibility
- **[Printing Options](./PrintingOptions.md)** - Simple, CUPS, and raw printing configuration
- **[Job Tracking](./JobTracking.md)** - Monitor and manage print jobs
- **[Printer State Monitoring](./PrinterStateMonitoring.md)** - Real-time printer state change events

## Basic Examples

### Getting Printer Information

```typescript
import { getAllPrinters, getDefaultPrinter } from "@printers/printers";

// List all printers
const printers = getAllPrinters();
for (const printer of printers) {
  console.log(`${printer.name}: ${printer.state}`);
  console.log(`  Location: ${printer.location}`);
  console.log(`  Default: ${printer.isDefault}`);
}

// Get default printer
const defaultPrinter = getDefaultPrinter();
if (defaultPrinter) {
  console.log("Default printer:", defaultPrinter.name);
}
```

### Simple Printing

```typescript
import { getPrinterByName } from "@printers/printers";

const printer = getPrinterByName("My Printer");

// Print with simple options
await printer.printFile("document.pdf", {
  simple: {
    copies: 3,
    duplex: true,
    paperSize: "Letter",
    quality: "high",
    color: false
  }
});

// Print raw bytes
const pdfData = new Uint8Array([...]); // PDF content
await printer.printBytes(pdfData, {
  jobName: "Raw PDF Print"
});
```

### State Monitoring

```typescript
import { subscribeToPrinterStateChanges } from "@printers/printers";

// Subscribe to printer events
const subscription = await subscribeToPrinterStateChanges(event => {
  console.log(`Event: ${event.eventType} for ${event.printerName}`);

  if (event.eventType === "disconnected") {
    console.log("⚠️ Printer went offline!");
  }

  if (event.eventType === "state_changed") {
    console.log(`State: ${event.oldState} → ${event.newState}`);
  }
});

// Unsubscribe when done
await subscription.unsubscribe();
```

### Job Tracking

```typescript
const printer = getPrinterByName("My Printer");

// Submit job without waiting
const jobId = await printer.printFile("large-document.pdf", {
  jobName: "Large Document",
  waitForCompletion: false,
});

// Monitor job progress
const checkJob = () => {
  const job = printer.getJob(jobId);
  if (job) {
    console.log(`Job ${jobId}: ${job.state} (${job.ageSeconds}s old)`);

    if (job.state === "completed") {
      console.log("✅ Job completed successfully!");
    } else if (job.state === "cancelled") {
      console.log("❌ Job was cancelled");
    } else {
      setTimeout(checkJob, 1000); // Check again in 1 second
    }
  }
};
checkJob();
```

## Runtime-Specific Examples

See the [examples](../examples) folder for runtime-specific examples.

## Testing and Development

### Simulation Mode

For safe development and testing, enable simulation mode:

```typescript
// Node.js/Bun
process.env.PRINTERS_JS_SIMULATE = "true";

// Deno
Deno.env.set("PRINTERS_JS_SIMULATE", "true");

// Check if simulation is active
import { isSimulationMode } from "@printers/printers";
console.log("Simulation mode:", isSimulationMode);
```

In simulation mode:

- No real printing occurs
- Simulated printers are available
- Jobs complete quickly
- State changes are generated for testing

### Running Tests

```bash
# Test all runtimes with comprehensive reporting
task test                      # All runtimes via test-runtimes.js
task test -- rust              # Only Rust tests
task test -- deno node bun     # Only JavaScript runtimes

# Test with verbose output (for debugging)
task test:direct               # All runtimes with direct commands
task test:direct:rust          # cargo test (verbose)
task test:direct:deno          # deno test (verbose)
task test:direct:node          # Node.js test runner (verbose)
task test:direct:bun           # bun test (verbose)
```

## Error Handling

```typescript
import { getPrinterByName, PrintError } from "@printers/printers";

try {
  const printer = getPrinterByName("NonExistent Printer");
  if (!printer) {
    throw new Error("Printer not found");
  }

  await printer.printFile("document.pdf");
} catch (error) {
  if (error.code === PrintError.PrinterNotFound) {
    console.log("Printer is not available");
  } else if (error.code === PrintError.FileNotFound) {
    console.log("Document file not found");
  } else {
    console.log("Print error:", error.message);
  }
}
```

## Version History

- **v0.8.0+** - Printer state monitoring and event subscription
- **v0.7.0+** - waitForCompletion parameter and job tracking enhancements
- **v0.6.0+** - CUPS options implementation and cross-runtime testing
- **v0.5.0+** - Basic cross-runtime support and N-API bindings

For detailed changelogs and migration guides, see the main project documentation.
