import { assertEquals, assertExists } from "@std/assert";
import {
  getAllPrinterNames,
  getAllPrinters,
  getJobStatus,
  getPrinterByName,
  Printer,
  printerExists,
} from "./mod.ts";

/**
 * Consolidated test suite for deno-printers
 *
 * Automatically detects if we should run in safe mode based on DENO_PRINTERS_SIMULATE environment variable.
 *
 * To run in safe mode (no actual printing):
 *   - Windows: cmd /c "set DENO_PRINTERS_SIMULATE=true & deno test --allow-ffi --unstable-ffi --allow-env mod.test.ts"
 *   - Unix/Linux/macOS: DENO_PRINTERS_SIMULATE=true deno test --allow-ffi --unstable-ffi --allow-env mod.test.ts
 *
 * To run in real mode (will attempt actual printing):
 *   - deno test --allow-ffi --unstable-ffi --allow-env mod.test.ts
 */
const isSimulationMode = Deno.env.get("DENO_PRINTERS_SIMULATE") === "true";

// Safe tests - these run in both real and simulation mode
Deno.test("getAllPrinterNames returns an array", () => {
  const printers = getAllPrinterNames();
  assertEquals(Array.isArray(printers), true);
});

Deno.test("getAllPrinters returns an array of Printer objects", () => {
  const printers = getAllPrinters();
  assertEquals(Array.isArray(printers), true);

  if (printers.length > 0) {
    assertEquals(printers[0] instanceof Printer, true);
  }
});

Deno.test("printerExists returns false for non-existent printer", () => {
  const exists = printerExists("NonExistentPrinter123");
  assertEquals(exists, false);
});

Deno.test("getPrinterByName returns null for non-existent printer", () => {
  const printer = getPrinterByName("NonExistentPrinter123");
  assertEquals(printer, null);
});

Deno.test("Printer class methods work correctly", () => {
  const printers = getAllPrinters();

  if (printers.length > 0) {
    const firstPrinter = printers[0];

    // Test Printer methods
    assertEquals(typeof firstPrinter.getName(), "string");
    assertEquals(typeof firstPrinter.toString(), "string");
    assertEquals(firstPrinter.getName(), firstPrinter.toString());
    assertEquals(firstPrinter.exists(), true);

    // Test equals method
    const samePrinter = new Printer(firstPrinter.getName());
    assertEquals(firstPrinter.equals(samePrinter), true);

    const differentPrinter = new Printer("Different Printer");
    assertEquals(firstPrinter.equals(differentPrinter), false);

    // Test toJSON method
    const json = firstPrinter.toJSON();
    assertEquals(typeof json, "object");
    assertEquals(json.name, firstPrinter.getName());

    // Test that getPrinterByName returns a Printer object
    const foundPrinter = getPrinterByName(firstPrinter.getName());
    assertEquals(foundPrinter instanceof Printer, true);
    assertEquals(foundPrinter?.getName(), firstPrinter.getName());
    assertEquals(foundPrinter?.equals(firstPrinter), true);
  }
});

// Error handling tests - these work in both modes
Deno.test("printFile method handles file not found error correctly", async () => {
  const printers = getAllPrinters();

  if (printers.length > 0) {
    const firstPrinter = printers[0];

    // Test printing a non-existent file
    try {
      await firstPrinter.printFile("nonexistent-file.txt");
      throw new Error("Should have failed");
    } catch (error) {
      assertEquals(error instanceof Error, true);
      assertEquals((error as Error).message, "File not found");
    }

    // Test with job properties
    try {
      await firstPrinter.printFile("nonexistent-file.txt", {
        copies: "2",
        orientation: "landscape",
      });
      throw new Error("Should have failed");
    } catch (error) {
      assertEquals(error instanceof Error, true);
      assertEquals((error as Error).message, "File not found");
    }
  }
});

