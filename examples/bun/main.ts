/**
 * Bun example using NPM package
 *
 * Run with: bun install && bun run main.ts
 */

import {
  cleanupOldJobs,
  getAllPrinterNames,
  getAllPrinters,
  getPrinterByName,
  isSimulationMode,
  runtimeInfo,
  shutdown,
} from "@printers/printers";

async function main() {
  console.log("🚀 Bun Printers Example (NPM Import)");
  console.log("===================================");
  console.log(`Runtime: ${runtimeInfo.name} ${runtimeInfo.version}`);
  console.log(
    `Simulation Mode: ${
      isSimulationMode ? "ON (safe)" : "OFF (real printing!)"
    }\n`
  );

  try {
    // Clean up old jobs
    const cleaned = cleanupOldJobs(3600); // 1 hour
    console.log(`🧹 Cleaned up ${cleaned} old print jobs\n`);

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
    console.log("");

    // Get detailed printer information
    console.log("🖨️  Printer Details:");
    const printers = getAllPrinters();

    for (const printer of printers) {
      console.log(`   Name: ${printer.name}`);
      console.log(`   Driver: ${printer.driverName || "Unknown"}`);
      console.log(`   Default: ${printer.isDefault ? "Yes" : "No"}`);
      console.log(`   State: ${printer.state || "Unknown"}`);
      console.log("   ---");
    }

    // Test concurrent printing
    if (printers.length > 0) {
      console.log(`\n🧪 Testing concurrent print jobs...`);
      const printer = printers[0];

      try {
        // Start multiple print jobs
        const startTime = Date.now();

        const jobs = await Promise.allSettled([
          printer.printFile("doc1.pdf", { copies: "1" }),
          printer.printFile("doc2.pdf", { copies: "1" }),
          printer.printFile("doc3.pdf", { copies: "1" }),
        ]);

        const duration = Date.now() - startTime;
        const successful = jobs.filter(
          job => job.status === "fulfilled"
        ).length;
        const failed = jobs.filter(job => job.status === "rejected").length;

        console.log(`✅ Print jobs completed in ${duration}ms`);
        console.log(`   Successful: ${successful}, Failed: ${failed}`);

        if (isSimulationMode) {
          console.log(
            "   (These were simulations - no actual printing occurred)"
          );
        }
      } catch (error) {
        console.log(`❌ Print jobs failed: ${error.message}`);
      }
    }

    // Test printer disposal (Bun-specific cleanup)
    if (printers.length > 0) {
      console.log(`\n🧹 Testing printer disposal...`);
      const printer = getPrinterByName(printers[0].name);

      if (printer && printer.dispose) {
        console.log(`   Disposing printer: ${printer.name}`);
        printer.dispose();

        try {
          // This should throw after disposal
          printer.name;
          console.log("❌ Expected disposal to prevent property access");
        } catch (error) {
          console.log("✅ Printer properly disposed");
        }
      }
    }

    // Clean shutdown
    console.log("\n🛑 Shutting down printer system...");
    shutdown();
  } catch (error) {
    console.error("💥 Error:", error.message);
    process.exit(1);
  }

  console.log("\n🎉 Bun NPM example completed!");
}

// Run the example
main().catch(error => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});
