import { getAllPrinters } from "./mod.ts";

const printers = getAllPrinters();
if (printers.length > 0) {
  const printer = printers[0];
  console.log(`Testing printFile with printer: ${printer.getName()}`);
  console.log("Testing with existing file...");

  try {
    await printer.printFile("test-document.txt", {
      copies: "1",
      orientation: "portrait",
    });
    console.log("Print job succeeded!");
  } catch (error) {
    console.log("Print job failed:", (error as Error).message);
  }
} else {
  console.log("No printers available for testing");
}
