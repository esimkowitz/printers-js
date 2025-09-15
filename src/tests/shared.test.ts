/**
 * Shared cross-runtime test suite using @cross/test
 * Contains all core printer library tests that work across Deno, Bun, and Node.js
 * Can be run directly or imported by runtime-specific test files
 */

// Declare process as an ambient variable for runtime detection (may be undefined)
// deno-lint-ignore no-explicit-any no-var
declare var process: any;

import { test } from "@cross/test";

// Runtime detection and simulation mode setup - MUST happen before importing the module
let runtimeName: string;
// @ts-ignore - Deno may not be defined in Node.js or Bun
if (typeof Deno !== "undefined") {
  // @ts-ignore - Deno may not be defined in Node.js or Bun
  if (Deno.env.get("FORCE_NODE_RUNTIME") === "true") {
    runtimeName = "Node.js"; // Force Node.js testing when running in Deno with this env var
  } else {
    runtimeName = "Deno";
    // Ensure simulation mode is enabled for safe testing in Deno
    // @ts-ignore - Deno may not be defined in Node.js or Bun
    Deno.env.set("PRINTERS_JS_SIMULATE", "true");
  }
  // @ts-ignore - Bun provides Bun global
} else if (typeof Bun !== "undefined") {
  runtimeName = "Bun";
  // Ensure simulation mode is enabled for safe testing in Bun
  // @ts-ignore - Bun provides process global
  if (typeof process !== "undefined") process.env.PRINTERS_JS_SIMULATE = "true";
} else {
  // Node.js runtime
  runtimeName = "Node.js";
  // Ensure simulation mode is enabled for safe testing in Node.js
  // @ts-ignore - Node.js provides process global
  if (typeof process !== "undefined") process.env.PRINTERS_JS_SIMULATE = "true";
}

// Always use the universal entrypoint for consistency
// deno-lint-ignore no-explicit-any
let printerAPI: any;
try {
  printerAPI = await import("../index.ts");
  console.log("Debug: Successfully imported src/index.ts");
} catch (error) {
  console.error("Error importing src/index.ts:", error);
  throw error;
}

// Extract API functions
const {
  getAllPrinterNames,
  getAllPrinters,
  printerExists,
  getPrinterByName,
  PrinterConstructor,
  cleanupOldJobs,
  getJobStatus,
  shutdown,
  PrintError,
  isSimulationMode,
  runtimeInfo,
  simpleToCUPS,
  cupsToRaw,
  printJobOptionsToRaw,
  createCustomPageSize,
} = printerAPI;

console.log("Debug: Available API functions:", Object.keys(printerAPI));
console.log("Debug: isSimulationMode =", isSimulationMode);
console.log("Debug: typeof getAllPrinterNames =", typeof getAllPrinterNames);

// Core cross-runtime tests
test(`${runtimeName}: should return an array from getAllPrinterNames`, () => {
  const printerNames = getAllPrinterNames();
  if (!Array.isArray(printerNames)) {
    throw new Error("getAllPrinterNames should return an array");
  }

  // Debug: Print current state for troubleshooting
  console.log(
    `Debug: Runtime=${runtimeName}, isSimulationMode=${isSimulationMode}, printerNames.length=${printerNames.length}`
  );

  // @ts-ignore: process may not be defined in all runtimes
  console.log(
    `Debug: PRINTERS_JS_SIMULATE environment variable:`,
    // @ts-ignore - Deno may not be defined in Node.js or Bun
    typeof Deno !== "undefined"
      ? // @ts-ignore - Deno may not be defined in Node.js or Bun
        Deno.env.get("PRINTERS_JS_SIMULATE")
      : // @ts-ignore: process may not be defined in all runtimes
        typeof process !== "undefined"
        ? // @ts-ignore: process may not be defined in all runtimes
          process?.env?.PRINTERS_JS_SIMULATE
        : "unknown"
  );
  console.log(`Debug: Printer names received:`, JSON.stringify(printerNames));

  // In simulation mode, we should get at least some printers
  if (isSimulationMode && printerNames.length === 0) {
    console.error(
      "ERROR: No printers found in simulation mode. This indicates a library loading issue."
    );
    console.error(
      "Debug: getAllPrinterNames function type:",
      typeof getAllPrinterNames
    );
    console.error("Debug: getAllPrinterNames result:", getAllPrinterNames());

    // Try to get more information about what's loaded
    console.error("Debug: Available API:", Object.keys(printerAPI));
    console.error("Debug: Runtime info:", JSON.stringify(runtimeInfo));

    throw new Error("Should have at least 1 printer in simulation mode");
  }
});

