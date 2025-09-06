import { getAllPrinters, getJobStatus } from "./mod.ts";

async function testAsyncPrinting() {
  const printers = getAllPrinters();
  if (printers.length > 0) {
    const printer = printers[0];
    console.log(`Testing async printing with: ${printer.getName()}`);

    console.log("Starting print job...");
    const startTime = Date.now();

    try {
      await printer.printFile("test-document.txt", {
        copies: "1",
        quality: "normal",
      });
      const endTime = Date.now();
      console.log(
        `Print job completed successfully in ${endTime - startTime}ms`,
      );
    } catch (error) {
      const endTime = Date.now();
      console.log(
        `Print job failed after ${endTime - startTime}ms:`,
        (error as Error).message,
      );
    }
  } else {
    console.log("No printers available for testing");
  }
}

// Test job status polling (manual)
async function testJobStatusPolling() {
  const printers = getAllPrinters();
  if (printers.length > 0) {
    const printer = printers[0];

    console.log("\nTesting manual job status polling...");

    // Start a print job and get job ID by accessing the native function directly
    const printerNameCString = new TextEncoder().encode(
      printer.getName() + "\0",
    );
    const filePathCString = new TextEncoder().encode("test-document.txt\0");

    const printerNamePtr = Deno.UnsafePointer.of(printerNameCString);
    const filePathPtr = Deno.UnsafePointer.of(filePathCString);

    // This is accessing the internal library, normally you wouldn't do this
    // @ts-ignore - accessing internal lib for demonstration
    const jobId = globalThis.lib?.symbols?.print_file?.(
      printerNamePtr,
      filePathPtr,
      null,
    ) as number;

    if (jobId > 0) {
      console.log(`Started job ${jobId}, polling status...`);

      for (let i = 0; i < 20; i++) {
        const status = getJobStatus(jobId);
        if (status) {
          console.log(
            `Job ${jobId} status: ${status.status} (age: ${status.age_seconds}s)`,
          );
          if (status.status === "completed" || status.status === "failed") {
            break;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }
}

await testAsyncPrinting();
