/**
 * Deno example using JSR import
 * 
 * Run with: deno run --allow-ffi --allow-env main.ts
 */

import { 
  getAllPrinters, 
  getAllPrinterNames,
  getPrinterByName,
  runtimeInfo,
  isSimulationMode 
} from "jsr:@printers/printers";

async function main() {
  console.log("🦕 Deno Printers Example (JSR Import)");
  console.log("=====================================");
  console.log(`Runtime: ${runtimeInfo.name} ${runtimeInfo.version}`);
  console.log(`Simulation Mode: ${isSimulationMode ? "ON (safe)" : "OFF (real printing!)"}\n`);

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
    console.log("");

    // Get detailed printer information
    console.log("🖨️  Printer Details:");
    const printers = getAllPrinters();
    
    for (const printer of printers) {
      console.log(`   Name: ${printer.name}`);
      console.log(`   System Name: ${printer.systemName}`);
      console.log(`   Driver: ${printer.driverName}`);
      console.log(`   Default: ${printer.isDefault ? "Yes" : "No"}`);
      console.log(`   Status: ${printer.state}`);
      console.log(`   Exists: ${printer.exists()}`);
      console.log("   ---");
    }

    // Test printing with the first printer
    if (printers.length > 0) {
      const firstPrinter = printers[0];
      console.log(`\n🧪 Testing print with: ${firstPrinter.name}`);
      
      try {
        await firstPrinter.printFile("test-document.pdf", {
          copies: "1",
          orientation: "portrait"
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
    Deno.exit(1);
  }

  console.log("\n🎉 Example completed!");
}

// Set simulation mode for safety (remove to test real printing)
Deno.env.set("PRINTERS_JS_SIMULATE", "true");

if (import.meta.main) {
  await main();
}