test(`${runtimeName}: should return an array of Printer objects from getAllPrinters`, () => {
  const printers = getAllPrinters();
  if (!Array.isArray(printers)) {
    throw new Error("getAllPrinters should return an array");
  }

  for (const printer of printers) {
    if (!printer.name) {
      throw new Error("Each printer should have a name");
    }
    if (typeof printer.printFile !== "function") {
      throw new Error("Each printer should have a printFile method");
    }
    if (typeof printer.exists !== "function") {
      throw new Error("Each printer should have an exists method");
    }
  }
});

test(`${runtimeName}: should generate custom page sizes correctly`, () => {
  if (typeof createCustomPageSize !== "function") {
    throw new Error("createCustomPageSize function should be available");
  }

  // Test points (default unit)
  const pointsSize = createCustomPageSize(612, 792);
  if (pointsSize !== "Custom.612x792") {
    throw new Error(
      `Points size should be "Custom.612x792", got "${pointsSize}"`
    );
  }

  // Test inches
  const inchSize = createCustomPageSize(8.5, 11, "in");
  if (inchSize !== "Custom.8.5x11in") {
    throw new Error(`Inch size should be "Custom.8.5x11in", got "${inchSize}"`);
  }

  // Test centimeters
  const cmSize = createCustomPageSize(21, 29.7, "cm");
  if (cmSize !== "Custom.21x29.7cm") {
    throw new Error(`CM size should be "Custom.21x29.7cm", got "${cmSize}"`);
  }

  // Test millimeters
  const mmSize = createCustomPageSize(210, 297, "mm");
  if (mmSize !== "Custom.210x297mm") {
    throw new Error(`MM size should be "Custom.210x297mm", got "${mmSize}"`);
  }

  // Test error cases
  try {
    createCustomPageSize(0, 100, "in");
    throw new Error("Should have thrown error for zero width");
  } catch (error) {
    if (!error.message.includes("positive numbers")) {
      throw new Error("Should throw error about positive numbers");
    }
  }

  try {
    createCustomPageSize(100, -5, "cm");
    throw new Error("Should have thrown error for negative length");
  } catch (error) {
    if (!error.message.includes("positive numbers")) {
      throw new Error("Should throw error about positive numbers");
    }
  }

  try {
    // @ts-ignore - Testing invalid unit
    createCustomPageSize(100, 200, "invalid");
    throw new Error("Should have thrown error for invalid unit");
  } catch (error) {
    if (!error.message.includes("pt, in, cm, mm")) {
      throw new Error("Should throw error about valid units");
    }
  }
});

test(`${runtimeName}: should return typed printer instances from getAllPrinters`, () => {
  const printers = getAllPrinters();
  if (!Array.isArray(printers)) {
    throw new Error("getAllPrinters should return an array");
  }

  for (const printer of printers) {
    // Check that printer has the expected interface properties
    if (!printer.name || typeof printer.getName !== "function") {
      throw new Error(
        "Each printer should have the expected Printer interface"
      );
    }
  }
});

test(`${runtimeName}: should return false for non-existent printer in printerExists`, () => {
  const exists = printerExists("NonExistentPrinter12345");
  if (exists !== false) {
    throw new Error(
      "printerExists should return false for non-existent printer"
    );
  }
});

test(`${runtimeName}: should return null for non-existent printer in getPrinterByName`, () => {
  const printer = getPrinterByName("NonExistentPrinter12345");
  if (printer !== null) {
    throw new Error(
      "getPrinterByName should return null for non-existent printer"
    );
  }
});