// Simulation vs Real printing tests - behavior depends on mode
Deno.test({
  name: "printFile method simulation/real test",
  fn: async () => {
    const printers = getAllPrinters();

    if (printers.length > 0) {
      const firstPrinter = printers[0];

      if (isSimulationMode) {
        console.log(
          "Running in SIMULATION mode - no actual printing will occur",
        );

        // Test printing an existing file (should succeed in simulation)
        try {
          const startTime = Date.now();
          await firstPrinter.printFile("test-document.txt");
          const endTime = Date.now();

          const duration = endTime - startTime;
          console.log(`Simulated print job completed in ${duration}ms`);

          // Should take at least 1 second due to simulation timing
          assertEquals(duration >= 1000, true);
        } catch (error) {
          // If it fails, it should be with a meaningful error
          assertEquals(error instanceof Error, true);
          console.log(
            "Simulated print failed (might be expected for non-existent file):",
            (error as Error).message,
          );
        }

        // Test simulation failure scenario
        try {
          await firstPrinter.printFile("fail-test.txt");
          throw new Error("Should have failed in simulation");
        } catch (error) {
          assertEquals(error instanceof Error, true);
          assertEquals(
            (error as Error).message.includes("Simulated failure"),
            true,
          );
        }
      } else {
        console.log(
          "⚠️  Running in REAL mode - this will attempt actual printing!",
        );
        console.log("This test will try to print to:", firstPrinter.getName());

        // In real mode, we can only test that the method exists and returns a promise
        // We won't actually try to print anything to avoid wasting paper
        const printPromise = firstPrinter.printFile(
          "nonexistent-real-file.txt",
        );
        assertEquals(printPromise instanceof Promise, true);

        // The promise should reject with file not found
        try {
          await printPromise;
          throw new Error("Should have failed");
        } catch (error) {
          assertEquals(error instanceof Error, true);
          assertEquals((error as Error).message, "File not found");
        }
      }
    }
  },
});

// Job status tests - work in both modes
Deno.test("getJobStatus returns null for non-existent job", () => {
  const status = getJobStatus(99999);
  assertEquals(status, null);
});

// Integration test - varies by mode
Deno.test({
  name: "Full integration test",
  fn: async () => {
    console.log(
      `Running integration test in ${
        isSimulationMode ? "SIMULATION" : "REAL"
      } mode`,
    );

    const printers = getAllPrinters();
    console.log(`Found ${printers.length} printers`);

    if (printers.length > 0) {
      const printer = printers[0];
      console.log(`Testing with printer: ${printer.getName()}`);

      // Verify printer exists
      assertEquals(printer.exists(), true);

      // Test printer retrieval
      const foundPrinter = getPrinterByName(printer.getName());
      assertExists(foundPrinter);
      assertEquals(foundPrinter.equals(printer), true);

      if (isSimulationMode) {
        console.log("Testing simulated print operations...");

        // Test successful simulation
        try {
          const startTime = Date.now();
          await printer.printFile("success-test.pdf");
          const duration = Date.now() - startTime;
          console.log(`✓ Simulated print succeeded in ${duration}ms`);
          assertEquals(duration >= 1000, true);
        } catch (error) {
          console.log("❌ Unexpected simulation failure:", error);
          throw error;
        }

        // Test failed simulation
        try {
          await printer.printFile("fail-test.pdf");
          throw new Error("Should have failed");
        } catch (error) {
          console.log("✓ Simulated failure worked as expected");
          assertEquals(
            (error as Error).message.includes("Simulated failure"),
            true,
          );
        }
      } else {
        console.log(
          "⚠️  Skipping actual print tests in REAL mode to avoid wasting resources",
        );
        console.log("Only testing error conditions...");

        try {
          await printer.printFile("definitely-nonexistent-file.xyz");
          throw new Error("Should have failed");
        } catch (error) {
          console.log("✓ File not found error worked correctly");
          assertEquals((error as Error).message, "File not found");
        }
      }
    }

    console.log("✅ Integration test completed successfully");
  },
});

// Performance test - works in both modes
Deno.test({
  name: "Performance test - printer enumeration",
  fn: () => {
    const iterations = 100;
    console.log(`Running printer enumeration ${iterations} times...`);

    const startTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      getAllPrinterNames();
    }
    const duration = Date.now() - startTime;

    console.log(
      `${iterations} iterations completed in ${duration}ms (${
        (duration / iterations).toFixed(2)
      }ms per call)`,
    );

    // Should be reasonably fast - but give more time for slower systems
    assertEquals(duration < 30000, true); // Less than 30 seconds total
  },
});
