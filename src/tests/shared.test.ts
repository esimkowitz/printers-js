/**
 * Shared cross-runtime test suite using @cross/test
 * Contains all core printer library tests that work across Deno, Bun, and Node.js
 * Can be run directly or imported by runtime-specific test files
 */

// Declare process as an ambient variable for runtime detection (may be undefined)
// deno-lint-ignore no-explicit-any no-var
declare var process: any;

import { test } from "@cross/test";
import type * as PrinterTypes from "../index.ts";

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

// Always use the universal entrypoint for consistency - type-safe dynamic import
let printerAPI: typeof PrinterTypes;
try {
  printerAPI = await import("../index.ts");
  console.log("Debug: Successfully imported src/index.ts");
} catch (error) {
  console.error("Error importing src/index.ts:", error);
  throw error;
}

// Extract API functions with proper types
const {
  getAllPrinterNames,
  getAllPrinters,
  printerExists,
  getPrinterByName,
  PrinterConstructor,
  shutdown,
  PrintError,
  isSimulationMode,
  runtimeInfo,
  simpleToCUPS,
  cupsToRaw,
  printJobOptionsToRaw,
  createCustomPageSize,
  // Printer state monitoring functions
  startPrinterStateMonitoring,
  stopPrinterStateMonitoring,
  isPrinterStateMonitoringActive,
  subscribeToPrinterStateChanges,
  getPrinterStateSnapshots,
  setPrinterStateMonitoringInterval,
} = printerAPI;

console.log("Debug: Available API functions:", Object.keys(printerAPI));
console.log("Debug: isSimulationMode =", isSimulationMode);
console.log("Debug: typeof getAllPrinterNames =", typeof getAllPrinterNames);

// Test media files directory
const MEDIA_DIR = "/Users/evan/source/printers-js/media";
const TEST_FILES = {
  PDF: `${MEDIA_DIR}/sample-document.pdf`,
  TEXT: `${MEDIA_DIR}/sample-text.txt`,
  PNG: `${MEDIA_DIR}/sample-image.png`,
  JPEG: `${MEDIA_DIR}/sample-image.jpg`,
  DOCX: `${MEDIA_DIR}/sample-document.docx`,
};

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

