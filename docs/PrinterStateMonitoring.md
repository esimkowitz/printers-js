# Printer State Monitoring and Event Subscription

This document describes the printer state monitoring and event subscription functionality added to the `@printers/printers` library.

## Overview

The printer state monitoring system allows you to:

- **Monitor printer connections** - Get notified when printers connect or disconnect
- **Track state changes** - Monitor when printers change state (idle ↔ printing ↔ paused ↔ error)
- **Monitor error conditions** - Get notifications when printer state reasons change (e.g., paper jam, low ink)
- **Subscribe to events** - Register callbacks to handle state change events in real-time

## Key Features

- **Cross-runtime compatibility** - Works with Node.js, Deno, and Bun
- **Automatic lifecycle management** - Monitoring starts/stops automatically with subscriptions
- **Multiple subscriptions** - Support for multiple event listeners
- **Configurable polling** - Customizable polling intervals for state monitoring
- **Simulation mode support** - Safe testing in simulation mode

## Basic Usage

### Starting and Stopping Monitoring

```typescript
import {
  startPrinterStateMonitoring,
  stopPrinterStateMonitoring,
  isPrinterStateMonitoringActive,
} from "@printers/printers";

// Check if monitoring is active
console.log("Active:", isPrinterStateMonitoringActive()); // false

// Start monitoring with default settings (2 second polling)
await startPrinterStateMonitoring();

// Start monitoring with custom configuration
await startPrinterStateMonitoring({
  pollInterval: 5, // Poll every 5 seconds
  autoStart: true, // Start immediately
});

// Check status
console.log("Active:", isPrinterStateMonitoringActive()); // true

// Stop monitoring
await stopPrinterStateMonitoring();
```

### Event Subscription

```typescript
import {
  subscribeToPrinterStateChanges,
  type PrinterStateChangeEvent,
} from "@printers/printers";

// Subscribe to all printer state change events
const subscription = await subscribeToPrinterStateChanges(
  (event: PrinterStateChangeEvent) => {
    console.log(`Event: ${event.eventType} for ${event.printerName}`);

    switch (event.eventType) {
      case "connected":
        console.log(`Printer ${event.printerName} connected`);
        break;

      case "disconnected":
        console.log(`Printer ${event.printerName} disconnected`);
        break;

      case "state_changed":
        console.log(
          `Printer ${event.printerName}: ${event.oldState} → ${event.newState}`
        );
        break;

      case "state_reasons_changed":
        console.log(`Printer ${event.printerName} reasons changed:`);
        console.log(`  Old: [${event.oldReasons?.join(", ")}]`);
        console.log(`  New: [${event.newReasons?.join(", ")}]`);
        break;
    }
  }
);

// Unsubscribe when done
await subscription.unsubscribe();
```

### Getting State Snapshots

```typescript
import { getPrinterStateSnapshots } from "@printers/printers";

const snapshots = getPrinterStateSnapshots();

for (const [printerName, snapshot] of snapshots) {
  console.log(`${printerName}:`);
  console.log(`  State: ${snapshot.state}`);
  console.log(`  Reasons: [${snapshot.stateReasons.join(", ")}]`);
  console.log(`  Timestamp: ${new Date(snapshot.timestamp)}`);
}
```

## Advanced Usage

### Multiple Subscriptions

```typescript
// Create multiple event handlers
const generalSubscription = await subscribeToPrinterStateChanges(event => {
  // Log all events
  console.log(`[General] ${event.eventType}: ${event.printerName}`);
});

const errorSubscription = await subscribeToPrinterStateChanges(event => {
  // Handle only error-related events
  if (
    event.eventType === "state_reasons_changed" &&
    event.newReasons &&
    event.newReasons.length > 0
  ) {
    console.log(
      `[Error] Printer ${event.printerName} has issues: ${event.newReasons.join(", ")}`
    );
    // Send alert, log to monitoring system, etc.
  }
});

// Both subscriptions will receive events
// Monitoring automatically starts when first subscription is created
// Monitoring automatically stops when last subscription is removed
```

### Custom Polling Intervals

