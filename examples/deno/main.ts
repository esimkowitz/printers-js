/**
 * Deno Interactive Printer CLI
 *
 * Run with: deno task start
 */

import {
  getAllPrinters,
  getDefaultPrinter,
  isSimulationMode,
  runtimeInfo,
  type Printer,
} from "@printers/printers";
import { Select, Input, Confirm } from "@cliffy/prompt";
import { join, dirname, fromFileUrl } from "@std/path";
import { createInterface } from "node:readline";
import { statSync, readdirSync } from "node:fs";

/**
 * Prompt for file path with tab completion using Node.js readline
 */
async function promptFilePathWithCompletion(
  message: string,
  defaultPath: string
): Promise<string> {
  return new Promise(resolve => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      completer: (line: string) => {
        try {
          // Get the directory and partial filename
          const lastSlash = Math.max(
            line.lastIndexOf("/"),
            line.lastIndexOf("\\")
          );
          const dir = lastSlash >= 0 ? line.substring(0, lastSlash + 1) : "./";
          const partial = lastSlash >= 0 ? line.substring(lastSlash + 1) : line;

          // Read directory contents
          const files = readdirSync(dir || ".");
          const completions = files
            .filter(f => f.startsWith(partial))
            .map(f => {
              const fullPath = join(dir, f);
              try {
                const isDir = statSync(fullPath).isDirectory();
                return isDir ? f + "/" : f;
              } catch {
                return f;
              }
            })
            .map(f => (dir === "./" ? f : dir + f));

          return [
            completions.length
              ? completions
              : files.map(f => (dir === "./" ? f : dir + f)),
            line,
          ];
        } catch {
          return [[], line];
        }
      },
    });

    rl.question(`${message} (${defaultPath}): `, answer => {
      rl.close();
      resolve(answer.trim() || defaultPath);
    });
  });
}

async function main() {
  console.clear();
  console.log("Deno Interactive Printer CLI");
  console.log("============================");
  console.log(`Runtime: ${runtimeInfo.name} ${runtimeInfo.version}`);
  console.log(
    `Simulation Mode: ${isSimulationMode ? "ON (safe)" : "OFF (real printing!)"}\n`
  );

  const printers = getAllPrinters();
  if (printers.length === 0) {
    console.log("No printers found");
    return;
  }

  let selectedPrinter = getDefaultPrinter() || printers[0];

  while (true) {
    console.log(`\nCurrent printer: ${selectedPrinter.name}`);

    const action = await Select.prompt({
      message: "What would you like to do?",
      options: [
        { name: "📋 List all printers", value: "list" },
        { name: "🔄 Switch printer", value: "switch" },
        { name: "ℹ️  Show printer details", value: "details" },
        { name: "🖨️  Print a file", value: "print" },
        { name: "📊 View active jobs", value: "jobs" },
        { name: "📚 View job history", value: "history" },
        { name: "🧹 Cleanup old jobs", value: "cleanup" },
        { name: "🚪 Exit", value: "exit" },
      ],
      maxRows: 20,
    });

    switch (action) {
      case "list":
        await listPrinters(printers);
        break;
      case "switch":
        selectedPrinter = await switchPrinter(printers);
        break;
      case "details":
        await showPrinterDetails(selectedPrinter);
        break;
      case "print":
        await printFile(selectedPrinter);
        break;
      case "jobs":
        await viewActiveJobs(selectedPrinter);
        break;
      case "history":
        await viewJobHistory(selectedPrinter);
        break;
      case "cleanup":
        await cleanupJobs(selectedPrinter);
        break;
      case "exit":
        return;
    }
  }
}

async function listPrinters(printers: Printer[]) {
  console.log("\nAvailable Printers:");
  printers.forEach((printer, index) => {
    const defaultMarker = printer.isDefault ? " (default)" : "";
    const stateInfo = printer.state ? ` [${printer.state}]` : "";
    console.log(`  ${index + 1}. ${printer.name}${defaultMarker}${stateInfo}`);
  });
}

async function switchPrinter(printers: Printer[]): Promise<Printer> {
  const printerIndex = await Select.prompt({
    message: "Select a printer:",
    options: printers.map((printer, index) => ({
      name: `${printer.name}${printer.isDefault ? " (default)" : ""}`,
      value: index,
    })),
    maxRows: 20,
  });

  const printer = printers[printerIndex];
  console.log(`Switched to: ${printer.name}`);
  return printer;
}

