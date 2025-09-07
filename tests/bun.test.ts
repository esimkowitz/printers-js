/**
 * Bun-specific tests
 * Run with: bun test tests/bun.test.ts
 */

import { expect, test } from "bun:test";

// Set simulation mode for safe testing
process.env.PRINTERS_JS_SIMULATE = "true";

import { getAllPrinterNames, getAllPrinters } from "../bun.js";

test("getAllPrinterNames returns an array", () => {
  const printers = getAllPrinterNames();
  expect(Array.isArray(printers)).toBe(true);
});

test("getAllPrinters returns an array of Printer objects", () => {
  const printers = getAllPrinters();
  expect(Array.isArray(printers)).toBe(true);

  if (printers.length > 0) {
    expect(printers[0]).toHaveProperty("name");
    expect(typeof printers[0].name).toBe("string");
  }
});

test("Bun FFI module loads successfully", () => {
  const printers = getAllPrinters();
  const names = getAllPrinterNames();

  expect(Array.isArray(printers)).toBe(true);
  expect(Array.isArray(names)).toBe(true);
});

test("Printer objects have required methods", () => {
  const printers = getAllPrinters();

  if (printers.length > 0) {
    const printer = printers[0];
    expect(typeof printer.getName).toBe("function");
    expect(typeof printer.exists).toBe("function");
    expect(typeof printer.printFile).toBe("function");

    const name = printer.getName();
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
  }
});

test("printFile handles simulation mode correctly", async () => {
  const printers = getAllPrinters();

  if (printers.length > 0) {
    const printer = printers[0];

    // This should succeed in simulation mode
    await expect(printer.printFile("test-document.pdf", {
      copies: "1",
      orientation: "portrait",
    })).resolves.toBeUndefined();

    // This should fail in simulation mode
    await expect(printer.printFile("fail-test.txt"))
      .rejects.toThrow(/Simulated failure/);
  }
});
