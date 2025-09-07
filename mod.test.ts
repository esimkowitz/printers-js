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
    assertEquals(typeof firstPrinter.name, "string");
    assertEquals(firstPrinter.exists(), true);

    // Test all getter properties
    assertEquals(typeof firstPrinter.name, "string");
    assertEquals(typeof firstPrinter.systemName, "string");
    assertEquals(typeof firstPrinter.driverName, "string");
    assertEquals(typeof firstPrinter.uri, "string");
    assertEquals(typeof firstPrinter.portName, "string");
    assertEquals(typeof firstPrinter.processor, "string");
    assertEquals(typeof firstPrinter.dataType, "string");
    assertEquals(typeof firstPrinter.description, "string");
    assertEquals(typeof firstPrinter.location, "string");
    assertEquals(typeof firstPrinter.isDefault, "boolean");
    assertEquals(typeof firstPrinter.isShared, "boolean");
    assertEquals(typeof firstPrinter.state, "string");
    assertEquals(Array.isArray(firstPrinter.stateReasons), true);

    // Test equals method with same printer found by name
    const samePrinter = getPrinterByName(firstPrinter.name);
    if (samePrinter) {
      assertEquals(firstPrinter.equals(samePrinter), true);
    }

    // Test that getPrinterByName returns a Printer object
    const foundPrinter = getPrinterByName(firstPrinter.name);
    assertEquals(foundPrinter instanceof Printer, true);
    assertEquals(foundPrinter?.getName(), firstPrinter.getName());
    assertEquals(foundPrinter?.name, firstPrinter.name);
    assertEquals(foundPrinter?.equals(firstPrinter), true);

    // Test toString contains printer name
    assertEquals(firstPrinter.toString().includes(firstPrinter.name), true);
    assertEquals(firstPrinter.toString().startsWith("Printer {"), true);
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

// Memory management and garbage collection tests
Deno.test("Memory management - dispose method", () => {
  const printers = getAllPrinters();

  if (printers.length > 0) {
    const printer = getPrinterByName(printers[0].name);
    if (printer) {
      // Test that printer works before dispose
      assertEquals(typeof printer.name, "string");
      assertEquals(typeof printer.systemName, "string");

      // Dispose the printer
      printer.dispose();

      // Test that accessing properties throws after dispose
      let threwError = false;
      try {
        const _name = printer.name;
      } catch (error) {
        threwError = true;
        assertEquals(error instanceof Error, true);
        assertEquals(
          (error as Error).message,
          "Printer instance has been disposed",
        );
      }
      assertEquals(threwError, true, "Should have thrown error after dispose");

      // Test that dispose is idempotent (can be called multiple times safely)
      printer.dispose(); // Should not throw
      printer.dispose(); // Should not throw
    }
  }
});

Deno.test("Memory management - garbage collection simulation", async () => {
  const printers = getAllPrinters();

  if (printers.length > 0) {
    const printerName = printers[0].name;

    // Create multiple printer instances to test garbage collection
    const createPrinters = () => {
      const instances = [];
      for (let i = 0; i < 10; i++) {
        const printer = getPrinterByName(printerName);
        if (printer) {
          // Access some properties to ensure the instance is fully created
          printer.name;
          printer.systemName;
          instances.push(printer);
        }
      }
      return instances;
    };

    console.log("Creating 10 printer instances...");
    let printerInstances = createPrinters();
    assertEquals(printerInstances.length, 10);

    console.log("Verifying instances work correctly...");
    for (const printer of printerInstances) {
      assertEquals(printer.name, printerName);
      assertEquals(typeof printer.systemName, "string");
    }

    console.log("Releasing references and forcing garbage collection...");
    // Clear the references to allow garbage collection
    printerInstances = [];

    // Force garbage collection (this is a hint to the GC, not guaranteed)
    if (
      "gc" in globalThis &&
      typeof (globalThis as { gc?: () => void }).gc === "function"
    ) {
      (globalThis as { gc: () => void }).gc();
    }

    // Give time for finalization registry to potentially run
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log("Creating new instances to verify memory management...");
    // Create new instances to verify the system still works
    const newInstances = createPrinters();
    assertEquals(newInstances.length, 10);

    // Explicitly dispose of new instances to test proper cleanup
    for (const printer of newInstances) {
      printer.dispose();
    }

    console.log("✓ Memory management test completed successfully");
  }
});

Deno.test("Memory management - multiple create and dispose cycles", () => {
  const printers = getAllPrinters();

  if (printers.length > 0) {
    const printerName = printers[0].name;

    console.log("Testing multiple create/dispose cycles...");

    for (let cycle = 0; cycle < 5; cycle++) {
      console.log(`Cycle ${cycle + 1}/5`);

      // Create multiple instances
      const instances = [];
      for (let i = 0; i < 3; i++) {
        const printer = getPrinterByName(printerName);
        if (printer) {
          // Verify the instance works
          assertEquals(printer.name, printerName);
          assertEquals(typeof printer.driverName, "string");
          assertEquals(typeof printer.isDefault, "boolean");
          instances.push(printer);
        }
      }

      assertEquals(instances.length, 3);

      // Dispose all instances
      for (const printer of instances) {
        printer.dispose();

        // Verify disposal worked
        let threwError = false;
        try {
          printer.name;
        } catch (error) {
          threwError = true;
          assertEquals(
            (error as Error).message,
            "Printer instance has been disposed",
          );
        }
        assertEquals(threwError, true);
      }
    }

    console.log("✓ Multiple create/dispose cycles completed successfully");
  }
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
