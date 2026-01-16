# Job Tracking and Management

This document describes the print job tracking and management functionality in the `@printers/printers` library.

## Overview

The job tracking system provides comprehensive monitoring and management of print jobs, including:

- **Job lifecycle tracking** - Monitor jobs from submission to completion
- **Job state management** - Track pending, processing, completed, and cancelled states
- **Job history** - Maintain records of completed jobs
- **Active job monitoring** - Get real-time status of running jobs
- **Job cleanup** - Remove old completed jobs to manage memory

## Job Interface

The `PrinterJob` interface provides comprehensive job information:

```typescript
interface PrinterJob {
  id: number; // Unique job identifier
  name: string; // Job title/description
  state: PrinterJobState; // Current job status
  mediaType: string; // File type (e.g., "application/pdf")
  createdAt: number; // Job creation timestamp (Unix timestamp)
  processedAt?: number; // Processing start time (optional)
  completedAt?: number; // Job completion time (optional)
  printerName: string; // Associated printer name
  errorMessage?: string; // Error details if failed
  ageSeconds: number; // Age in seconds for convenience
}

type PrinterJobState =
  | "pending" // Job queued, waiting to be processed
  | "paused" // Job temporarily halted
  | "processing" // Job currently being printed
  | "cancelled" // Job cancelled by user or system
  | "completed" // Job finished successfully
  | "unknown"; // Undetermined state
```

## Basic Usage

### Getting Job Information

```typescript
import { getPrinterByName } from "@printers/printers";

const printer = await getPrinterByName("My Printer");

// Get a specific job by ID
const job = await printer.getJob(12345);
if (job) {
  console.log(`Job ${job.id}: ${job.name} - ${job.state}`);
  console.log(`Created: ${new Date(job.createdAt)}`);
  if (job.errorMessage) {
    console.log(`Error: ${job.errorMessage}`);
  }
}

// Get all active (running/pending) jobs
const activeJobs = await printer.getActiveJobs();
console.log(`${activeJobs.length} active jobs`);

// Get completed job history (last 10 jobs)
const history = await printer.getJobHistory(10);
console.log(`Last ${history.length} completed jobs`);

// Get all jobs (active + completed)
const allJobs = await printer.getAllJobs();
console.log(`Total ${allJobs.length} jobs tracked`);
```

### Tracking Job Lifecycle

```typescript
import { getPrinterByName } from "@printers/printers";

const printer = await getPrinterByName("My Printer");

// Submit a job and get its ID
const jobId = await printer.printFile("document.pdf", {
  jobName: "Important Document",
  waitForCompletion: false, // Return immediately
});

console.log(`Job submitted with ID: ${jobId}`);

// Monitor job progress
const checkJobStatus = async () => {
  const job = await printer.getJob(jobId);
  if (job) {
    console.log(`Job ${jobId}: ${job.state}`);

    switch (job.state) {
      case "pending":
        console.log("  Waiting in queue...");
        break;
      case "processing":
        console.log("  Currently printing...");
        break;
      case "completed":
        console.log(`  Completed at ${new Date(job.completedAt!)}`);
        return; // Stop monitoring
      case "cancelled":
        console.log("  Job was cancelled");
        return; // Stop monitoring
      default:
        console.log(`  Status: ${job.state}`);
    }

    // Check again in 1 second
    setTimeout(checkJobStatus, 1000);
  }
};

checkJobStatus();
```

## Advanced Usage

### Job History Management

```typescript
import { getPrinterByName } from "@printers/printers";

const printer = await getPrinterByName("My Printer");

// Get recent job history with details
const recentJobs = await printer.getJobHistory(20);

console.log("Recent Job History:");
for (const job of recentJobs) {
  const duration =
    job.completedAt && job.processedAt ? job.completedAt - job.processedAt : 0;

  console.log(`${job.name}:`);
  console.log(`  ID: ${job.id}`);
  console.log(`  State: ${job.state}`);
  console.log(`  Media: ${job.mediaType}`);
  console.log(`  Duration: ${duration}ms`);

  if (job.errorMessage) {
    console.log(`  Error: ${job.errorMessage}`);
  }
  console.log();
}

// Clean up old jobs (older than 1 hour)
const oneHour = 60 * 60; // seconds
const removedCount = await printer.cleanupOldJobs(oneHour);
console.log(`Removed ${removedCount} old jobs`);
```