test(`${runtimeName}: should have working Printer class methods`, () => {
  const printers = getAllPrinters();
  if (printers.length === 0) {
    return; // Skip if no printers available
  }

  const printer = printers[0];

  if (!printer.name) {
    throw new Error("Printer should have a name");
  }
  if (typeof printer.exists() !== "boolean") {
    throw new Error("exists() should return boolean");
  }
  if (typeof printer.toString() !== "string") {
    throw new Error("toString() should return string");
  }

  // Test comparison
  const samePrinter = PrinterConstructor.fromName(printer.name);
  if (samePrinter && !printer.equals(samePrinter)) {
    throw new Error("Printer should equal another instance with same name");
  }
});

test(`${runtimeName}: should handle printFile operations`, async () => {
  const printers = getAllPrinters();
  if (printers.length === 0) {
    return; // Skip if no printers
  }

  const printer = printers[0];
  const nonExistentFile = "/path/that/does/not/exist/file.pdf";

  // In simulation mode, this might not throw as expected
  try {
    await printer.printFile(nonExistentFile);
    // If it doesn't throw, that's fine in simulation mode
  } catch (error) {
    // If it throws, verify it's a reasonable error
    if (!error || typeof (error as Error).message !== "string") {
      throw new Error("Should throw proper error for non-existent file");
    }
  }
});

test(`${runtimeName}: should return null for invalid job ID in getJobStatus`, () => {
  const status = getJobStatus(99999999);
  if (status !== null) {
    throw new Error("getJobStatus should return null for invalid job ID");
  }
});

test(`${runtimeName}: should return number from cleanupOldJobs`, () => {
  const cleaned = cleanupOldJobs(3600); // 1 hour
  if (typeof cleaned !== "number") {
    throw new Error("cleanupOldJobs should return a number");
  }
  if (cleaned < 0) {
    throw new Error("cleanupOldJobs should return non-negative number");
  }
});

test(`${runtimeName}: should have shutdown function available`, () => {
  if (typeof shutdown !== "function") {
    throw new Error("shutdown should be a function");
  }
  // Note: We don't actually call shutdown in tests as it would terminate the library
});

test(`${runtimeName}: should have PrintError enum available`, () => {
  if (typeof PrintError !== "object") {
    throw new Error("PrintError should be an enum object");
  }
  if (!PrintError.InvalidParams) {
    throw new Error("PrintError should have InvalidParams");
  }
  if (!PrintError.InvalidPrinterName) {
    throw new Error("PrintError should have InvalidPrinterName");
  }
  if (!PrintError.InvalidFilePath) {
    throw new Error("PrintError should have InvalidFilePath");
  }
});

test(`${runtimeName}: should reflect environment in isSimulationMode`, () => {
  if (typeof isSimulationMode !== "boolean") {
    throw new Error("isSimulationMode should be boolean");
  }

  // Check if PRINTERS_JS_SIMULATE environment variable matches
  let envSimulate = false;
  // @ts-ignore - Deno may not be defined in Node.js or Bun
  if (typeof Deno !== "undefined") {
    // @ts-ignore - Deno may not be defined in Node.js or Bun
    envSimulate = Deno.env.get("PRINTERS_JS_SIMULATE") === "true";
  } else {
    // @ts-ignore - process may not be defined in all runtimes
    envSimulate =
      typeof process !== "undefined" &&
      process.env.PRINTERS_JS_SIMULATE === "true";
  }

  if (envSimulate && !isSimulationMode) {
    throw new Error(
      "isSimulationMode should be true when PRINTERS_JS_SIMULATE=true"
    );
  }
});

test(`${runtimeName}: should have consistent API across getAllPrinterNames and getAllPrinters`, () => {
  const printerNames = getAllPrinterNames();
  const printers = getAllPrinters();

  if (printerNames.length !== printers.length) {
    throw new Error(
      "getAllPrinterNames and getAllPrinters should return same count"
    );
  }

  // Test printer existence
  if (printerNames.length > 0) {
    const firstPrinterName = printerNames[0];
    if (!printerExists(firstPrinterName)) {
      throw new Error("First printer from list should exist");
    }

    const printer = getPrinterByName(firstPrinterName);
    if (!printer || printer.name !== firstPrinterName) {
      throw new Error("getPrinterByName should return correct printer");
    }
  }
});