```typescript
// Start with fast polling for responsive monitoring
await startPrinterStateMonitoring({ pollInterval: 1 });

// Later, reduce polling frequency to save resources
await setPrinterStateMonitoringInterval(10);
```

### Printer-Specific Monitoring

```typescript
import { getPrinterByName } from "@printers/printers";

const subscription = await subscribeToPrinterStateChanges(event => {
  // Filter events for specific printer
  if (event.printerName === "Important Printer") {
    console.log(`Important printer event: ${event.eventType}`);

    if (event.eventType === "disconnected") {
      // Send urgent alert
      sendAlert("Critical printer offline!");
    }
  }
});
```

## API Reference

### Functions

#### `startPrinterStateMonitoring(config?: PrinterStateMonitorConfig): Promise<void>`

Starts printer state monitoring.

**Parameters:**

- `config` (optional): Configuration object
  - `pollInterval`: Polling interval in seconds (default: 2)
  - `autoStart`: Whether to start immediately (default: true)

#### `stopPrinterStateMonitoring(): Promise<void>`

Stops printer state monitoring.

#### `isPrinterStateMonitoringActive(): boolean`

Checks if printer state monitoring is currently active.

#### `subscribeToPrinterStateChanges(callback: PrinterStateChangeCallback): Promise<PrinterStateSubscription>`

Subscribes to printer state change events.

**Parameters:**

- `callback`: Function to call when events occur

**Returns:**

- `PrinterStateSubscription`: Object with `id` and `unsubscribe()` method

#### `getPrinterStateSnapshots(): Map<string, PrinterStateSnapshot>`

Gets current state of all printers.

**Returns:**

- Map of printer names to their current state information

#### `setPrinterStateMonitoringInterval(seconds: number): Promise<void>`

Sets the polling interval for state monitoring.

**Parameters:**

- `seconds`: Polling interval (minimum: 1 second)

### Types

#### `PrinterStateEventType`

```typescript
type PrinterStateEventType =
  | "connected" // Printer appeared/connected
  | "disconnected" // Printer removed/disconnected
  | "state_changed" // Printer state changed
  | "state_reasons_changed"; // Printer state reasons changed
```

#### `PrinterStateChangeEvent`

```typescript
interface PrinterStateChangeEvent {
  eventType: PrinterStateEventType;
  printerName: string;
  oldState?: string; // For state_changed events
  newState?: string; // For state_changed events
  oldReasons?: string[]; // For state_reasons_changed events
  newReasons?: string[]; // For state_reasons_changed events
  timestamp: number; // Unix timestamp
}
```

#### `PrinterStateSnapshot`

```typescript
interface PrinterStateSnapshot {
  name: string;
  state: string;
  stateReasons: string[];
  timestamp: number;
}
```

#### `PrinterStateSubscription`

```typescript
interface PrinterStateSubscription {
  id: number;
  unsubscribe(): Promise<boolean>;
}
```

#### `PrinterStateMonitorConfig`

```typescript
interface PrinterStateMonitorConfig {
  pollInterval?: number; // Polling interval in seconds (default: 2)
  autoStart?: boolean; // Start monitoring immediately (default: true)
}
```

## Printer States

