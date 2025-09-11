// Bun entry point for @printers/printers
// Uses FFI similar to Deno

import { CString, dlopen, FFIType } from "bun:ffi";
import path from "path";

const __dirname = import.meta.dir;

// Determine library path based on platform and architecture
function getLibraryPath() {
  const platform = process.platform;
  const arch = process.arch;

  let libName;
  if (platform === "win32") {
    // Windows ARM64 not supported by Bun, only x64
    libName = "printers_js-x64.dll";
  } else if (platform === "darwin") {
    libName = arch === "x64"
      ? "libprinters_js-x64.dylib"
      : "libprinters_js-arm64.dylib";
  } else if (platform === "linux") {
    libName = arch === "arm64"
      ? "libprinters_js-arm64.so"
      : "libprinters_js-x64.so";
  } else {
    throw new Error(`Unsupported platform: ${platform}-${arch}`);
  }

  return path.join(__dirname, "target", "release", libName);
}

const libPath = getLibraryPath();

// Check if library file exists
try {
  const fs = require('fs');
  if (!fs.existsSync(libPath)) {
    throw new Error(`Library file not found: ${libPath}`);
  }
} catch (e) {
  if (e.message.includes('Library file not found')) {
    throw e;
  }
  // File system error, continue with loading attempt
}

// Load the native library using Bun's FFI
let lib;
try {
  lib = dlopen(libPath, {
  find_printer_by_name: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  get_all_printer_names: {
    args: [],
    returns: FFIType.ptr,
  },
  printer_exists: {
    args: [FFIType.ptr],
    returns: FFIType.i32,
  },
  print_file: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr],
    returns: FFIType.i32,
  },
  get_job_status: {
    args: [FFIType.u32],
    returns: FFIType.ptr,
  },
  cleanup_old_jobs: {
    args: [FFIType.u64],
    returns: FFIType.u32,
  },
  shutdown_library: {
    args: [],
    returns: FFIType.void,
  },
  free_string: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  printer_create: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  printer_free: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  printer_get_name: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  printer_get_system_name: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  printer_get_driver_name: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  printer_get_uri: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  printer_get_port_name: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  printer_get_processor: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  printer_get_data_type: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  printer_get_description: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  printer_get_location: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  printer_get_state: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  printer_get_state_reasons: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  printer_get_is_default: {
    args: [FFIType.ptr],
    returns: FFIType.i32,
  },
  printer_get_is_shared: {
    args: [FFIType.ptr],
    returns: FFIType.i32,
  },
  printer_print_file: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr],
    returns: FFIType.i32,
  },
  });
} catch (e) {
  throw new Error(`Failed to load printer library from ${libPath}: ${e.message}`);
}

// Utility functions for C string conversion
function cString(str) {
  return Buffer.from(str + "\0", "utf8");
}

function readCString(ptr) {
  if (!ptr) return "";
  try {
    const cstring = new CString(ptr);
    const result = cstring.toString();
    lib.symbols.free_string(ptr);
    return result;
  } catch (_e) {
    lib.symbols.free_string(ptr); // Always free even on error
    return "";
  }
}

// Check for simulation mode
const isSimulationMode = process.env.PRINTERS_JS_SIMULATE === "true";

// Printer class
class Printer {
  [x: string]: any;
  constructor(printerPtr) {
    if (!printerPtr) {
      throw new Error("Invalid printer pointer");
    }
    this._ptr = printerPtr;
    this._disposed = false;
  }

  static fromName(name) {
    if (isSimulationMode) {
      // Only return simulated printer for the default simulated name
      if (name === "Simulated Printer") {
        return new Printer(BigInt(1)); // Fake pointer for simulation
      }
      return null; // Return null for non-existent printers
    }

    const namePtr = cString(name);
    const printerPtr = lib.symbols.printer_create(namePtr);
    return printerPtr ? new Printer(printerPtr) : null;
  }

  _checkDisposed() {
    if (this._disposed) {
      throw new Error("Printer has been disposed");
    }
  }

  get name() {
    this._checkDisposed();
    if (isSimulationMode) return "Simulated Printer";
    return readCString(lib.symbols.printer_get_name(this._ptr));
  }

  get systemName() {
    this._checkDisposed();
    if (isSimulationMode) return "SIM001";
    return readCString(lib.symbols.printer_get_system_name(this._ptr));
  }

  get driverName() {
    this._checkDisposed();
    if (isSimulationMode) return "Simulated Driver";
    return readCString(lib.symbols.printer_get_driver_name(this._ptr));
  }

  get uri() {
    this._checkDisposed();
    if (isSimulationMode) return "sim://printer";
    return readCString(lib.symbols.printer_get_uri(this._ptr));
  }

  get portName() {
    this._checkDisposed();
    if (isSimulationMode) return "SIM:";
    return readCString(lib.symbols.printer_get_port_name(this._ptr));
  }

  get processor() {
    this._checkDisposed();
    if (isSimulationMode) return "simprint";
    return readCString(lib.symbols.printer_get_processor(this._ptr));
  }

  get dataType() {
    this._checkDisposed();
    if (isSimulationMode) return "RAW";
    return readCString(lib.symbols.printer_get_data_type(this._ptr));
  }