test(`${runtimeName}: should have runtimeInfo with name and version`, () => {
  console.log("Debug: runtimeInfo =", JSON.stringify(runtimeInfo));

  if (!runtimeInfo.name) {
    throw new Error("Runtime name should be available");
  }
  if (!runtimeInfo.version) {
    throw new Error("Runtime version should be available");
  }

  const expectedRuntimes = ["Deno", "Bun", "Node.js", "deno", "bun", "node"];
  if (!expectedRuntimes.includes(runtimeInfo.name)) {
    throw new Error(
      `Runtime should be one of ${expectedRuntimes.join(
        ", "
      )}, got ${runtimeInfo.name}`
    );
  }
});

test(`${runtimeName}: simulated printer should have correct field values`, () => {
  // This test only runs in simulation mode
  if (!isSimulationMode) {
    console.log("Skipping simulated printer test - not in simulation mode");
    return;
  }

  const printers = getAllPrinters();
  if (printers.length === 0) {
    throw new Error("Should have at least one simulated printer");
  }

  const simulatedPrinter = printers.find(p => p.name === "Simulated Printer");
  if (!simulatedPrinter) {
    throw new Error("Should have a printer named 'Simulated Printer'");
  }

  // Test expected field values for simulated printer
  if (simulatedPrinter.state !== "idle") {
    throw new Error(
      `Simulated printer state should be 'idle', got '${simulatedPrinter.state}'`
    );
  }

  if (simulatedPrinter.isDefault !== true) {
    throw new Error("Simulated printer should be marked as default");
  }

  if (simulatedPrinter.isShared !== false) {
    throw new Error("Simulated printer should not be shared");
  }

  // Check that other fields exist and have reasonable values
  if (
    typeof simulatedPrinter.systemName !== "string" ||
    !simulatedPrinter.systemName
  ) {
    throw new Error("Simulated printer should have a system name");
  }

  if (
    typeof simulatedPrinter.driverName !== "string" ||
    !simulatedPrinter.driverName
  ) {
    throw new Error("Simulated printer should have a driver name");
  }

  console.log("Simulated printer fields validated successfully:");
  console.log(`  - name: ${simulatedPrinter.name}`);
  console.log(`  - state: ${simulatedPrinter.state}`);
  console.log(`  - isDefault: ${simulatedPrinter.isDefault}`);
  console.log(`  - isShared: ${simulatedPrinter.isShared}`);
  console.log(`  - systemName: ${simulatedPrinter.systemName}`);
  console.log(`  - driverName: ${simulatedPrinter.driverName}`);
});

// CUPS Options Conversion Tests
test(`${runtimeName}: should convert SimplePrintOptions to CUPS correctly`, () => {
  if (typeof simpleToCUPS !== "function") {
    throw new Error("simpleToCUPS function should be available");
  }

  const simpleOptions = {
    copies: 3,
    duplex: true,
    paperSize: "A4" as const,
    quality: "high" as const,
    color: false,
    pageRange: "1-5,8",
    jobName: "Test Job",
    pagesPerSheet: 2 as const,
    landscape: true,
  };

  const result = simpleToCUPS(simpleOptions);

  // Verify all conversions
  if (result.copies !== "3") throw new Error("copies conversion failed");
  if (result.sides !== "two-sided-long-edge")
    throw new Error("duplex conversion failed");
  if (result["media-size"] !== "A4")
    throw new Error("paperSize conversion failed");
  if (result["print-quality"] !== "5")
    throw new Error("quality conversion failed");
  if (result["print-color-mode"] !== "monochrome")
    throw new Error("color conversion failed");
  if (result["page-ranges"] !== "1-5,8")
    throw new Error("pageRange conversion failed");
  if (result["job-name"] !== "Test Job")
    throw new Error("jobName conversion failed");
  if (result["number-up"] !== "2")
    throw new Error("pagesPerSheet conversion failed");
  if (result.landscape !== "true")
    throw new Error("landscape conversion failed");
});

