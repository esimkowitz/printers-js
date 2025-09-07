// Node.js API wrapper for @printers/printers
// Provides the same API as the Deno version

// Check for simulation mode
const isSimulationMode = process.env.PRINTERS_JS_SIMULATE === "true";

let nativeModule;
if (isSimulationMode) {
  // Use simulation mode - provide mock implementations
  console.log("[SIMULATION] Node.js running in simulation mode - no actual printing will occur");
  nativeModule = {
    getAllPrinterNames: () => ["Simulated Printer"],
    getAllPrinters: () => [{ name: "Simulated Printer", systemName: "SIM001", driverName: "Simulated Driver" }],
    findPrinterByName: (name) => name === "Simulated Printer" ? { name: "Simulated Printer" } : null,
    printerExists: (name) => name === "Simulated Printer",
    getJobStatus: (jobId) => jobId === 1 ? { id: jobId, status: "completed" } : null,
    cleanupOldJobs: () => 0,
    shutdown: () => {},
    printFile: async (printerName, filePath, jobProperties) => {
      console.log(`[SIMULATION] Would print file: ${filePath} to ${printerName}`);
      if (jobProperties && Object.keys(jobProperties).length > 0) {
        console.log(`[SIMULATION] Job properties:`, jobProperties);
      }
      if (filePath.includes("fail-test")) {
        throw new Error("Simulated failure for testing");
      }
      if (filePath.includes("nonexistent") || filePath.includes("does_not_exist")) {
        throw new Error("File not found");
      }
    },
    PrintErrorCode: {}
  };
} else {
  // Try to load the real N-API module
  try {
    nativeModule = require("./napi/index.js");
  } catch (error) {
    throw new Error(`Failed to load N-API module: ${error.message}. Try running with PRINTERS_JS_SIMULATE=true for simulation mode.`);
  }
}

// Wrapper class that provides the same API as the Deno Printer class
class PrinterWrapper {
  constructor(nativePrinter) {
    this._native = nativePrinter;
  }

  static fromName(name) {
    const nativePrinter = nativeModule.findPrinterByName(name);
    return nativePrinter ? new PrinterWrapper(nativePrinter) : null;
  }

  get name() {
    return this._native.name || "Simulated Printer";
  }

  get systemName() {
    return this._native.systemName || "SIM001";
  }

  get driverName() {
    return this._native.driverName || "Simulated Driver";
  }

  get uri() {
    return this._native.uri || "sim://printer";
  }

  get portName() {
    return this._native.portName || "SIM:";
  }

  get processor() {
    return this._native.processor || "simprint";
  }

  get dataType() {
    return this._native.dataType || "RAW";
  }

  get description() {
    return this._native.description || "Simulated printer for testing";
  }

  get location() {
    return this._native.location || "Test Lab";
  }

  get isDefault() {
    return this._native.isDefault !== undefined ? this._native.isDefault : true;
  }

  get isShared() {
    return this._native.isShared !== undefined ? this._native.isShared : false;
  }

  get state() {
    return this._native.state || "READY";
  }

  get stateReasons() {
    return this._native.stateReasons || ["none"];
  }

  exists() {
    return nativeModule.printerExists(this.name);
  }

  toString() {
    return this._native.toString();
  }

  equals(other) {
    return this.name === other.name;
  }

  dispose() {
    if (this._native && this._native.dispose) {
      this._native.dispose();
    }
  }

  getName() {
    return this.name;
  }

  async printFile(filePath, jobProperties = {}) {
    return await nativeModule.printFile(this.name, filePath, jobProperties);
  }
}

// Wrapper functions that match the Deno API
function getAllPrinters() {
  const nativePrinters = nativeModule.getAllPrinters();
  return nativePrinters.map((printer) => new PrinterWrapper(printer));
}

function getAllPrinterNames() {
  return nativeModule.getAllPrinterNames();
}

function getPrinterByName(name) {
  return PrinterWrapper.fromName(name);
}

function printerExists(name) {
  return nativeModule.printerExists(name);
}

function getJobStatus(jobId) {
  return nativeModule.getJobStatus(jobId);
}

function cleanupOldJobs(maxAgeSeconds) {
  return nativeModule.cleanupOldJobs(maxAgeSeconds);
}

function shutdown() {
  return nativeModule.shutdown();
}

// Handle process cleanup
process.on("exit", shutdown);
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Export with the same API as Deno version
module.exports = {
  Printer: PrinterWrapper,
  getAllPrinters,
  getAllPrinterNames,
  getPrinterByName,
  printerExists,
  getJobStatus,
  cleanupOldJobs,
  shutdown,
  PrintErrorCode: nativeModule.PrintErrorCode,
};
