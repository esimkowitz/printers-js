# Printing Options and Configuration

This document describes the comprehensive printing options and configuration system in the `@printers/printers` library.

## Overview

The library provides multiple ways to configure print jobs through:

- **Simple options** - Easy-to-use typed options for common settings
- **CUPS options** - Full CUPS printing system options with type safety
- **Raw properties** - Direct key-value pairs for advanced customization
- **Option precedence** - Intelligent merging of different option types

## Key Features

- **Type-safe interfaces** - Full TypeScript support for all options
- **Multiple option formats** - Simple, CUPS, and raw options
- **Automatic conversion** - Simple options convert to CUPS automatically
- **Option precedence** - Clear hierarchy for conflicting options
- **Cross-platform support** - Works with CUPS (Unix/Linux/macOS) and Windows

## Simple Print Options

The `SimplePrintOptions` interface provides easy-to-use options for common printing scenarios:

```typescript
interface SimplePrintOptions {
  copies?: number; // Number of copies to print
  duplex?: boolean; // Print on both sides of paper
  paperSize?: MediaSize; // Paper size (Letter, A4, etc.)
  quality?: "draft" | "normal" | "high"; // Print quality
  color?: boolean; // Color or black and white
  pageRange?: string; // Page range (e.g., "1-5,8,10-12")
  jobName?: string; // Job name for identification
  pagesPerSheet?: NumberUp; // Pages per sheet (1, 2, 4, 6, 9, 16)
  landscape?: boolean; // Print in landscape orientation
}
```

### Basic Usage

```typescript
import { getPrinterByName } from "@printers/printers";

const printer = getPrinterByName("My Printer");

// Simple printing with common options
await printer.printFile("document.pdf", {
  simple: {
    copies: 3,
    duplex: true,
    paperSize: "Letter",
    quality: "high",
    color: false,
    jobName: "Monthly Report",
  },
});
```

## CUPS Options

The `CUPSOptions` interface provides comprehensive access to all CUPS printing options with full type safety:

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
  media?: string;
  "media-size"?: MediaSize;
  "media-type"?: MediaType;
  "media-source"?: MediaSource;

  // Page orientation and layout
  landscape?: boolean;
  "orientation-requested"?: OrientationRequested;

  // Duplex printing
  sides?: Sides;

  // Page selection and arrangement
  "page-ranges"?: string;
  "number-up"?: NumberUp;
  "number-up-layout"?: NumberUpLayout;
  "page-border"?: PageBorder;

  // Print quality and appearance
  "print-quality"?: PrintQuality;
  "print-color-mode"?: ColorMode;
  resolution?: string;

  // Output control
  "output-order"?: OutputOrder;
  outputbin?: string;

  // Image and document options
  "fit-to-page"?: boolean;
  mirror?: boolean;
  "natural-scaling"?: number;
  ppi?: number;
  scaling?: number;

  // Document format
  "document-format"?: DocumentFormat;

  // Finishing options
  finishings?: string;
  "finishings-col"?: string;

  // Color management
  "color-management"?: string;
  gamma?: number;
  brightness?: number;

  // Custom options (catch-all for printer-specific options)
  [key: string]: string | number | boolean | undefined;
}
```

### Advanced CUPS Usage

```typescript
import { getPrinterByName } from "@printers/printers";

const printer = getPrinterByName("My Printer");

// Advanced CUPS options
await printer.printFile("document.pdf", {
  cups: {
    "job-name": "Critical Document",
    "job-priority": 100,
    "job-hold-until": "day-time",
    copies: 2,
    collate: true,
    "media-size": "A4",
    "media-type": "stationery-letterhead",
    "media-source": "tray-1",
    sides: "two-sided-long-edge",
    "page-ranges": "1-10,15,20-25",
    "number-up": 2,
    "number-up-layout": "lrtb",
    "page-border": "single",
    "print-quality": 5,
    "print-color-mode": "color",
    resolution: "600dpi",
    "output-order": "reverse",
    "fit-to-page": true,
    scaling: 95,
    finishings: "staple-top-left",
  },
});
```

## Custom Page Sizes

Create custom page sizes for special media:

```typescript
import { createCustomPageSize } from "@printers/printers";