### Monitoring All Printers

```typescript
import { getAllPrinters } from "@printers/printers";

// Monitor jobs across all printers
const monitorAllJobs = async () => {
  const printers = await getAllPrinters();

  for (const printer of printers) {
    const activeJobs = await printer.getActiveJobs();

    if (activeJobs.length > 0) {
      console.log(`\n${printer.name} (${activeJobs.length} active jobs):`);

      for (const job of activeJobs) {
        const age = Math.floor(job.ageSeconds);
        console.log(`  ${job.name} (${job.state}, ${age}s old)`);
      }
    }
  }
};

// Run monitoring every 5 seconds
setInterval(monitorAllJobs, 5000);
```

### Job Statistics

```typescript
import { getAllPrinters } from "@printers/printers";

class JobStatistics {
  static async getStats() {
    const printers = await getAllPrinters();
    const stats = {
      totalJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      byPrinter: new Map<string, any>(),
    };

    for (const printer of printers) {
      const allJobs = await printer.getAllJobs();
      const activeJobs = await printer.getActiveJobs();
      const history = await printer.getJobHistory();

      const printerStats = {
        total: allJobs.length,
        active: activeJobs.length,
        completed: history.filter(j => j.state === "completed").length,
        failed: history.filter(j => j.state === "cancelled").length,
        averageAge:
          allJobs.length > 0
            ? allJobs.reduce((sum, job) => sum + job.ageSeconds, 0) /
              allJobs.length
            : 0,
      };

      stats.byPrinter.set(printer.name, printerStats);
      stats.totalJobs += printerStats.total;
      stats.activeJobs += printerStats.active;
      stats.completedJobs += printerStats.completed;
      stats.failedJobs += printerStats.failed;
    }

    return stats;
  }

  static async printReport() {
    const stats = await this.getStats();

    console.log("=== Job Statistics ===");
    console.log(`Total Jobs: ${stats.totalJobs}`);
    console.log(`Active Jobs: ${stats.activeJobs}`);
    console.log(`Completed Jobs: ${stats.completedJobs}`);
    console.log(`Failed Jobs: ${stats.failedJobs}`);
    console.log();

    console.log("Per-Printer Breakdown:");
    for (const [printerName, printerStats] of stats.byPrinter) {
      console.log(`\n${printerName}:`);
      console.log(`  Total: ${printerStats.total}`);
      console.log(`  Active: ${printerStats.active}`);
      console.log(`  Completed: ${printerStats.completed}`);
      console.log(`  Failed: ${printerStats.failed}`);
      console.log(`  Avg Age: ${printerStats.averageAge.toFixed(1)}s`);
    }
  }
}

// Usage
await JobStatistics.printReport();
```

## API Reference

### Printer Methods

#### `getJob(jobId: number): Promise<PrinterJob | null>`

Gets a specific job by ID if it belongs to this printer.

**Parameters:**

- `jobId`: Job ID to look up

**Returns:**

- `PrinterJob` object if found, `null` otherwise

#### `getActiveJobs(): Promise<PrinterJob[]>`

Gets all currently active (pending/processing) jobs for this printer.

**Returns:**

- Array of active `PrinterJob` objects

#### `getJobHistory(limit?: number): Promise<PrinterJob[]>`

Gets completed/cancelled job history for this printer.

**Parameters:**

- `limit` (optional): Maximum number of jobs to return

**Returns:**

- Array of completed `PrinterJob` objects, sorted by completion time (most recent first)

#### `getAllJobs(): Promise<PrinterJob[]>`

Gets all jobs (active and completed) for this printer.

**Returns:**

