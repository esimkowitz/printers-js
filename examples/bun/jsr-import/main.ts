/**
 * Bun example using JSR import
 *
 * Run with: bun run main.ts
 */

// Set simulation mode for safety
process.env.PRINTERS_JS_SIMULATE = "true";

import {
  getAllPrinterNames,
  getAllPrinters,
  getPrinterByName,
  isSimulationMode,
  PrintError,
  runtimeInfo,
} from "@printers/printers";

async function main() {
  console.log("🚀 Bun Printers Example (JSR Import)");
  console.log("===================================");
  console.log(`Runtime: ${runtimeInfo.name} ${runtimeInfo.version}`);
  console.log(
    `Simulation Mode: ${
      isSimulationMode ? "ON (safe)" : "OFF (real printing!)"
    }\n`,
  );

  try {
    // Get all printer names
    console.log("📋 Available Printers:");
    const printerNames = getAllPrinterNames();

    if (printerNames.length === 0) {
      console.log("   No printers found");
      return;
    }

    printerNames.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });

    // Test printer existence
    console.log("\n🔍 Testing printer existence:");
    const existingPrinter = getPrinterByName(printerNames[0]);
    const nonExistentPrinter = getPrinterByName("NonExistentPrinter");

    console.log(`   ${printerNames[0]} exists: ${existingPrinter !== null}`);
    console.log(`   NonExistentPrinter exists: ${nonExistentPrinter !== null}`);

    // Test printing with error handling using PrintError enum
    if (existingPrinter) {
      console.log(`\n🧪 Testing print with comprehensive error handling...`);

      try {
        await existingPrinter.printFile("test-document.pdf", {
          copies: "2",
          orientation: "landscape",
        });

        console.log("✅ Print job completed successfully");

        if (isSimulationMode) {
          console.log(
            "   (This was a simulation - no actual printing occurred)",
          );
        }
      } catch (error) {
        console.log(`❌ Print failed: ${error.message}`);

        // Check for specific error types
        if (error.message.includes("File not found")) {
          console.log(
            `   Error type: PrintError.FileNotFound (${PrintError.FileNotFound})`,
          );
        } else if (error.message.includes("Simulated failure")) {
          console.log(
            `   Error type: PrintError.SimulatedFailure (${PrintError.SimulatedFailure})`,
          );
        }
      }
    }

    // Test performance timing
    console.log("\n⏱️  Testing performance:");
    const startTime = performance.now();

    for (let i = 0; i < 5; i++) {
      getAllPrinterNames();
    }

    const endTime = performance.now();
    console.log(
      `   5 printer enumeration calls took ${
        (endTime - startTime).toFixed(2)
      }ms`,
    );

    // Test all available PrintError enum values
    console.log("\n📋 Available PrintError types:");
    Object.entries(PrintError).forEach(([name, value]) => {
      if (typeof value === "number") {
        console.log(`   ${name}: ${value}`);
      }
    });
  } catch (error) {
    console.error("💥 Error:", error.message);
    process.exit(1);
  }

  console.log("\n🎉 Bun JSR example completed!");
}

// Run the example
main().catch((error) => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});
