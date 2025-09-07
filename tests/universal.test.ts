/**
 * Universal test suite using the universal entrypoint
 *
 * This test file uses the universal index.ts entrypoint and should work
 * across Deno, Node.js, and Bun runtimes with minimal adaptation.
 */

// Use the universal entrypoint
import {
  cleanupOldJobs,
  getAllPrinterNames,
  getAllPrinters,
  getJobStatus,
  getPrinterByName,
  getTypedPrinters,
  isSimulationMode,
  Printer,
  type PrinterAPI,
  printerExists,
  PrintError,
  runtimeInfo,
  shutdown,
} from "../index.ts";

// Simple test runner that works across runtimes
class UniversalTestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> | void }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void> | void) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log(
      `\n🧪 Running universal tests on ${runtimeInfo.name} ${runtimeInfo.version}`,
    );
    console.log(`📊 Simulation mode: ${isSimulationMode ? "ON" : "OFF"}`);
    console.log(`🔍 Running ${this.tests.length} tests...\n`);

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${(error as Error).message}`);
        this.failed++;
      }
    }

    console.log(
      `\n📈 Tests completed: ${this.passed} passed, ${this.failed} failed`,
    );

    if (this.failed === 0) {
      console.log(`🎉 All tests passed on ${runtimeInfo.name}!`);
    } else {
      console.log(`💥 ${this.failed} test(s) failed on ${runtimeInfo.name}`);
      // Don't exit with error in universal tests, just report
    }

    return this.failed === 0;
  }
}

// Test utilities
function assertEquals(actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertExists(value: unknown, message?: string) {
  if (value === null || value === undefined) {
    throw new Error(message || "Expected value to exist");
  }
}

function assertInstanceOf(
  actual: unknown,
  expected: new (...args: any[]) => any,
  message?: string,
) {
  if (!(actual instanceof expected)) {
    throw new Error(message || `Expected instance of ${expected.name}`);
  }
}

function assertTrue(value: unknown, message?: string) {
  if (value !== true) {
    throw new Error(message || `Expected true, got ${value}`);
  }
}

function assertFalse(value: unknown, message?: string) {
  if (value !== false) {
    throw new Error(message || `Expected false, got ${value}`);
  }
}

// Create test runner instance
const runner = new UniversalTestRunner();

// Runtime information tests
runner.test("Runtime detection works correctly", () => {
  assertExists(runtimeInfo.name);
  assertTrue(["deno", "node", "bun"].includes(runtimeInfo.name));
  assertExists(runtimeInfo.version);
});

// Basic API tests
runner.test("getAllPrinterNames returns an array", () => {
  const printers = getAllPrinterNames();
  assertTrue(Array.isArray(printers));
});

runner.test("getAllPrinters returns an array of Printer objects", () => {
  const printers = getAllPrinters();
  assertTrue(Array.isArray(printers));

  if (printers.length > 0) {
    assertInstanceOf(printers[0], Printer);
  }
});

runner.test("getTypedPrinters returns typed printer instances", () => {
  const printers = getTypedPrinters();
  assertTrue(Array.isArray(printers));

  if (printers.length > 0) {
    const printer = printers[0];
    assertExists(printer.name);
    assertEquals(typeof printer.name, "string");
    assertEquals(typeof printer.exists, "function");
  }
});

runner.test("printerExists returns false for non-existent printer", () => {
  const exists = printerExists("NonExistentPrinter123");
  assertFalse(exists);
});

runner.test("getPrinterByName returns null for non-existent printer", () => {
  const printer = getPrinterByName("NonExistentPrinter123");
  assertEquals(printer, null);
});

runner.test("Printer class methods work correctly", () => {
  const printers = getAllPrinters();

  if (printers.length > 0) {
    const firstPrinter = printers[0];

    // Test basic methods
    assertExists(firstPrinter.name);
    assertEquals(typeof firstPrinter.name, "string");
    assertEquals(typeof firstPrinter.exists(), "boolean");
    assertTrue(firstPrinter.exists());

    // Test getName method (backward compatibility)
    assertEquals(firstPrinter.getName(), firstPrinter.name);
  }
});

runner.test("printFile handles file not found error correctly", async () => {
  if (!isSimulationMode) return; // Skip in real mode

  const printers = getAllPrinters();
  if (printers.length > 0) {
    const printer = printers[0];

    try {
      await printer.printFile("nonexistent_file.pdf");
      throw new Error("Should have failed");
    } catch (error) {
      assertTrue(error instanceof Error);
      assertTrue((error as Error).message.includes("File not found"));
    }
  }
});

runner.test("printFile simulation mode works correctly", async () => {
  if (!isSimulationMode) return; // Skip in real mode

  const printers = getAllPrinters();
  if (printers.length > 0) {
    const firstPrinter = printers[0];

    try {
      await firstPrinter.printFile("test-document.pdf", {
        copies: "1",
        orientation: "portrait",
      });
      // Success expected in simulation mode
    } catch (error) {
      throw new Error(`Print failed: ${(error as Error).message}`);
    }

    // Test simulation failure scenario
    try {
      await firstPrinter.printFile("fail-test.txt");
      throw new Error("Should have failed in simulation");
    } catch (error) {
      assertTrue(error instanceof Error);
      assertTrue((error as Error).message.includes("Simulated failure"));
    }
  }
});

runner.test("getJobStatus returns null for non-existent job", () => {
  const status = getJobStatus(99999);
  assertEquals(status, null);
});

runner.test("cleanupOldJobs returns a number", () => {
  const cleaned = cleanupOldJobs(3600); // 1 hour
  assertEquals(typeof cleaned, "number");
  assertTrue(cleaned >= 0);
});

runner.test("PrintError enum is accessible", () => {
  assertEquals(PrintError.PrinterNotFound, 6);
  assertEquals(PrintError.FileNotFound, 7);
  assertEquals(PrintError.SimulatedFailure, 8);
});

runner.test("Cross-runtime property access consistency", () => {
  const printers = getAllPrinters();

  if (printers.length > 0) {
    const printer = printers[0] as any;

    // All runtimes should have basic properties
    assertExists(printer.name);
    assertEquals(typeof printer.name, "string");

    // Test property access consistency where available
    if (printer.systemName !== undefined) {
      assertEquals(typeof printer.systemName, "string");
    }
    if (printer.driverName !== undefined) {
      assertEquals(typeof printer.driverName, "string");
    }
    if (printer.isDefault !== undefined) {
      assertEquals(typeof printer.isDefault, "boolean");
    }
    if (printer.isShared !== undefined) {
      assertEquals(typeof printer.isShared, "boolean");
    }
  }
});

// Export for programmatic use
export { runner };

// Auto-run if this file is executed directly
if (import.meta?.url && import.meta.url.includes("/tests/universal.test.ts")) {
  runner.run().then((success) => {
    // Cleanup
    if (typeof shutdown === "function") {
      shutdown();
    }

    // Exit with appropriate code only in standalone execution
    if (runtimeInfo.isNode && !success) {
      // @ts-ignore
      globalThis.process?.exit?.(1);
    }
  }).catch((error) => {
    console.error("Test runner failed:", error);
    // @ts-ignore
    globalThis.process?.exit?.(1);
  });
}