- Array of all `PrinterJob` objects

#### `cleanupOldJobs(maxAgeSeconds: number): Promise<number>`

Removes old completed/cancelled jobs that exceed the specified age.

**Parameters:**

- `maxAgeSeconds`: Maximum age in seconds for jobs to keep

**Returns:**

- Number of jobs removed

## Print Job Options

When submitting jobs, you can specify options that affect job tracking:

```typescript
// Submit job with custom name and tracking options
const jobId = await printer.printFile("document.pdf", {
  jobName: "Monthly Report", // Custom job name
  waitForCompletion: false, // Return immediately for tracking
  simple: {
    copies: 2,
    duplex: true,
  },
});

// Submit raw bytes with tracking
const data = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // PDF header
const jobId2 = await printer.printBytes(data, {
  jobName: "Raw Data Print",
  cups: {
    "media-size": "Letter",
    "print-quality": "5",
  },
});
```

## Wait for Completion Options

The `waitForCompletion` parameter affects job tracking behavior:

```typescript
// Wait for job to complete (default behavior)
const jobId1 = await printer.printFile("document.pdf", {
  waitForCompletion: true, // or omit (defaults to true)
});
// Job will be in "completed" or "cancelled" state when promise resolves

// Return immediately for real-time tracking
const jobId2 = await printer.printFile("document.pdf", {
  waitForCompletion: false,
});
// Job starts in "pending" state, can track progress in real-time
```

## Media Type Detection

Jobs automatically detect and track media types based on file extensions:

```typescript
const jobs = [
  await printer.printFile("document.pdf"), // mediaType: "application/pdf"
  await printer.printFile("image.jpg"), // mediaType: "image/jpeg"
  await printer.printFile("text.txt"), // mediaType: "text/plain"
  await printer.printFile("script.ps"), // mediaType: "application/postscript"
];

// Raw bytes are tracked as CUPS raw format
await printer.printBytes(data, { jobName: "Raw Print" });
// mediaType: "application/vnd.cups-raw"
```

## Error Handling

Jobs can fail for various reasons, and errors are tracked in the job record:

```typescript
const jobId = await printer.printFile("nonexistent.pdf", {
  waitForCompletion: false,
});

// Check for errors
setTimeout(async () => {
  const job = await printer.getJob(jobId);
  if (job && job.state === "cancelled" && job.errorMessage) {
    console.log(`Job failed: ${job.errorMessage}`);

    // Common error conditions:
    // - "File not found"
    // - "Printer offline"
    // - "Invalid print options"
    // - "Media jam detected"
  }
}, 1000);
```

## Testing in Simulation Mode

Job tracking works in simulation mode for safe testing:

```typescript
// Set simulation mode
process.env.PRINTERS_JS_SIMULATE = "true";

import { getPrinterByName } from "@printers/printers";

const printer = await getPrinterByName("Simulated Printer");

// Submit test jobs
const jobId = await printer.printFile("/test/document.pdf", {
  jobName: "Simulation Test",
  waitForCompletion: false,
});

// Jobs will complete quickly in simulation mode
const job = await printer.getJob(jobId);
console.log(`Simulated job state: ${job?.state}`);
```

## Performance Considerations

- **Memory usage**: Jobs are kept in memory; use `cleanupOldJobs()` regularly
- **Job limits**: No built-in limits; implement your own if needed
- **Real-time tracking**: Use `waitForCompletion: false` for responsive UIs
- **History size**: Limit job history size for long-running applications

## Migration Guide

If upgrading from basic printing to job tracking:

**Before:**

```typescript
// Basic printing (fire and forget)
await printer.printFile("document.pdf");
console.log("Print job submitted");
```

**After:**

```typescript
// With job tracking
const jobId = await printer.printFile("document.pdf", {
  jobName: "Important Document",
  waitForCompletion: false,
});

console.log(`Print job ${jobId} submitted`);

// Monitor progress
const job = await printer.getJob(jobId);
if (job) {
  console.log(`Job state: ${job.state}`);
}
```