async function showPrinterDetails(printer: Printer) {
  console.log("\nPrinter Details:");
  console.log(`  Name: ${printer.name}`);
  console.log(`  System Name: ${printer.systemName || "Unknown"}`);
  console.log(`  Driver: ${printer.driverName || "Unknown"}`);
  console.log(`  Description: ${printer.description || "None"}`);
  console.log(`  Location: ${printer.location || "Not specified"}`);
  console.log(`  Default: ${printer.isDefault ? "Yes" : "No"}`);
  console.log(`  Shared: ${printer.isShared ? "Yes" : "No"}`);
  console.log(`  State: ${printer.state || "Unknown"}`);
  if (printer.stateReasons && printer.stateReasons.length > 0) {
    console.log(`  State Reasons: ${printer.stateReasons.join(", ")}`);
  }
  console.log(`  Exists: ${printer.exists() ? "Yes" : "No"}`);
}

async function printFile(printer: Printer) {
  const scriptDir = dirname(fromFileUrl(import.meta.url));
  const mediaDir = join(scriptDir, "..", "..", "media");

  // List available media files by reading the directory
  const mediaFiles: string[] = [];
  try {
    for await (const entry of Deno.readDir(mediaDir)) {
      if (entry.isFile) {
        mediaFiles.push(entry.name);
      }
    }
    mediaFiles.sort();
  } catch {
    // If media dir doesn't exist, continue with empty list
  }

  const fileChoices = [
    ...mediaFiles.map(file => ({
      name: file,
      value: join(mediaDir, file),
    })),
    { name: "Custom path...", value: "custom" },
  ];

  let filePath: string;
  if (fileChoices.length > 1) {
    const selectedPath = await Select.prompt({
      message: "Select file to print:",
      options: fileChoices,
      maxRows: 20,
    });

    if (selectedPath === "custom") {
      const defaultPath = join(mediaDir, mediaFiles[0] || "sample.png");
      filePath = await promptFilePathWithCompletion(
        "Enter file path",
        defaultPath
      );
    } else {
      filePath = selectedPath;
    }
  } else {
    // No media files, go straight to custom path
    const defaultPath = join(mediaDir, "sample.png");
    filePath = await promptFilePathWithCompletion(
      "Enter file path",
      defaultPath
    );
  }

  const jobName = await Input.prompt({
    message: "Enter job name:",
    default: "Interactive Print Job",
  });

  const copiesStr = await Input.prompt({
    message: "Number of copies:",
    default: "1",
  });

  try {
    console.log("\nSubmitting print job...");
    const jobId = await printer.printFile(filePath, {
      jobName,
      simple: {
        copies: parseInt(copiesStr),
        paperSize: "Letter",
        quality: "high",
      },
    });

    console.log(`Print job submitted successfully!`);
    console.log(`   Job ID: ${jobId}`);

    if (isSimulationMode) {
      console.log("   Job was simulated - no actual printing occurred");
    }
  } catch (error) {
    console.error(
      `\x1b[31mPrint job failed: ${error instanceof Error ? error.message : String(error)}\x1b[0m`
    );
  }
}

async function viewActiveJobs(printer: Printer) {
  console.log("\nActive Jobs:");
  const jobs = printer.getActiveJobs();

  if (jobs.length === 0) {
    console.log("  No active jobs");
    return;
  }

  jobs.forEach((job, index) => {
    console.log(`  ${index + 1}. ${job.name}`);
    console.log(`     State: ${job.state}`);
    console.log(`     Media: ${job.mediaType}`);
    console.log(`     Age: ${Math.round(job.ageSeconds)}s`);
  });
}

async function viewJobHistory(printer: Printer) {
  const limitStr = await Input.prompt({
    message: "How many jobs to show?",
    default: "10",
  });

  const limit = parseInt(limitStr);
  console.log(`\nJob History (last ${limit}):`);
  const jobs = printer.getJobHistory(limit);

  if (jobs.length === 0) {
    console.log("  No jobs in history");
    return;
  }

  jobs.forEach((job, index) => {
    const age = Math.round(job.ageSeconds);
    console.log(`  ${index + 1}. ${job.name} (${job.state}) - ${age}s ago`);
  });
}

async function cleanupJobs(printer: Printer) {
  const maxAgeStr = await Input.prompt({
    message:
      "Maximum age in seconds (jobs older than this will be cleaned up):",
    default: "3600",
  });

  const shouldCleanup = await Confirm.prompt({
    message: "Are you sure you want to cleanup old jobs?",
    default: true,
  });

  if (!shouldCleanup) {
    console.log("Cleanup cancelled");
    return;
  }

  const maxAge = parseInt(maxAgeStr);
  const cleaned = printer.cleanupOldJobs(maxAge);
  console.log(`Cleaned up ${cleaned} old job(s)`);
}

if (import.meta.main) {
  await main().catch(error => {
    console.error(
      "\x1b[31mError:",
      error instanceof Error ? error.message : String(error) + "\x1b[0m"
    );
    Deno.exit(1);
  });
}
