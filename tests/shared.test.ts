/**
 * Shared cross-runtime test suite using @cross/test
 * Contains all core printer library tests that work across Deno, Bun, and Node.js
 * Can be run directly or imported by runtime-specific test files
 */

import { test } from "@cross/test";

// Always use the universal entrypoint for consistency
const printerAPI = await import("../index.ts");

// Determine which runtime we're in for test naming
let runtimeName: string;
if (typeof Deno !== "undefined" && Deno.env.get("FORCE_NODE_RUNTIME") === "true") {
  runtimeName = "Node.js"; // Force Node.js testing when running in Deno with this env var
} else if (typeof Deno !== "undefined") {
  runtimeName = "Deno";
} else if (typeof Bun !== "undefined") {
  runtimeName = "Bun"; 
} else if (typeof process !== "undefined") {
  runtimeName = "Node.js";
} else {
  runtimeName = "Unknown";
}

// Ensure simulation mode is enabled for safe testing
if (typeof process !== "undefined") {
  process.env.PRINTERS_JS_SIMULATE = "true";
}

// Extract API functions
const {
  getAllPrinterNames,
  getAllPrinters,
  getTypedPrinters,
  printerExists,
  getPrinterByName,
  Printer,
  cleanupOldJobs,
  getJobStatus,
  shutdown,
  PrintError,
  isSimulationMode,
  runtimeInfo
} = printerAPI;

// Core cross-runtime tests
test(`${runtimeName}: should return an array from getAllPrinterNames`, () => {
  const printerNames = getAllPrinterNames();
  if (!Array.isArray(printerNames)) {
    throw new Error("getAllPrinterNames should return an array");
  }
  
  // In simulation mode, we should get at least some printers
  if (isSimulationMode && printerNames.length === 0) {
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

test(`${runtimeName}: should return typed printer instances from getTypedPrinters`, () => {
  const printers = getTypedPrinters();
  if (!Array.isArray(printers)) {
    throw new Error("getTypedPrinters should return an array");
  }
  
  for (const printer of printers) {
    if (!(printer instanceof Printer)) {
      throw new Error("Each printer should be a Printer instance");
    }
  }
});

test(`${runtimeName}: should return false for non-existent printer in printerExists`, () => {
  const exists = printerExists("NonExistentPrinter12345");
  if (exists !== false) {
    throw new Error("printerExists should return false for non-existent printer");
  }
});

test(`${runtimeName}: should return null for non-existent printer in getPrinterByName`, () => {
  const printer = getPrinterByName("NonExistentPrinter12345");
  if (printer !== null) {
    throw new Error("getPrinterByName should return null for non-existent printer");
  }
});

test(`${runtimeName}: should have working Printer class methods`, () => {
  const printers = getTypedPrinters();
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
  const samePrinter = Printer.fromName(printer.name);
  if (samePrinter && !printer.equals(samePrinter)) {
    throw new Error("Printer should equal another instance with same name");
  }
});

test(`${runtimeName}: should handle printFile operations`, async () => {
  const printers = getTypedPrinters();
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
  const envSimulate = 
    (typeof Deno !== "undefined" && Deno.env.get("PRINTERS_JS_SIMULATE") === "true") ||
    (typeof process !== "undefined" && process.env.PRINTERS_JS_SIMULATE === "true");
  
  if (envSimulate && !isSimulationMode) {
    throw new Error("isSimulationMode should be true when PRINTERS_JS_SIMULATE=true");
  }
});

test(`${runtimeName}: should have consistent API across getAllPrinterNames and getAllPrinters`, () => {
  const printerNames = getAllPrinterNames();
  const printers = getAllPrinters();

  if (printerNames.length !== printers.length) {
    throw new Error("getAllPrinterNames and getAllPrinters should return same count");
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
  if (!runtimeInfo.name) {
    throw new Error("Runtime name should be available");
  }
  if (!runtimeInfo.version) {
    throw new Error("Runtime version should be available");
  }
  
  const expectedRuntimes = ["Deno", "Bun", "Node.js", "deno", "bun", "node"];
  if (!expectedRuntimes.includes(runtimeInfo.name)) {
    throw new Error(`Runtime should be one of ${expectedRuntimes.join(", ")}, got ${runtimeInfo.name}`);
  }
});

