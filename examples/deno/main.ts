/**
 * Deno example using npm import
 *
 * Run with: deno run --allow-env --allow-read --allow-net main.ts
 */

import {
  cleanupOldJobs,
  getAllPrinterNames,
  getAllPrinters,
  getPrinterByName,
  isSimulationMode,
  runtimeInfo,
} from "@printers/printers";

async function main() {
  console.log("🦕 Deno Printers Example (NPM Import)");
  console.log("=====================================");
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

    printerNames.forEach((name: string, index: number) => {
      console.log(`   ${index + 1}. ${name}`);
    });
    console.log("");

    // Get detailed printer information
    console.log("🖨️  Printer Details:");
    const printers = getAllPrinters();

    for (const printer of printers) {
      console.log(`   Name: ${printer.name}`);
      console.log(`   Default: ${printer.isDefault ? "Yes" : "No"}`);
      console.log(`   State: ${printer.state || "Unknown"}`);
      console.log("   ---");
    }

    // Test printer comparison
    console.log("\n🔄 Testing printer comparison:");
    const printers = getAllPrinters();

    if (printers.length >= 2) {
      const printer1 = printers[0];
      const printer2 = printers[1];
      const samePrinter = getPrinterByName(printer1.name);

      console.log(
        `   ${printer1.name} equals ${printer2.name}: ${printer1.equals(
          printer2
        )}`
      );
      console.log(
        `   ${printer1.name} equals same printer: ${samePrinter?.equals(
          printer1
        )}`
      );
    }

    // Test multiple print jobs
    console.log(`\n🧪 Testing multiple print jobs...`);
    if (printers.length > 0) {
      const printer = printers[0];

      try {
        // Start multiple print jobs concurrently
        const jobs = await Promise.allSettled([
          printer.printFile("document1.pdf", { copies: "1" }),
          printer.printFile("document2.pdf", { copies: "1" }),
          printer.printFile("document3.pdf", { copies: "1" }),
        ]);

        const successful = jobs.filter(
          job => job.status === "fulfilled"
        ).length;
        const failed = jobs.filter(job => job.status === "rejected").length;

        if (successful > 0) {
          console.log(`✅ ${successful} print job(s) completed successfully`);
        }
        if (failed > 0) {
          console.log(
            `⚠️  ${failed} print job(s) failed (likely missing files)`
          );
        }

        if (isSimulationMode) {
          console.log(
            "   (These were simulations - no actual printing occurred)"
          );
        }
      } catch (error) {
        console.log(
          `❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  } catch (error) {
    console.error(
      "💥 Error:",
      error instanceof Error ? error.message : String(error)
    );
    Deno.exit(1);
  }

  console.log("\n🎉 NPM import example completed!");
}

if (import.meta.main) {
  await main();
}
