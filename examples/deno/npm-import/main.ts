/**
 * Deno example using NPM import
 * 
 * Run with: deno run --allow-ffi --allow-env --allow-read --allow-net main.ts
 */

import { 
  getAllPrinters, 
  getAllPrinterNames,
  getPrinterByName,
  runtimeInfo,
  isSimulationMode 
} from "npm:@printers/printers";

async function main() {
  console.log("🦕 Deno Printers Example (NPM Import)");
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

    // Test printer comparison
    console.log("\n🔄 Testing printer comparison:");
    const printers = getAllPrinters();
    
    if (printers.length >= 2) {
      const printer1 = printers[0];
      const printer2 = printers[1];
      const samePrinter = getPrinterByName(printer1.name);
      
      console.log(`   ${printer1.name} equals ${printer2.name}: ${printer1.equals(printer2)}`);
      console.log(`   ${printer1.name} equals same printer: ${samePrinter?.equals(printer1)}`);
    }

    // Test multiple print jobs
    console.log(`\n🧪 Testing multiple print jobs...`);
    if (printers.length > 0) {
      const printer = printers[0];
      
      try {
        // Start multiple print jobs concurrently
        const jobs = [
          printer.printFile("document1.pdf", { copies: "1" }),
          printer.printFile("document2.pdf", { copies: "1" }),
          printer.printFile("document3.pdf", { copies: "1" })
        ];
        
        await Promise.all(jobs);
        console.log("✅ All print jobs completed successfully");
        
        if (isSimulationMode) {
          console.log("   (These were simulations - no actual printing occurred)");
        }
      } catch (error) {
        console.log(`❌ Some print jobs failed: ${error.message}`);
      }
    }

  } catch (error) {
    console.error("💥 Error:", error.message);
    Deno.exit(1);
  }

  console.log("\n🎉 NPM import example completed!");
}

// Set simulation mode for safety
Deno.env.set("PRINTERS_JS_SIMULATE", "true");

if (import.meta.main) {
  await main();
}