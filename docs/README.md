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

### Installation Guides

#### Node.js

```bash
npm install @printers/printers
```

#### Deno

```typescript
import { getAllPrinters } from "npm:@printers/printers";
```

#### Bun

```bash
bun add @printers/printers
```

## Key Features

- ✅ **Cross-runtime compatibility** - Works with Node.js, Deno, and Bun
- ✅ **Type-safe APIs** - Full TypeScript support with comprehensive type definitions
- ✅ **Real-time monitoring** - Subscribe to printer state changes and events
- ✅ **Flexible printing options** - Simple, CUPS, and raw option formats
- ✅ **Job tracking** - Monitor print job lifecycle and history
- ✅ **Simulation mode** - Safe testing without real hardware
- ✅ **Cross-platform** - Windows, macOS, and Linux support

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

### Node.js

```typescript
import fs from "fs";
import { getPrinterByName } from "@printers/printers";

const printer = getPrinterByName("My Printer");

// Check if file exists before printing
if (fs.existsSync("document.pdf")) {
  await printer.printFile("document.pdf");
}
```

### Deno

```typescript
import { getPrinterByName } from "npm:@printers/printers";

// Set simulation mode
Deno.env.set("PRINTERS_JS_SIMULATE", "true");

const printer = getPrinterByName("My Printer");

// Check if file exists (Deno style)
try {
  await Deno.stat("document.pdf");
  await printer.printFile("document.pdf");
} catch {
  console.log("File not found");
}
```

### Bun

```typescript
import { getPrinterByName } from "@printers/printers";
import { file } from "bun";

const printer = getPrinterByName("My Printer");

// Use Bun's file API
const document = file("document.pdf");
if (await document.exists()) {
  await printer.printFile("document.pdf");
}
```

## Advanced Usage

### Custom Print Farm Monitoring

```typescript
import {
  getAllPrinters,
  subscribeToPrinterStateChanges,
  startPrinterStateMonitoring,
} from "@printers/printers";

class PrintFarmManager {
  private printers = new Map<string, any>();
  private subscription: any = null;

  async initialize() {
    // Start monitoring all printers
    await startPrinterStateMonitoring({ pollInterval: 1 });

    // Subscribe to events
    this.subscription = await subscribeToPrinterStateChanges(event => {
      this.handlePrinterEvent(event);
    });

    // Get initial printer states
    const printers = getAllPrinters();
    for (const printer of printers) {
      this.printers.set(printer.name, {
        state: printer.state,
        lastSeen: Date.now(),
        jobQueue: [],
      });
    }
  }

  private handlePrinterEvent(event: any) {
    switch (event.eventType) {
      case "connected":
        console.log(`✅ Printer ${event.printerName} came online`);
        this.printers.set(event.printerName, {
          state: "idle",
          lastSeen: Date.now(),
          jobQueue: [],
        });
        break;

      case "disconnected":
        console.log(`❌ Printer ${event.printerName} went offline`);
        this.printers.delete(event.printerName);
        break;

      case "state_changed":
        console.log(
          `🔄 ${event.printerName}: ${event.oldState} → ${event.newState}`
        );
        const printerInfo = this.printers.get(event.printerName);
        if (printerInfo) {
          printerInfo.state = event.newState;
          printerInfo.lastSeen = Date.now();
        }
        break;
    }
  }

  getStatus() {
    const status = {
      total: this.printers.size,
      online: 0,
      printing: 0,
      idle: 0,
      errors: 0,
    };

    for (const [name, info] of this.printers) {
      status.online++;

      switch (info.state) {
        case "idle":
          status.idle++;
          break;
        case "processing":
          status.printing++;
          break;
        case "offline":
        case "paused":
          status.errors++;
          break;
      }
    }

    return status;
  }

  async shutdown() {
    if (this.subscription) {
      await this.subscription.unsubscribe();
    }
  }
}

// Usage
const farm = new PrintFarmManager();
await farm.initialize();

// Monitor status
setInterval(() => {
  const status = farm.getStatus();
  console.log(
    `Farm Status: ${status.online} online, ${status.idle} idle, ${status.printing} printing`
  );
}, 5000);
```

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
# Test all runtimes
task test

# Test specific runtime
task test:node
task test:deno
task test:bun
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

## Performance Tips

1. **Use simulation mode** during development
2. **Enable waitForCompletion: false** for responsive UIs
3. **Subscribe to state changes** instead of polling
4. **Clean up old jobs** regularly with `cleanupOldJobs()`
5. **Unsubscribe from events** when done
6. **Batch multiple print jobs** when possible

## Support and Contributing

- **Issues**: Report bugs and request features on [GitHub](https://github.com/your-repo/printers-js)
- **Documentation**: Contribute to documentation improvements
- **Testing**: Help test across different platforms and runtimes
- **Examples**: Share real-world usage examples

## Version History

- **v0.8.0+** - Printer state monitoring and event subscription
- **v0.7.0+** - waitForCompletion parameter and job tracking enhancements
- **v0.6.0+** - CUPS options implementation and cross-runtime testing
- **v0.5.0+** - Basic cross-runtime support and N-API bindings

For detailed changelogs and migration guides, see the main project documentation.

## Next Steps

1. **Read the feature documentation** that interests you most
2. **Try the examples** in your preferred runtime
3. **Enable simulation mode** for safe experimentation
4. **Join the community** for support and discussion

Choose the documentation section that matches your needs:

- **Getting started with printing**: [Printing Options](./PrintingOptions.md)
- **Tracking print jobs**: [Job Tracking](./JobTracking.md)
- **Monitoring printer status**: [Printer State Monitoring](./PrinterStateMonitoring.md)
- **Working across runtimes**: [Cross-Runtime Support](./CrossRuntimeSupport.md)
