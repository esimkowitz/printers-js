/**
 * Node.js example using NPM package
 * 
 * Run with: npm install && npm start
 */

// Set simulation mode for safety
process.env.PRINTERS_JS_SIMULATE = "true";

import { 
  getAllPrinters, 
  getAllPrinterNames,
  getPrinterByName,
  runtimeInfo,
  isSimulationMode,
  cleanupOldJobs
} from "@printers/printers";

async function main() {
  console.log("🟢 Node.js Printers Example (NPM Import)");
  console.log("========================================");
  console.log(`Runtime: ${runtimeInfo.name} ${runtimeInfo.version}`);
  console.log(`Simulation Mode: ${isSimulationMode ? "ON (safe)" : "OFF (real printing!)"}\n`);

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
      console.log(`   Default: ${printer.isDefault ? "Yes" : "No"}`);
      console.log(`   State: ${printer.state || "Unknown"}`);
      console.log("   ---");
    }

    // Test printing with custom properties
    if (printers.length > 0) {
      const printer = printers[0];
      console.log(`\n🧪 Testing print job: ${printer.name}`);
      
      try {
        await printer.printFile("example-document.pdf", {
          copies: "1",
          orientation: "portrait",
          "paper-size": "A4"
        });
        
        console.log("✅ Print job completed successfully");
        
        if (isSimulationMode) {
          console.log("   (This was a simulation - no actual printing occurred)");
        }
      } catch (error) {
        console.log(`❌ Print failed: ${error.message}`);
      }
    }

  } catch (error) {
    console.error("💥 Error:", error.message);
    process.exit(1);
  }

  console.log("\n🎉 Node.js NPM example completed!");
}

// Run the example
main().catch(error => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});