// Create custom page sizes
const photoSize = createCustomPageSize(4, 6, "in"); // "Custom.4x6in"
const labelSize = createCustomPageSize(89, 36, "mm"); // "Custom.89x36mm"
const posterSize = createCustomPageSize(24, 36, "in"); // "Custom.24x36in"

// Use in print options
await printer.printFile("photo.jpg", {
  cups: {
    media: photoSize,
    "media-type": "photo",
    "print-quality": 5,
  },
});
```

## Option Precedence and Merging

When multiple option types are specified, they are merged with this precedence (highest to lowest):

1. **Job name** (top-level `jobName`)
2. **CUPS options** (`cups` object)
3. **Simple options** (`simple` object, converted to CUPS)
4. **Raw options** (`raw` object)

```typescript
// Example of option precedence
await printer.printFile("document.pdf", {
  jobName: "Override Name", // Highest precedence
  cups: {
    copies: 3,
    "job-name": "CUPS Name", // Will be overridden by top-level jobName
  },
  simple: {
    copies: 2, // Will be overridden by CUPS copies
    quality: "high", // Will be used (no conflict)
  },
  raw: {
    "custom-option": "value", // Will be used (no conflict)
  },
});

// Resulting options:
// {
//   "job-name": "Override Name",    // From top-level jobName
//   "copies": "3",                  // From CUPS options
//   "print-quality": "5",           // From simple options (converted)
//   "custom-option": "value"        // From raw options
// }
```

## Type Definitions

### Media Types

```typescript
type MediaSize =
  | "Letter"
  | "Legal"
  | "A4"
  | "A3"
  | "A5"
  | "B4"
  | "B5"
  | "Executive"
  | "Tabloid"
  | string; // Allow custom sizes

type MediaType =
  | "auto"
  | "plain"
  | "bond"
  | "letterhead"
  | "transparency"
  | "envelope"
  | "labels"
  | string; // Allow custom types

type MediaSource =
  | "auto"
  | "main"
  | "alternate"
  | "manual"
  | "tray-1"
  | "tray-2"
  | "tray-3"
  | "tray-4"
  | string; // Allow custom sources
```

### Print Quality and Layout

```typescript
type PrintQuality = 3 | 4 | 5; // Draft, Normal, High

type NumberUp = 1 | 2 | 4 | 6 | 9 | 16;

type NumberUpLayout =
  | "lrtb"
  | "lrbt"
  | "rltb"
  | "rlbt"
  | "tblr"
  | "tbrl"
  | "btlr"
  | "btrl";

type Sides = "one-sided" | "two-sided-long-edge" | "two-sided-short-edge";

