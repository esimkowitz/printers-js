/**
 * Deno example showcasing @printers/printers features
 *
 * Run with: deno run --allow-env --allow-read --allow-net main.ts
 */

import {
  getAllPrinterNames,
  getAllPrinters,
  getPrinterByName,
  isSimulationMode,
  runtimeInfo,
  type PrinterJob,
} from "@printers/printers";

async function main() {
  console.log("🦕 Deno Printers Example");
  console.log("========================");
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

    printerNames.forEach((name: string, index: number) => {
      console.log(`   ${index + 1}. ${name}`);
    });
    console.log("");

    // Feature 2: Detailed Printer Information
    console.log("🖨️  Printer Details:");
    const printers = getAllPrinters();

    for (const printer of printers) {
      console.log(`   Name: ${printer.name}`);
      console.log(`   System Name: ${printer.systemName || "Unknown"}`);
      console.log(`   Driver: ${printer.driverName || "Unknown"}`);
      console.log(`   Description: ${printer.description || "None"}`);
      console.log(`   Location: ${printer.location || "Not specified"}`);
      console.log(`   Default: ${printer.isDefault ? "Yes" : "No"}`);
      console.log(`   Shared: ${printer.isShared ? "Yes" : "No"}`);
      console.log(`   State: ${printer.state || "Unknown"}`);
      if (printer.stateReasons && printer.stateReasons.length > 0) {
        console.log(`   State Reasons: ${printer.stateReasons.join(", ")}`);
      }
      console.log(`   Exists: ${printer.exists() ? "Yes" : "No"}`);
      console.log("   ---");
    }

    // Feature 3: Job Tracking & Management
    if (printers.length > 0) {
      const printer = printers[0];
      console.log(`\n🎯 Job Tracking Demo with: ${printer.name}`);

      try {
        // Submit multiple print jobs with different options
        console.log("📄 Submitting print jobs...");

        const jobId1 = await printer.printFile("../sample-image.png", {
          jobName: "Sample Image",
          simple: {
            copies: 2,
            paperSize: "Letter",
            quality: "high",
          },
        });

        const jobId2 = await printer.printBytes(
          new Uint8Array([72, 101, 108, 108, 111]), // "Hello"
          {
            jobName: "Raw Text Job",
            cups: {
              copies: 1,
              "media-size": "Letter",
            },
          }
        );

        console.log(`   Job 1 ID: ${jobId1}`);
        console.log(`   Job 2 ID: ${jobId2}`);

        // Feature 4: Individual Job Inspection
        console.log("\n🔍 Job Details:");
        const job1 = printer.getJob(jobId1);
        const job2 = printer.getJob(jobId2);

        if (job1) {
          displayJobInfo(job1, "Job 1");
        }
        if (job2) {
          displayJobInfo(job2, "Job 2");
        }

        // Feature 5: Active Jobs Monitoring
        console.log("\n📊 Active Jobs:");
        const activeJobs = printer.getActiveJobs();
        console.log(`   Found ${activeJobs.length} active job(s)`);

        activeJobs.forEach((job, index) => {
          console.log(
            `   ${index + 1}. ${job.name} (${job.state}) - ${job.mediaType}`
          );
        });

        // Feature 6: Job History
        console.log("\n📚 Job History (last 10):");
        const jobHistory = printer.getJobHistory(10);
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
        console.log(
          `❌ Print job failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Feature 7: Job Cleanup
    console.log("\n🧹 Cleanup:");
    if (printers.length > 0) {
      const cleaned = printers[0].cleanupOldJobs(3600); // 1 hour
      console.log(
        `   Cleaned up ${cleaned} old print job(s) for ${printers[0].name}`
      );
    }

    // Feature 8: Printer Comparison & Methods
    if (printers.length >= 1) {
      console.log("\n🔄 Printer Interface Demo:");
      const printer1 = printers[0];
      const samePrinter = getPrinterByName(printer1.name);

      console.log(`   getName(): ${printer1.getName()}`);
      console.log(`   toString(): ${printer1.toString()}`);
      console.log(`   exists(): ${printer1.exists()}`);
      console.log(
        `   equals(samePrinter): ${samePrinter?.equals(printer1) ?? false}`
      );

      if (printers.length >= 2) {
        const printer2 = printers[1];
        console.log(
          `   ${printer1.name} equals ${printer2.name}: ${printer1.equals(printer2)}`
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

  console.log("\n🎉 Deno example completed!");
}

function displayJobInfo(job: PrinterJob, label: string) {
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

if (import.meta.main) {
  await main();
}