test(`${runtimeName}: should convert CUPSOptions to raw properties correctly`, () => {
  if (typeof cupsToRaw !== "function") {
    throw new Error("cupsToRaw function should be available");
  }

  const cupsOptions = {
    "job-name": "CUPS Test",
    "job-priority": 50,
    copies: 2,
    collate: true,
    "media-size": "Letter",
    "print-quality": 4,
    "fit-to-page": false,
    "custom-option": "test-value",
  };

  const result = cupsToRaw(cupsOptions);

  // Verify type conversions
  if (result["job-name"] !== "CUPS Test")
    throw new Error("string conversion failed");
  if (result["job-priority"] !== "50")
    throw new Error("number conversion failed");
  if (result.copies !== "2") throw new Error("number to string failed");
  if (result.collate !== "true")
    throw new Error("boolean true conversion failed");
  if (result["fit-to-page"] !== "false")
    throw new Error("boolean false conversion failed");
  if (result["custom-option"] !== "test-value")
    throw new Error("custom option failed");
});

test(`${runtimeName}: should convert PrintJobOptions with precedence correctly`, () => {
  if (typeof printJobOptionsToRaw !== "function") {
    throw new Error("printJobOptionsToRaw function should be available");
  }

  const options = {
    jobName: "Top Level Job",
    raw: {
      "custom-raw": "raw-value",
      copies: "1", // This should be overridden
    },
    simple: {
      copies: 2, // This should override raw
      quality: "normal" as const,
    },
    cups: {
      "job-priority": 75,
      "job-name": "CUPS Job Name", // This should override others
    },
  };

  const result = printJobOptionsToRaw(options);

  // Test precedence: raw < simple < cups < jobName
  if (result["custom-raw"] !== "raw-value")
    throw new Error("raw option not preserved");
  if (result.copies !== "2")
    throw new Error("simple should override raw copies");
  if (result["print-quality"] !== "4")
    throw new Error("simple quality conversion failed");
  if (result["job-priority"] !== "75") throw new Error("cups option not added");
  if (result["job-name"] !== "Top Level Job")
    throw new Error("top-level jobName should override all");
});

test(`${runtimeName}: should handle empty and undefined options correctly`, () => {
  if (typeof printJobOptionsToRaw !== "function") {
    throw new Error("printJobOptionsToRaw function should be available");
  }

  // Test undefined
  const undefinedResult = printJobOptionsToRaw(undefined);
  if (Object.keys(undefinedResult).length !== 0) {
    throw new Error("undefined options should return empty object");
  }

  // Test empty object
  const emptyResult = printJobOptionsToRaw({});
  if (Object.keys(emptyResult).length !== 0) {
    throw new Error("empty options should return empty object");
  }

  // Test partial options
  const partialResult = printJobOptionsToRaw({ jobName: "Only Job Name" });
  if (partialResult["job-name"] !== "Only Job Name") {
    throw new Error("partial options should work");
  }
  if (Object.keys(partialResult).length !== 1) {
    throw new Error("partial options should only have specified keys");
  }
});

test(`${runtimeName}: should handle edge cases in SimplePrintOptions conversion`, () => {
  if (typeof simpleToCUPS !== "function") {
    throw new Error("simpleToCUPS function should be available");
  }

  // Test with minimal options
  const minimal = { copies: 1 };
  const minimalResult = simpleToCUPS(minimal);
  if (minimalResult.copies !== "1") throw new Error("minimal options failed");
  if (Object.keys(minimalResult).length !== 1)
    throw new Error("minimal should only have copies");

  // Test with duplex false
  const noDuplex = { duplex: false };
  const noDuplexResult = simpleToCUPS(noDuplex);
  if (noDuplexResult.sides !== "one-sided")
    throw new Error("duplex false conversion failed");

  // Test quality mappings
  const qualityTests = [
    { quality: "draft" as const, expected: "3" },
    { quality: "normal" as const, expected: "4" },
    { quality: "high" as const, expected: "5" },
  ];

  for (const test of qualityTests) {
    const result = simpleToCUPS({ quality: test.quality });
    if (result["print-quality"] !== test.expected) {
      throw new Error(`quality ${test.quality} should map to ${test.expected}`);
    }
  }
});
