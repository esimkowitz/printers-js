/**
 * Node.js example showcasing @printers/printers features
 *
 * Run with: npm install && npm start
 */

import {
  cleanupOldJobs,
  getAllPrinterNames,
  getAllPrinters,
  getPrinterByName,
  getActiveJobs,
  getJobHistory,
  getPrinterJob,
  isSimulationMode,
  runtimeInfo,
} from "@printers/printers";

async function main() {
  console.log("🟢 Node.js Printers Example");
  console.log("===========================");
  console.log(`Runtime: ${runtimeInfo.name} ${runtimeInfo.version}`);
  console.log(
    `Simulation Mode: ${
      isSimulationMode ? "ON (safe)" : "OFF (real printing!)"
    }\n`
  );

  try {
    // Feature 1: Printer Discovery
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

    // Feature 2: Detailed Printer Information
    console.log("🖨️  Printer Details:");
    const printers = getAllPrinters();

    for (const printer of printers) {
      console.log(`   Name: ${printer.name}`);
      console.log(`   Default: ${printer.isDefault ? "Yes" : "No"}`);
      console.log(`   State: ${printer.state || "Unknown"}`);
      console.log("   ---");
    }

    // Feature 3: Job Tracking & Management
    if (printers.length > 0) {
      const printer = printers[0];
      console.log(`\n🎯 Job Tracking Demo with: ${printer.name}`);

      try {
        // Submit multiple print jobs with different options
        console.log("📄 Submitting print jobs...");

        const jobId1 = await printer.printFile("document.pdf", {
          "job-name": "PDF Document",
          copies: "2",
          "paper-size": "A4",
        });

        const jobId2 = await printer.printBytes(Buffer.from("Hello", "utf-8"), {
          "job-name": "Raw Text Job",
          copies: "1",
        });

        console.log(`   Job 1 ID: ${jobId1}`);
        console.log(`   Job 2 ID: ${jobId2}`);

        // Feature 4: Individual Job Inspection
        console.log("\n🔍 Job Details:");
        const job1 = getPrinterJob(jobId1);
        const job2 = getPrinterJob(jobId2);

        if (job1) {
          displayJobInfo(job1, "Job 1");
        }
        if (job2) {
          displayJobInfo(job2, "Job 2");
        }

        // Feature 5: Active Jobs Monitoring
        console.log("\n📊 Active Jobs:");
        const activeJobs = getActiveJobs();
        console.log(`   Found ${activeJobs.length} active job(s)`);

        activeJobs.forEach((job, index) => {
          console.log(
            `   ${index + 1}. ${job.name} (${job.state}) - ${job.mediaType}`
          );
        });

        // Feature 6: Job History
        console.log("\n📚 Job History (last 10):");
        const jobHistory = getJobHistory(10);
        console.log(`   Found ${jobHistory.length} job(s) in history`);

        jobHistory.slice(0, 3).forEach((job, index) => {
          const age = Math.round(job.ageSeconds);
          console.log(
            `   ${index + 1}. ${job.name} (${job.state}) - ${age}s ago`
          );
        });

        if (isSimulationMode) {
          console.log(
            "\n   ℹ️  All jobs were simulated - no actual printing occurred"
          );
        }
      } catch (error) {
        console.log(`❌ Print job failed: ${error.message}`);
      }
    }

    // Feature 7: Job Cleanup
    console.log("\n🧹 Cleanup:");
    const cleaned = cleanupOldJobs(3600); // 1 hour
    console.log(`   Cleaned up ${cleaned} old print job(s)`);

    // Feature 8: Printer Comparison
    if (printers.length >= 2) {
      console.log("\n🔄 Printer Comparison:");
      const printer1 = printers[0];
      const printer2 = printers[1];
      const samePrinter = getPrinterByName(printer1.name);

      console.log(
        `   ${printer1.name} equals ${printer2.name}: ${printer1.equals(printer2)}`
      );
      console.log(
        `   ${printer1.name} equals itself: ${samePrinter?.equals(printer1) ?? false}`
      );
    }
  } catch (error) {
    console.error("💥 Error:", error.message);
    process.exit(1);
  }

  console.log("\n🎉 Node.js example completed!");
}

function displayJobInfo(job, label) {
  console.log(`   ${label}:`);
  console.log(`     Name: ${job.name}`);
  console.log(`     State: ${job.state}`);
  console.log(`     Media Type: ${job.mediaType}`);
  console.log(`     Printer: ${job.printerName}`);
  console.log(
    `     Created: ${new Date(job.createdAt * 1000).toLocaleTimeString()}`
  );
  if (job.processedAt) {
    console.log(
      `     Processed: ${new Date(job.processedAt * 1000).toLocaleTimeString()}`
    );
  }
  if (job.completedAt) {
    console.log(
      `     Completed: ${new Date(job.completedAt * 1000).toLocaleTimeString()}`
    );
  }
  console.log(`     Age: ${Math.round(job.ageSeconds)}s`);
}

// Run the example
main().catch(error => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});
