/**
 * Node.js example using JSR import (requires Node.js 22+)
 *
 * Run with: node --experimental-strip-types main.js
 * Or compile with TypeScript: tsc main.ts && node main.js
 */

// Set simulation mode for safety
process.env.PRINTERS_JS_SIMULATE = "true";

// Note: JSR imports in Node.js require experimental features or TypeScript compilation
// This example shows the TypeScript version
import {
  getAllPrinterNames,
  getAllPrinters,
  getJobStatus,
  getPrinterByName,
  isSimulationMode,
  runtimeInfo,
} from "@printers/printers";

async function main() {
  console.log("🟢 Node.js Printers Example (JSR Import)");
  console.log("========================================");
  console.log(`Runtime: ${runtimeInfo.name} ${runtimeInfo.version}`);
  console.log(
    `Simulation Mode: ${
      isSimulationMode ? "ON (safe)" : "OFF (real printing!)"
    }\n`,
  );

  try {
    // Get all printers and test specific printer lookup
    console.log("📋 Available Printers:");
    const printerNames = getAllPrinterNames();

    if (printerNames.length === 0) {
      console.log("   No printers found");
      return;
    }

    printerNames.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });

    // Test specific printer retrieval
    const firstPrinterName = printerNames[0];
    const specificPrinter = getPrinterByName(firstPrinterName);

    if (specificPrinter) {
      console.log(`\n🔍 Retrieved specific printer: ${specificPrinter.name}`);
      console.log(`   Exists: ${specificPrinter.exists()}`);
      console.log(`   String representation: ${specificPrinter.toString()}`);
    }

    // Test job status (should return null for non-existent job)
    console.log("\n📊 Testing job status:");
    const jobStatus = getJobStatus(999999); // Non-existent job
    console.log(
      `   Job 999999 status: ${
        jobStatus === null ? "Not found (expected)" : "Found"
      }`,
    );

    // Test printing with error handling
    if (specificPrinter) {
      console.log(
        `\n🧪 Testing print with error handling: ${specificPrinter.name}`,
      );

      try {
        await specificPrinter.printFile("test-document.pdf");
        console.log("✅ Print job completed successfully");
      } catch (error) {
        console.log(`❌ Print failed: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("💥 Error:", error.message);
    process.exit(1);
  }

  console.log("\n🎉 Node.js JSR example completed!");
}

// Run the example
main().catch((error) => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});