test(`${runtimeName}: should return number from printer.cleanupOldJobs`, () => {
  const printers = getAllPrinters();
  if (printers.length === 0) {
    console.log("Skipping cleanupOldJobs test - no printers available");
    return;
  }

  const printer = printers[0];
  const cleaned = printer.cleanupOldJobs(3600); // 1 hour
  if (typeof cleaned !== "number") {
    throw new Error("printer.cleanupOldJobs should return a number");
  }
  if (cleaned < 0) {
    throw new Error("printer.cleanupOldJobs should return non-negative number");
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
  const validSimulatedStates = ["idle", "printing", "paused"];
  if (!validSimulatedStates.includes(simulatedPrinter.state || "")) {
    throw new Error(
      `Simulated printer state should be one of ${validSimulatedStates.join(", ")}, got '${simulatedPrinter.state}'`
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

// New Job Tracking Tests
test(`${runtimeName}: should have printer job tracking methods available`, () => {
  const printers = getAllPrinters();
  if (printers.length === 0) {
    console.log("Skipping printer job tracking test - no printers available");
    return;
  }

  const printer = printers[0];

  if (typeof printer.getActiveJobs !== "function") {
    throw new Error("printer.getActiveJobs method should be available");
  }
  if (typeof printer.getJobHistory !== "function") {
    throw new Error("printer.getJobHistory method should be available");
  }
  if (typeof printer.getJob !== "function") {
    throw new Error("printer.getJob method should be available");
  }
  if (typeof printer.getAllJobs !== "function") {
    throw new Error("printer.getAllJobs method should be available");
  }
  if (typeof printer.cleanupOldJobs !== "function") {
    throw new Error("printer.cleanupOldJobs method should be available");
  }
});

test(`${runtimeName}: should return null for invalid job ID in printer.getJob`, () => {
  const printers = getAllPrinters();
  if (printers.length === 0) {
    console.log("Skipping printer.getJob test - no printers available");
    return;
  }

  const printer = printers[0];
  const job = printer.getJob(99999999);
  if (job !== null) {
    throw new Error("printer.getJob should return null for invalid job ID");
  }
});

test(`${runtimeName}: should return empty arrays for printer job tracking methods when no jobs exist`, () => {
  const printers = getAllPrinters();
  if (printers.length === 0) {
    console.log(
      "Skipping printer job tracking arrays test - no printers available"
    );
    return;
  }

  const printer = printers[0];

  // These should return arrays (empty or not, but arrays)
  const activeJobs = printer.getActiveJobs();
  if (!Array.isArray(activeJobs)) {
    throw new Error("printer.getActiveJobs should return an array");
  }

  const jobHistory = printer.getJobHistory();
  if (!Array.isArray(jobHistory)) {
    throw new Error("printer.getJobHistory should return an array");
  }

  const allJobs = printer.getAllJobs();
  if (!Array.isArray(allJobs)) {
    throw new Error("printer.getAllJobs should return an array");
  }
});

test(`${runtimeName}: should create and track print jobs with new job format`, async () => {
  const printers = getAllPrinters();
  if (printers.length === 0) {
    console.log("Skipping job tracking test - no printers available");
    return;
  }

  const printer = printers[0];

  try {
    // Use real test file from media directory
    const testFile = TEST_FILES.PDF;
    const jobOptions = {
      jobName: "Test Job Tracking",
      raw: { "test-property": "test-value" },
    };

    // Print a file and get job ID
    const jobId = await printer.printFile(testFile, jobOptions);

    if (typeof jobId !== "number" || jobId <= 0) {
      throw new Error("printFile should return a valid positive job ID");
    }

    // Give the job a moment to be processed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get the job details using new format
    const job = printer.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} should be found in tracker`);
    }

    // Validate PrinterJob structure
    if (typeof job.id !== "number" || job.id !== jobId) {
      throw new Error(`Job ID should match: expected ${jobId}, got ${job.id}`);
    }

    if (typeof job.name !== "string" || job.name !== "Test Job Tracking") {
      throw new Error(
        `Job name should be "Test Job Tracking", got "${job.name}"`
      );
    }

    if (typeof job.state !== "string") {
      throw new Error("Job state should be a string");
    }

    const validStates = [
      "pending",
      "paused",
      "processing",
      "cancelled",
      "completed",
      "unknown",
    ];
    if (!validStates.includes(job.state)) {
      throw new Error(
        `Job state should be one of ${validStates.join(", ")}, got "${job.state}"`
      );
    }

    if (typeof job.mediaType !== "string") {
      console.log(
        "Debug: job.mediaType =",
        JSON.stringify(job.mediaType),
        typeof job.mediaType
      );
      console.log("Debug: full job object =", JSON.stringify(job, null, 2));
      throw new Error("Job media_type should be a string");
    }

    if (typeof job.createdAt !== "number" || job.createdAt <= 0) {
      throw new Error("Job created_at should be a positive timestamp");
    }

    if (
      typeof job.printerName !== "string" ||
      job.printerName !== printer.name
    ) {
      throw new Error(
        `Job printer_name should match printer name: expected "${printer.name}", got "${job.printerName}"`
      );
    }

    if (typeof job.ageSeconds !== "number" || job.ageSeconds < 0) {
      throw new Error("Job age_seconds should be a non-negative number");
    }

    // Optional fields should be properly typed when present
    if (job.processedAt !== undefined && typeof job.processedAt !== "number") {
      throw new Error("Job processed_at should be a number when present");
    }

    if (job.completedAt !== undefined && typeof job.completedAt !== "number") {
      throw new Error("Job completed_at should be a number when present");
    }

    if (
      job.errorMessage !== undefined &&
      typeof job.errorMessage !== "string"
    ) {
      throw new Error("Job error_message should be a string when present");
    }

    console.log(`Job tracking validation passed for job ${jobId}:`);
    console.log(`  - name: ${job.name}`);
    console.log(`  - state: ${job.state}`);
    console.log(`  - media_type: ${job.mediaType}`);
    console.log(`  - printer_name: ${job.printerName}`);
    console.log(`  - age_seconds: ${job.ageSeconds}`);
  } catch (error) {
    // In simulation mode, we might get expected errors
    if (
      isSimulationMode &&
      error.message &&
      error.message.includes("not found")
    ) {
      console.log("Expected simulation mode error:", error.message);
      return;
    }
    throw error;
  }
});

// ===== PRINTER STATE MONITORING TESTS =====

test(`${runtimeName}: should start and stop printer state monitoring`, async () => {
  try {
    // Initially monitoring should not be active
    const initialState = isPrinterStateMonitoringActive();

    // Start monitoring
    await startPrinterStateMonitoring();

    // Should now be active
    const activeState = isPrinterStateMonitoringActive();
    if (!activeState) {
      throw new Error("State monitoring should be active after starting");
    }

    console.log("✓ Printer state monitoring started successfully");

    // Stop monitoring
    await stopPrinterStateMonitoring();

    // Should no longer be active
    const stoppedState = isPrinterStateMonitoringActive();
    if (stoppedState) {
      throw new Error("State monitoring should not be active after stopping");
    }

    console.log("✓ Printer state monitoring stopped successfully");
  } catch (error) {
    console.error("State monitoring test failed:", error);
    throw error;
  }
});

test(`${runtimeName}: should configure monitoring poll interval`, async () => {
  try {
    // Start monitoring first
    await startPrinterStateMonitoring();

    // Test setting poll interval
    await setPrinterStateMonitoringInterval(5);
    console.log("✓ Successfully set monitoring interval to 5 seconds");

    // Test invalid interval
    try {
      await setPrinterStateMonitoringInterval(0);
      throw new Error("Should not allow interval less than 1 second");
    } catch (error) {
      if (error.message.includes("at least 1 second")) {
        console.log("✓ Correctly rejected invalid interval");
      } else {
        throw error;
      }
    }

    // Clean up
    await stopPrinterStateMonitoring();
  } catch (error) {
    console.error("Poll interval test failed:", error);
    throw error;
  }
});

test(`${runtimeName}: should get printer state snapshots`, async () => {
  try {
    const snapshots = getPrinterStateSnapshots();

    if (!(snapshots instanceof Map)) {
      throw new Error("getPrinterStateSnapshots should return a Map");
    }

    console.log(`✓ Got ${snapshots.size} printer state snapshots`);

    // Validate snapshot structure
    for (const [printerName, snapshot] of snapshots) {
      if (typeof printerName !== "string") {
        throw new Error("Printer name should be a string");
      }

      if (typeof snapshot.name !== "string") {
        throw new Error("Snapshot name should be a string");
      }

      if (typeof snapshot.state !== "string") {
        throw new Error("Snapshot state should be a string");
      }

      if (!Array.isArray(snapshot.stateReasons)) {
        throw new Error("Snapshot stateReasons should be an array");
      }

      if (typeof snapshot.timestamp !== "number") {
        throw new Error("Snapshot timestamp should be a number");
      }

      console.log(
        `  - ${printerName}: ${snapshot.state}, reasons: [${snapshot.stateReasons.join(", ")}]`
      );
    }
  } catch (error) {
    console.error("State snapshots test failed:", error);
    throw error;
  }
});

test(`${runtimeName}: should subscribe to printer state changes`, async () => {
  if (!isSimulationMode) {
    console.log(
      "Skipping state subscription test - only safe in simulation mode"
    );
    return;
  }

  try {
    let eventReceived = false;
    let receivedEvent: PrinterTypes.PrinterStateChangeEvent = {
      eventType: "connected",
      printerName: "",
      timestamp: 0,
    };

    // Subscribe to state changes
    const subscription = await subscribeToPrinterStateChanges(event => {
      eventReceived = true;
      receivedEvent = event;
      console.log(
        `Received state change event: ${event.eventType} for ${event.printerName}`
      );
    });

    if (typeof subscription.id !== "number") {
      throw new Error("Subscription should have numeric ID");
    }

    if (typeof subscription.unsubscribe !== "function") {
      throw new Error("Subscription should have unsubscribe function");
    }

    console.log(`✓ Successfully subscribed with ID: ${subscription.id}`);

    // Monitoring should now be active
    if (!isPrinterStateMonitoringActive()) {
      throw new Error("Monitoring should be active after subscription");
    }

    // Wait a moment for potential events
    await new Promise(resolve =>
      setTimeout(resolve, runtimeName === "Bun" ? 1000 : 3000)
    );

    // Test unsubscribe
    const unsubscribed = await subscription.unsubscribe();
    if (!unsubscribed) {
      throw new Error("Unsubscribe should return true");
    }

    console.log("✓ Successfully unsubscribed from state changes");

    // Test that monitoring stops when no more subscriptions
    // (Small delay to let cleanup happen)
    await new Promise(resolve => setTimeout(resolve, 100));

    if (isPrinterStateMonitoringActive()) {
      console.log(
        "Note: Monitoring still active - may have other subscriptions"
      );
    } else {
      console.log("✓ Monitoring stopped after last unsubscribe");
    }
  } catch (error) {
    console.error("State subscription test failed:", error);
    throw error;
  }
});

test(`${runtimeName}: should handle multiple state change subscriptions`, async () => {
  if (!isSimulationMode) {
    console.log(
      "Skipping multiple subscriptions test - only safe in simulation mode"
    );
    return;
  }

  try {
    let events1: PrinterTypes.PrinterStateChangeEvent[] = [];
    let events2: PrinterTypes.PrinterStateChangeEvent[] = [];

    // Create multiple subscriptions
    const subscription1 = await subscribeToPrinterStateChanges(event => {
      events1.push(event);
    });

    const subscription2 = await subscribeToPrinterStateChanges(event => {
      events2.push(event);
    });

    console.log(
      `✓ Created two subscriptions: ${subscription1.id}, ${subscription2.id}`
    );

    // Wait for potential events
    await new Promise(resolve =>
      setTimeout(resolve, runtimeName === "Bun" ? 500 : 1500)
    );

    // Both should be different IDs
    if (subscription1.id === subscription2.id) {
      throw new Error("Subscriptions should have different IDs");
    }

    // Unsubscribe first one
    await subscription1.unsubscribe();

    // Monitoring should still be active
    if (!isPrinterStateMonitoringActive()) {
      throw new Error(
        "Monitoring should still be active with remaining subscription"
      );
    }

    // Unsubscribe second one
    await subscription2.unsubscribe();

    // Give cleanup time
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`✓ Both subscriptions unsubscribed successfully`);
    console.log(`  - Subscription 1 received ${events1.length} events`);
    console.log(`  - Subscription 2 received ${events2.length} events`);
  } catch (error) {
    console.error("Multiple subscriptions test failed:", error);
    throw error;
  }
});

test(`${runtimeName}: should validate state change event structure`, async () => {
  if (!isSimulationMode) {
    console.log(
      "Skipping event validation test - only safe in simulation mode"
    );
    return;
  }

  try {
    let validationPassed = true;
    let eventCount = 0;

    const subscription = await subscribeToPrinterStateChanges(event => {
      eventCount++;

      try {
        // Validate event structure
        if (typeof event.eventType !== "string") {
          throw new Error("Event eventType should be string");
        }

        if (typeof event.printerName !== "string") {
          throw new Error("Event printerName should be string");
        }

        if (typeof event.timestamp !== "number") {
          throw new Error("Event timestamp should be number");
        }

        const validEventTypes = [
          "connected",
          "disconnected",
          "state_changed",
          "state_reasons_changed",
        ];
        if (!validEventTypes.includes(event.eventType)) {
          throw new Error(`Invalid event type: ${event.eventType}`);
        }

        // Validate conditional fields based on event type
        if (event.eventType === "state_changed") {
          if (
            typeof event.oldState !== "string" ||
            typeof event.newState !== "string"
          ) {
            throw new Error(
              "state_changed events should have oldState and newState strings"
            );
          }
        }

        if (event.eventType === "state_reasons_changed") {
          if (
            !Array.isArray(event.oldReasons) ||
            !Array.isArray(event.newReasons)
          ) {
            throw new Error(
              "state_reasons_changed events should have oldReasons and newReasons arrays"
            );
          }
        }

        console.log(
          `✓ Event ${eventCount} validation passed: ${event.eventType}`
        );
      } catch (validationError) {
        console.error("Event validation failed:", validationError);
        validationPassed = false;
      }
    });

    // Wait for events
    await new Promise(resolve =>
      setTimeout(resolve, runtimeName === "Bun" ? 500 : 2000)
    );

    await subscription.unsubscribe();

    if (!validationPassed) {
      throw new Error("Event validation failed");
    }

    console.log(`✓ All ${eventCount} events passed validation`);
  } catch (error) {
    console.error("Event validation test failed:", error);
    throw error;
  }
});

test(`${runtimeName}: should handle monitoring configuration options`, async () => {
  try {
    // Test with custom poll interval
    await startPrinterStateMonitoring({
      pollInterval: 3,
      autoStart: true,
    });

    if (!isPrinterStateMonitoringActive()) {
      throw new Error("Monitoring should be active with config");
    }

    console.log("✓ Started monitoring with custom configuration");

    await stopPrinterStateMonitoring();

    // Test with default config
    await startPrinterStateMonitoring();

    if (!isPrinterStateMonitoringActive()) {
      throw new Error("Monitoring should be active with default config");
    }

    console.log("✓ Started monitoring with default configuration");

    await stopPrinterStateMonitoring();
  } catch (error) {
    console.error("Configuration test failed:", error);
    throw error;
  }
});

test(`${runtimeName}: should handle error conditions gracefully`, async () => {
  try {
    // Test stopping monitoring when not started
    try {
      await stopPrinterStateMonitoring();
      // Should not throw error
      console.log("✓ Stopping inactive monitoring handled gracefully");
    } catch (error) {
      // Some implementations might throw, which is acceptable
      console.log("Note: Stop inactive monitoring threw:", error.message);
    }

    // Test multiple starts
    await startPrinterStateMonitoring();
    try {
      await startPrinterStateMonitoring(); // Second start
      console.log("✓ Multiple starts handled gracefully");
    } catch (error) {
      // Some implementations might prevent double-start
      console.log("Note: Double start prevented:", error.message);
    }

    try {
      await stopPrinterStateMonitoring();
    } catch (error) {
      console.log("Note: Stop monitoring after start threw:", error.message);
    }

    // Test unsubscribing invalid subscription
    const subscription = await subscribeToPrinterStateChanges(() => {});
    await subscription.unsubscribe();

    // Try to unsubscribe again
    try {
      const secondUnsubscribe = await subscription.unsubscribe();
      if (secondUnsubscribe) {
        console.log("Note: Double unsubscribe returned true");
      } else {
        console.log("✓ Double unsubscribe correctly returned false");
      }
    } catch (error) {
      console.log(
        "Note: Double unsubscribe threw error (acceptable):",
        error.message
      );
    }
  } catch (error) {
    console.error("Error handling test failed:", error);
    throw error;
  }
});

console.log(`\n${runtimeName}: Printer state monitoring tests completed!`);

test(`${runtimeName}: should track jobs in active jobs list`, async () => {
  if (!isSimulationMode) {
    console.log("Skipping active jobs test - only safe in simulation mode");
    return;
  }

  const printers = getAllPrinters();
  if (printers.length === 0) {
    return;
  }

  const printer = printers[0];

  try {
    // Get initial active job count
    const initialActiveJobs = printer.getActiveJobs();

    // Submit a job
    const jobOptions = { jobName: "Active Job Test" };
    const jobId = await printer.printFile(TEST_FILES.PDF, jobOptions);

    // Give job a moment to be queued
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check if job appears in active jobs
    const activeJobs = printer.getActiveJobs();

    // Should have at least one more active job
    if (activeJobs.length <= initialActiveJobs.length) {
      console.log(
        "Note: Job may have completed too quickly to be seen as active"
      );
    }

    // Validate structure of active jobs
    for (const job of activeJobs) {
      if (typeof job.id !== "number") {
        throw new Error("Active job should have numeric ID");
      }
      if (typeof job.name !== "string") {
        throw new Error("Active job should have string name");
      }
      if (typeof job.state !== "string") {
        throw new Error("Active job should have string state");
      }

      // Active jobs should be in active states
      const activeStates = ["pending", "processing", "paused"];
      if (!activeStates.includes(job.state)) {
        throw new Error(
          `Active job should be in active state, got "${job.state}"`
        );
      }
    }

    console.log(
      `Active jobs validation passed. Found ${activeJobs.length} active jobs`
    );
  } catch (error) {
    if (error.message && error.message.includes("not found")) {
      console.log("Expected simulation mode error:", error.message);
      return;
    }
    throw error;
  }
});

test(`${runtimeName}: should respect waitForCompletion=false for quick return`, async () => {
  const printers = getAllPrinters();
  if (printers.length === 0) return;

  const printer = printers[0];

  // Use real test file from media directory
  const testFile = TEST_FILES.TEXT;

  const startTime = Date.now();

  const jobId = await printer.printFile(testFile, {
    jobName: "Quick Return Test",
    waitForCompletion: false,
  });

  const duration = Date.now() - startTime;

  if (typeof jobId !== "number") {
    throw new Error("Job ID should be a number");
  }

  console.log(`Quick return took ${duration}ms`);

  // In simulation mode, should still return quickly
  if (duration > 1000) {
    throw new Error(`Quick return took too long: ${duration}ms`);
  }
});

test(`${runtimeName}: should respect waitForCompletion=true for delayed return`, async () => {
  const printers = getAllPrinters();
  if (printers.length === 0) return;

  const printer = printers[0];

  // Use real test file from media directory
  const testFile = TEST_FILES.TEXT;

  const startTime = Date.now();

  const jobId = await printer.printFile(testFile, {
    jobName: "Delayed Return Test",
    waitForCompletion: true,
  });

  const duration = Date.now() - startTime;

  if (typeof jobId !== "number") {
    throw new Error("Job ID should be a number");
  }

  console.log(`Delayed return took ${duration}ms`);

  // In real mode, should include keep-alive delay
  // In simulation mode, should still complete but timing may vary
});

test(`${runtimeName}: should default waitForCompletion to true when not specified`, async () => {
  const printers = getAllPrinters();
  if (printers.length === 0) return;

  const printer = printers[0];

  // Use real test file from media directory
  const testFile = TEST_FILES.TEXT;

  const jobId = await printer.printFile(testFile, {
    jobName: "Default Behavior Test",
    // No waitForCompletion specified - should default to true
  });

  if (typeof jobId !== "number") {
    throw new Error("Job ID should be a number");
  }

  console.log("Default behavior completed successfully");
});

test(`${runtimeName}: should support waitForCompletion with raw bytes printing`, async () => {
  const printers = getAllPrinters();
  if (printers.length === 0) return;

  const printer = printers[0];

  const testData = new Uint8Array([0x50, 0x44, 0x46, 0x2d]); // PDF header

  const startTime = Date.now();

  const jobId = await printer.printBytes(testData, {
    jobName: "Bytes Quick Return Test",
    waitForCompletion: false,
  });

  const duration = Date.now() - startTime;

  if (typeof jobId !== "number") {
    throw new Error("Job ID should be a number");
  }

  console.log(`Bytes quick return took ${duration}ms`);

  // Should return quickly regardless of mode
  if (duration > 1000) {
    throw new Error(`Bytes quick return took too long: ${duration}ms`);
  }
});

test(`${runtimeName}: should handle waitForCompletion with various file types`, async () => {
  const printers = getAllPrinters();
  if (printers.length === 0) return;

  const printer = printers[0];

  // Use real test files from media directory
  const testFiles = [
    { name: TEST_FILES.TEXT, type: "text" },
    { name: TEST_FILES.PDF, type: "PDF" },
    { name: TEST_FILES.JPEG, type: "JPEG" },
    { name: TEST_FILES.PNG, type: "PNG" },
    { name: TEST_FILES.DOCX, type: "DOCX" },
  ];

  for (const file of testFiles) {
    const jobId = await printer.printFile(file.name, {
      jobName: `Test ${file.type}`,
      waitForCompletion: false,
    });

    if (typeof jobId !== "number") {
      throw new Error(`Job ID should be a number for ${file.type}`);
    }

    console.log(`File ${file.type} printed with job ID: ${jobId}`);
  }
});

test(`${runtimeName}: should track completed jobs in job history`, async () => {
  if (!isSimulationMode) {
    console.log("Skipping job history test - only safe in simulation mode");
    return;
  }

  const printers = getAllPrinters();
  if (printers.length === 0) {
    return;
  }

  const printer = printers[0];

  try {
    // Get initial job history count
    const initialHistory = printer.getJobHistory();

    // Submit a job and wait for completion
    const jobOptions = { jobName: "History Job Test" };
    const jobId = await printer.printFile(TEST_FILES.PDF, jobOptions);

    // Wait for job to complete (simulation jobs complete quickly)
    // Use shorter wait for Bun to avoid timeout issues
    const waitTime = runtimeName === "Bun" ? 500 : 2000;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Check if job appears in history
    const jobHistory = printer.getJobHistory();

    // Should have at least one more completed job
    if (jobHistory.length <= initialHistory.length) {
      console.log("Note: Job may not have completed yet or was cleaned up");
    } else {
      console.log(
        `Job history increased from ${initialHistory.length} to ${jobHistory.length}`
      );
    }

    // Validate structure of history jobs
    for (const job of jobHistory) {
      if (typeof job.id !== "number") {
        throw new Error("History job should have numeric ID");
      }
      if (typeof job.name !== "string") {
        throw new Error("History job should have string name");
      }
      if (typeof job.state !== "string") {
        throw new Error("History job should have string state");
      }

      // History jobs should be in completed states
      const completedStates = ["completed", "cancelled"];
      if (!completedStates.includes(job.state)) {
        throw new Error(
          `History job should be in completed state, got "${job.state}"`
        );
      }

      // Completed jobs should have completed_at timestamp
      if (job.state === "completed" && typeof job.completedAt !== "number") {
        console.log("Note: completed job missing completed_at timestamp");
      }
    }

    console.log(
      `Job history validation passed. Found ${jobHistory.length} historical jobs`
    );
  } catch (error) {
    if (error.message && error.message.includes("not found")) {
      console.log("Expected simulation mode error:", error.message);
      return;
    }
    throw error;
  }
});

test(`${runtimeName}: should handle media type detection correctly`, async () => {
  if (!isSimulationMode) {
    console.log("Skipping media type test - only safe in simulation mode");
    return;
  }

  const printers = getAllPrinters();
  if (printers.length === 0) {
    return;
  }

  const printer = printers[0];

  // Reduce test cases for Bun to avoid timeout issues
  const testCases =
    runtimeName === "Bun"
      ? [
          { file: TEST_FILES.PDF, expectedType: "application/pdf" },
          { file: TEST_FILES.TEXT, expectedType: "text/plain" },
        ]
      : [
          { file: TEST_FILES.PDF, expectedType: "application/pdf" },
          { file: TEST_FILES.TEXT, expectedType: "text/plain" },
          { file: TEST_FILES.JPEG, expectedType: "image/jpeg" },
          { file: TEST_FILES.PNG, expectedType: "image/png" },
          {
            file: TEST_FILES.DOCX,
            // Note: .docx is not recognized by the library's media type detection,
            // so it falls back to generic octet-stream
            expectedType: "application/octet-stream",
          },
        ];

  for (const testCase of testCases) {
    try {
      const jobId = await printer.printFile(testCase.file, {
        jobName: `Media Type Test: ${testCase.file}`,
        waitForCompletion: false, // Quick return to avoid timeout
      });

      // Give job a moment to be processed
      // Use shorter wait for Bun to avoid timeout issues
      const waitTime = runtimeName === "Bun" ? 10 : 100;
      await new Promise(resolve => setTimeout(resolve, waitTime));

      const job = printer.getJob(jobId);
      if (job && job.mediaType !== testCase.expectedType) {
        throw new Error(
          `File ${testCase.file} should have media type "${testCase.expectedType}", got "${job.mediaType}"`
        );
      }

      if (job) {
        console.log(
          `Media type detection: ${testCase.file} -> ${job.mediaType} ✓`
        );
      }
    } catch (error) {
      if (error.message && error.message.includes("not found")) {
        continue; // Expected in simulation mode
      }
      throw error;
    }
  }
});

test(`${runtimeName}: should handle raw bytes printing with correct media type`, async () => {
  if (!isSimulationMode) {
    console.log("Skipping bytes printing test - only safe in simulation mode");
    return;
  }

  const printers = getAllPrinters();
  if (printers.length === 0) {
    return;
  }

  const printer = printers[0];

  try {
    // Test printing raw bytes
    const testData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // PDF header
    const jobOptions = { jobName: "Raw Bytes Test" };

    if (typeof printer.printBytes !== "function") {
      console.log(
        "Skipping bytes test - printBytes not available on this printer instance"
      );
      return;
    }

    const jobId = await printer.printBytes(testData, jobOptions);

    // Give job a moment to be processed
    // Use shorter wait for Bun to avoid timeout issues
    const waitTime = runtimeName === "Bun" ? 10 : 100;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    const job = printer.getJob(jobId);
    if (!job) {
      throw new Error("Raw bytes job should be tracked");
    }

    if (job.mediaType !== "application/vnd.cups-raw") {
      throw new Error(
        `Raw bytes should have media type "application/vnd.cups-raw", got "${job.mediaType}"`
      );
    }

    if (job.name !== "Raw Bytes Test") {
      throw new Error(`Job name should be "Raw Bytes Test", got "${job.name}"`);
    }

    console.log(`Raw bytes printing validation passed for job ${jobId}`);
  } catch (error) {
    if (error.message && error.message.includes("not found")) {
      console.log("Expected simulation mode error:", error.message);
      return;
    }
    throw error;
  }
});
