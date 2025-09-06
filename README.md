# deno-printers

A cross-platform Deno library that provides access to system printers through
FFI bindings to the Rust `printers` crate.

## Features

- Get all available printer names
- Check if a specific printer exists
- Find a printer by name
- **Print files to printers** with async job tracking
- Cross-platform support (Windows, macOS, Linux)

## ⚠️ Important Safety Notice

**This library can send real print jobs to your physical printers!**

- **Default mode**: When you run tests with `deno task test`, it uses
  **simulation mode** and won't actually print anything
- **Real printing**: Use `deno task test:real` if you want to test with actual
  printers
- **Environment variable**: Set `DENO_PRINTERS_SIMULATE=true` to force
  simulation mode in your own code

## Installation

Add this to your `deno.json` imports:

```json
{
  "imports": {
    "@esimkowitz/printers": "jsr:@esimkowitz/printers"
  }
}
```

## Usage

```typescript
import {
  getAllPrinterNames,
  getAllPrinters,
  getPrinterByName,
  Printer,
  printerExists,
} from "@esimkowitz/printers";

// Get all available printers as Printer objects
const printers = getAllPrinters();
console.log("Available printers:", printers.map((p) => p.toString()));

// Get all printer names as strings
const printerNames = getAllPrinterNames();
console.log("Printer names:", printerNames);

// Check if a specific printer exists
const exists = printerExists("Microsoft Print to PDF");
console.log("Printer exists:", exists);

// Get a printer by name (returns Printer object)
const printer = getPrinterByName("Microsoft Print to PDF");
if (printer) {
  console.log("Found printer:", printer.getName());
  console.log("Printer exists:", printer.exists());
  console.log("Printer string:", printer.toString());
} else {
  console.log("Printer not found");
}

// Working with Printer objects
if (printers.length > 0) {
  const firstPrinter = printers[0];
  console.log(`Printer name: ${firstPrinter.getName()}`);
  console.log(`Printer exists: ${firstPrinter.exists()}`);

  // Print a file
  try {
    await firstPrinter.printFile("document.pdf", {
      copies: "2",
      orientation: "portrait",
      quality: "high",
    });
    console.log("Print job submitted successfully");
  } catch (error) {
    console.error("Print job failed:", error.message);
  }
}
```

## Requirements

This library uses Deno's FFI (Foreign Function Interface) to call native Rust
code. You need to run your Deno script with the following flags:

```bash
deno run --allow-ffi --unstable-ffi your-script.ts
```

## Development

### Prerequisites

- [Rust](https://rustup.rs/) (for building the native library)
- [Deno](https://deno.com/) (for running TypeScript)

### Building

```bash
# Build the Rust library
deno task build

# Run the example
deno task dev

# Run tests
deno task test
```

### Project Structure

- `src/lib.rs` - Rust library implementing printer functionality
- `mod.ts` - TypeScript FFI bindings and main exports
- `types.d.ts` - TypeScript type definitions
- `mod.test.ts` - Tests for the functionality

## API Reference

### `Printer` Class

The main class representing a printer with various methods.

#### Constructor

- `new Printer(name: string)` - Creates a new Printer instance

#### Methods

- `getName(): string` - Returns the printer name
- `exists(): boolean` - Checks if the printer exists on the system
- `toString(): string` - Returns the printer name as a string
- `equals(other: Printer): boolean` - Checks if two printers are the same
- `toJSON(): { name: string }` - Returns a JSON representation of the printer
- `printFile(filePath: string, jobProperties?: Record<string, string>): Promise<void>` -
  Prints a file with optional job properties

### Functions

### `getAllPrinters(): Printer[]`

Returns an array of all available printers as Printer objects.

### `getAllPrinterNames(): string[]`

Returns an array of all available printer names as strings.

### `printerExists(name: string): boolean`

Checks if a printer with the given name exists on the system.

**Parameters:**

- `name` - The name of the printer to check

**Returns:** `true` if the printer exists, `false` otherwise

### `getPrinterByName(name: string): Printer | null`

Finds a printer by its exact name and returns a Printer object.

**Parameters:**

- `name` - The exact name of the printer to find

**Returns:** A `Printer` object if found, `null` if not found

### Error Codes

The `printFile` method may reject with errors containing the following messages:

- `"Invalid parameters"` - Null or invalid printer name/file path
- `"Invalid printer name encoding"` - Printer name contains invalid characters
- `"Invalid file path encoding"` - File path contains invalid characters
- `"Invalid job properties JSON"` - Job properties object is malformed
- `"Invalid job properties JSON encoding"` - Job properties contain invalid
  characters
- `"Printer not found"` - The specified printer doesn't exist on the system
- `"File not found"` - The specified file doesn't exist
- `"Unknown error (code: X)"` - Unexpected error with error code

### Job Properties

The `printFile` method accepts an optional `jobProperties` parameter with the
following common properties:

- `copies` - Number of copies to print (e.g., "1", "2", "5")
- `orientation` - Page orientation ("portrait" or "landscape")
- `quality` - Print quality ("draft", "normal", "high")
- `color` - Color mode ("color", "grayscale", "monochrome")
- `paperSize` - Paper size ("A4", "Letter", "Legal", etc.)
- `duplex` - Duplex printing ("none", "horizontal", "vertical")

Note: Actual supported properties depend on the printer capabilities and driver.

## License

This project is licensed under the MIT License - see the LICENSE file for
details.