  get description() {
    this._checkDisposed();
    if (isSimulationMode) return "Simulated printer for testing";
    return readCString(lib.symbols.printer_get_description(this._ptr));
  }

  get location() {
    this._checkDisposed();
    if (isSimulationMode) return "Test Lab";
    return readCString(lib.symbols.printer_get_location(this._ptr));
  }

  get isDefault() {
    this._checkDisposed();
    if (isSimulationMode) return true;
    return lib.symbols.printer_get_is_default(this._ptr) === 1;
  }

  get isShared() {
    this._checkDisposed();
    if (isSimulationMode) return false;
    return lib.symbols.printer_get_is_shared(this._ptr) === 1;
  }

  get state() {
    this._checkDisposed();
    if (isSimulationMode) return "READY";
    return readCString(lib.symbols.printer_get_state(this._ptr));
  }

  get stateReasons() {
    this._checkDisposed();
    if (isSimulationMode) return ["none"];
    const reasonsStr = readCString(
      lib.symbols.printer_get_state_reasons(this._ptr)
    );
    try {
      return JSON.parse(reasonsStr);
    } catch {
      return ["none"];
    }
  }

  exists() {
    this._checkDisposed();
    if (isSimulationMode) return true;
    return printerExists(this.name);
  }

  toString() {
    this._checkDisposed();
    if (isSimulationMode) return "Simulated Printer (Test Mode)";
    return readCString(lib.symbols.printer_to_string(this._ptr));
  }

  equals(other) {
    return this.name === other.name;
  }

  dispose() {
    if (!this._disposed && !isSimulationMode) {
      lib.symbols.printer_free(this._ptr);
      this._disposed = true;
    }
  }

  getName() {
    return this.name;
  }

  async printFile(filePath, jobProperties = {}) {
    this._checkDisposed();

    if (isSimulationMode) {
      console.log(`[SIMULATION] Would print file: ${filePath}`);
      if (Object.keys(jobProperties).length > 0) {
        console.log(`[SIMULATION] Job properties:`, jobProperties);
      }

      // Simulate errors for specific test filenames
      if (filePath.includes("fail-test")) {
        throw new Error("Simulated failure for testing");
      }
      if (
        filePath.includes("nonexistent") ||
        filePath.includes("does_not_exist")
      ) {
        throw new Error("File not found");
      }

      return;
    }

    const filePathPtr = cString(filePath);
    const jobPropsStr = JSON.stringify(jobProperties);
    const jobPropsPtr = cString(jobPropsStr);

    return new Promise<void>((resolve, reject) => {
      const jobId = lib.symbols.printer_print_file(
        this._ptr,
        filePathPtr,
        jobPropsPtr
      );

      if (jobId < 0) {
        reject(new Error(`Print job failed with error code: ${jobId}`));
        return;
      }

      // Poll for job completion
      const pollJob = () => {
        const statusPtr = lib.symbols.get_job_status(jobId);
        if (statusPtr) {
          const statusStr = readCString(statusPtr);
          try {
            const status = JSON.parse(statusStr);
            if (status.status === "completed") {
              resolve();
            } else if (status.status === "failed") {
              reject(new Error(status.error_message || "Print job failed"));
            } else {
              setTimeout(pollJob, 100);
            }
          } catch (_e) {
            reject(new Error("Failed to parse job status"));
          }
        } else {
          reject(new Error("Failed to get job status"));
        }
      };

      setTimeout(pollJob, 100);
    });
  }
}

// Utility functions
export function getAllPrinters() {
  const names = getAllPrinterNames();
  return names.map((name) => Printer.fromName(name)).filter((printer) =>
    printer !== null
  );
}

export function getAllPrinterNames() {
  if (isSimulationMode) {
    return ["Simulated Printer"];
  }

  const namesPtr = lib.symbols.get_all_printer_names();
  if (!namesPtr) return [];

  const namesStr = readCString(namesPtr);
  try {
    return JSON.parse(namesStr);
  } catch {
    return [];
  }
}

export function getPrinterByName(name) {
  return Printer.fromName(name);
}

export function printerExists(name) {
  if (isSimulationMode) return name === "Simulated Printer";
  const namePtr = cString(name);
  return lib.symbols.printer_exists(namePtr) === 1;
}

export function getJobStatus(jobId) {
  if (isSimulationMode) {
    // Only return job status for specific test job IDs, null otherwise
    if (jobId === 1 || jobId === 42) {
      return {
        id: jobId,
        printer_name: "Simulated Printer",
        file_path: "test.pdf",
        status: "completed",
        age_seconds: 1,
      };
    }
    return null; // Return null for non-existent jobs
  }

  const statusPtr = lib.symbols.get_job_status(jobId);
  if (!statusPtr) return null;

  const statusStr = readCString(statusPtr);
  try {
    return JSON.parse(statusStr);
  } catch {
    return null;
  }
}

export function cleanupOldJobs(maxAgeSeconds) {
  if (isSimulationMode) return 0;
  return lib.symbols.cleanup_old_jobs(maxAgeSeconds);
}

export function shutdown() {
  if (!isSimulationMode) {
    lib.symbols.shutdown_library();
  }
}

// Handle process cleanup
process.on("exit", shutdown);
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Export all functions and classes
export { Printer };