The following printer states are reported (mapped from the printers crate's `PrinterState` enum):

- `"idle"` - Printer is ready and available (from `PrinterState::READY`)
- `"printing"` - Printer is currently printing (from `PrinterState::PRINTING`)
- `"paused"` - Printer is paused (from `PrinterState::PAUSED`)
- `"offline"` - Printer is offline or disconnected (from `PrinterState::OFFLINE`)
- `"unknown"` - Printer state cannot be determined (from `PrinterState::UNKNOWN`)

## Real-World Examples

### Monitoring Print Farm

```typescript
import {
  subscribeToPrinterStateChanges,
  getPrinterStateSnapshots,
} from "@printers/printers";

class PrintFarmMonitor {
  private subscription: PrinterStateSubscription | null = null;
  private alerts: string[] = [];

  async start() {
    this.subscription = await subscribeToPrinterStateChanges(event => {
      this.handlePrinterEvent(event);
    });

    // Initial status check
    this.checkAllPrinters();
  }

  async stop() {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  private handlePrinterEvent(event: PrinterStateChangeEvent) {
    switch (event.eventType) {
      case "disconnected":
        this.addAlert(`CRITICAL: Printer ${event.printerName} went offline`);
        break;

      case "state_reasons_changed":
        if (event.newReasons && event.newReasons.length > 0) {
          this.addAlert(
            `WARNING: ${event.printerName} - ${event.newReasons.join(", ")}`
          );
        }
        break;

      case "state_changed":
        if (event.newState === "paused") {
          this.addAlert(`WARNING: Printer ${event.printerName} paused`);
        }
        break;
    }
  }

  private checkAllPrinters() {
    const snapshots = getPrinterStateSnapshots();

    for (const [name, snapshot] of snapshots) {
      if (
        snapshot.state === "offline" ||
        snapshot.state === "paused" ||
        snapshot.stateReasons.length > 0
      ) {
        this.addAlert(
          `STATUS: ${name} - ${snapshot.state} (${snapshot.stateReasons.join(", ")})`
        );
      }
    }
  }

  private addAlert(message: string) {
    this.alerts.push(`${new Date().toISOString()}: ${message}`);
    console.log(message);
    // Send to monitoring system, email alerts, etc.
  }
}

// Usage
const monitor = new PrintFarmMonitor();
await monitor.start();

// Monitor will run until stopped
// await monitor.stop();
```

### Automatic Failover

```typescript
import {
  subscribeToPrinterStateChanges,
  getPrinterByName,
  getAllPrinters,
} from "@printers/printers";

class PrinterFailover {
  private primaryPrinter: string;
  private backupPrinters: string[];
  private subscription: PrinterStateSubscription | null = null;

  constructor(primaryPrinter: string, backupPrinters: string[]) {
    this.primaryPrinter = primaryPrinter;
    this.backupPrinters = backupPrinters;
  }

  async start() {
    this.subscription = await subscribeToPrinterStateChanges(event => {
      if (event.printerName === this.primaryPrinter) {
        this.handlePrimaryPrinterEvent(event);
      }
    });
  }

  private handlePrimaryPrinterEvent(event: PrinterStateChangeEvent) {
    if (
      event.eventType === "disconnected" ||
      (event.eventType === "state_changed" &&
        (event.newState === "offline" || event.newState === "paused"))
    ) {
      console.log(
        `Primary printer ${this.primaryPrinter} failed, switching to backup...`
      );
      this.switchToBackup();
    }
  }

  private switchToBackup() {
    for (const backupName of this.backupPrinters) {
      const backup = getPrinterByName(backupName);
      if (backup && backup.state === "idle") {
        console.log(`Switched to backup printer: ${backupName}`);
        // Update application configuration to use backup printer
        return;
      }
    }

    console.error("No backup printers available!");
  }
}
```

## Testing in Simulation Mode

The state monitoring system works seamlessly in simulation mode for safe testing:

```typescript
// Set simulation mode
process.env.PRINTERS_JS_SIMULATE = "true";
// or for Deno:
// Deno.env.set("PRINTERS_JS_SIMULATE", "true");

import { subscribeToPrinterStateChanges } from "@printers/printers";

// Events will be generated for simulated printers
const subscription = await subscribeToPrinterStateChanges(event => {
  console.log(`Simulated event: ${event.eventType} for ${event.printerName}`);
});
```

## Performance Considerations

- **Polling frequency**: Lower polling intervals (1-2 seconds) provide more responsive monitoring but use more CPU
- **Multiple subscriptions**: Each subscription receives all events; filter in callbacks for efficiency
- **Resource cleanup**: Always unsubscribe when done to prevent memory leaks
- **Network printers**: State changes may have delay depending on network conditions

## Cross-Runtime Compatibility

The state monitoring system works identically across all supported runtimes:

```typescript
// Node.js
import { subscribeToPrinterStateChanges } from "@printers/printers";

// Deno
import { subscribeToPrinterStateChanges } from "npm:@printers/printers";

// Bun
import { subscribeToPrinterStateChanges } from "@printers/printers";

// Usage is identical across all runtimes
const subscription = await subscribeToPrinterStateChanges(event => {
  console.log(`${event.eventType}: ${event.printerName}`);
});
```