type ColorMode = "monochrome" | "color" | "auto";
```

## Real-World Examples

### Business Letter Printing

```typescript
// Professional business letter with letterhead
await printer.printFile("business-letter.pdf", {
  simple: {
    paperSize: "Letter",
    quality: "high",
    jobName: "Business Correspondence",
  },
  cups: {
    "media-type": "stationery-letterhead",
    "media-source": "tray-1",
    "print-color-mode": "monochrome",
  },
});
```

### Photo Printing

```typescript
// High-quality photo printing
await printer.printFile("vacation-photos.jpg", {
  cups: {
    "job-name": "Vacation Photos",
    "media-size": createCustomPageSize(4, 6, "in"),
    "media-type": "photo",
    "print-quality": 5,
    "print-color-mode": "color",
    resolution: "1200dpi",
    "color-management": "auto",
  },
});
```

### Booklet Printing

```typescript
// Create a booklet with duplex printing
await printer.printFile("manual.pdf", {
  cups: {
    "job-name": "User Manual",
    copies: 50,
    collate: true,
    sides: "two-sided-long-edge",
    "number-up": 2,
    "number-up-layout": "lrtb",
    "output-order": "normal",
    finishings: "staple-top-left",
  },
});
```

### Label Printing

```typescript
// Print address labels
await printer.printFile("addresses.pdf", {
  cups: {
    "job-name": "Address Labels",
    media: createCustomPageSize(89, 36, "mm"),
    "media-type": "labels",
    "media-source": "manual",
    "print-quality": 4,
    "fit-to-page": true,
  },
});
```

### Draft Printing

```typescript
// Fast, low-quality draft printing
await printer.printFile("draft-document.pdf", {
  simple: {
    copies: 1,
    quality: "draft",
    color: false,
    jobName: "Draft Review",
  },
  cups: {
    "output-order": "reverse", // Last page first for review
    "media-source": "alternate", // Use cheaper paper tray
  },
});
```

## Option Conversion Utilities

The library provides utilities to convert between option formats:

```typescript
import {
  simpleToCUPS,
  cupsToRaw,
  printJobOptionsToRaw,
} from "@printers/printers";

// Convert simple options to CUPS format
const cupsOptions = simpleToCUPS({
  copies: 2,
  duplex: true,
  quality: "high",
});
// Result: { copies: "2", sides: "two-sided-long-edge", "print-quality": "5" }

// Convert CUPS options to raw properties
const rawOptions = cupsToRaw({
  copies: 3,
  landscape: true,
  "print-quality": 5,
});
// Result: { copies: "3", landscape: "true", "print-quality": "5" }

// Convert complete PrintJobOptions to raw (with precedence)
const finalOptions = printJobOptionsToRaw({
  jobName: "My Job",
  simple: { copies: 2 },
  cups: { copies: 3 }, // This will override simple copies
  raw: { custom: "value" },
});
// Result: { "job-name": "My Job", copies: "3", custom: "value" }
```

## Platform-Specific Options

### Windows-Specific Options

```typescript
// Windows print spooler options
await printer.printFile("document.pdf", {
  raw: {
    orientation: "portrait",
    "paper-size": "letter",
    "print-processor": "winprint",
    priority: "normal",
  },
});
```

### macOS/Linux CUPS Options

```typescript
// CUPS-specific advanced options
await printer.printFile("document.pdf", {
  cups: {
    "printer-state-reasons": "none",
    "cups-browsed": "true",
    "device-uri": "ipp://printer.local/ipp/print",
    "marker-levels": "50,75,25,90", // Ink levels
  },
});
```

## Error Handling

Handle invalid options gracefully:

```typescript
try {
  await printer.printFile("document.pdf", {
    simple: {
      copies: -1, // Invalid
      quality: "ultra" as any, // Invalid
    },
  });
} catch (error) {
  if (error.message.includes("Invalid print options")) {
    console.log("Fix print options and try again");
  }
}
```

## Best Practices

1. **Start with simple options** for common use cases
2. **Use CUPS options** for advanced control
3. **Combine option types** for maximum flexibility
4. **Validate options** before printing in production
5. **Test with simulation mode** first
6. **Document custom options** for team members
7. **Use type safety** to avoid runtime errors

## Testing Options

Test different option combinations in simulation mode:

```typescript
// Set simulation mode
process.env.PRINTERS_JS_SIMULATE = "true";

const testOptions = [
  { simple: { copies: 1, quality: "draft" } },
  { simple: { copies: 2, duplex: true, quality: "high" } },
  { cups: { "number-up": 2, "page-border": "single" } },
  {
    simple: { quality: "high" },
    cups: { "print-color-mode": "color" },
    raw: { "custom-setting": "value" },
  },
];

for (const options of testOptions) {
  try {
    const jobId = await printer.printFile("test.pdf", options);
    console.log(`✓ Options valid, job ID: ${jobId}`);
  } catch (error) {
    console.log(`✗ Options invalid: ${error.message}`);
  }
}
```
