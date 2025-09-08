import { join } from "@std/path";

/**
 * Error codes for printing operations
 */
export enum PrintError {
  InvalidParams = 1,
  InvalidPrinterName = 2,
  InvalidFilePath = 3,
  InvalidJson = 4,
  InvalidJsonEncoding = 5,
  PrinterNotFound = 6,
  FileNotFound = 7,
  SimulatedFailure = 8,
}

// Job status interface
export interface JobStatus {
  id: number;
  printer_name: string;
  file_path: string;
  status: "queued" | "printing" | "completed" | "failed";
  error_message?: string;
  age_seconds: number;
}

/**
 * Printer state enum
 */
export type PrinterState = "idle" | "processing" | "stopped" | "unknown";

// Library loading - multi-platform binary selection
const LIB_EXTENSIONS = { windows: "dll", darwin: "dylib" } as const;

function getLibraryName(): string {
  const { os } = Deno.build;
  const extension = LIB_EXTENSIONS[os as keyof typeof LIB_EXTENSIONS] ?? "so";

  // For now, we build universal binaries without architecture suffixes
  // In the future, we could add architecture-specific builds if needed

  // Construct library name based on platform
  if (os === "windows") {
    return `deno_printers.${extension}`;
  } else {
    return `libdeno_printers.${extension}`;
  }
}

const currentDir = new URL(".", import.meta.url).pathname;
const cleanDir = Deno.build.os === "windows" && currentDir.startsWith("/")
  ? currentDir.slice(1)
  : currentDir;

const libPath = join(cleanDir, "target", "release", getLibraryName());

// Debug logging for CI troubleshooting
if (Deno.env.get("PRINTERS_JS_SIMULATE") === "true") {
  console.log(`[DEBUG] Loading FFI library from: ${libPath}`);
  console.log(`[DEBUG] Current working directory: ${Deno.cwd()}`);
  console.log(`[DEBUG] Expected library name: ${getLibraryName()}`);
}

// FFI Utilities
function toCString(str: string): Uint8Array {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(str);
  const cString = new Uint8Array(encoded.length + 1);
  cString.set(encoded);
  cString[encoded.length] = 0; // null terminator
  return cString;
}

function fromCString(ptr: Deno.PointerValue): string | null {
  if (ptr === null) return null;
  const view = new Deno.UnsafePointerView(ptr);
  return view.getCString();
}

function withCString<T>(str: string, fn: (ptr: Deno.PointerValue) => T): T {
  const cString = toCString(str);
  const ptr = Deno.UnsafePointer.of(cString);
  return fn(ptr);
}

function withCStringResult<T>(
  fn: () => Deno.PointerValue,
  transform: (str: string | null) => T,
): T {
  const resultPtr = fn();
  const result = fromCString(resultPtr);
  if (resultPtr !== null) {
    lib.symbols.free_string(resultPtr);
  }
  return transform(result);
}

function getErrorMessage(errorCode: number): string {
  const errorMessages: Record<number, string> = {
    [PrintError.InvalidParams]: "Invalid parameters",
    [PrintError.InvalidPrinterName]: "Invalid printer name encoding",
    [PrintError.InvalidFilePath]: "Invalid file path encoding",
    [PrintError.InvalidJson]: "Invalid job properties JSON",
    [PrintError.InvalidJsonEncoding]: "Invalid job properties JSON encoding",
    [PrintError.PrinterNotFound]: "Printer not found",
    [PrintError.FileNotFound]: "File not found",
    [PrintError.SimulatedFailure]: "Simulated failure for testing",
  };
  return errorMessages[errorCode] || `Unknown error (code: ${errorCode})`;
}

function isErrorCode(result: number): boolean {
  return Object.values(PrintError).includes(result as PrintError);
}

// Load the dynamic library
// deno-lint-ignore no-explicit-any
let lib: Deno.DynamicLibrary<any>;
try {
  lib = Deno.dlopen(libPath, {
    find_printer_by_name: {
      parameters: ["pointer"],
      result: "pointer",
    },
    printer_exists: {
      parameters: ["pointer"],
      result: "i32",
    },
    free_string: {
      parameters: ["pointer"],
      result: "void",
    },
    get_all_printer_names: {
      parameters: [],
      result: "pointer",
    },
    print_file: {
      parameters: ["pointer", "pointer", "pointer"],
      result: "i32",
    },
    get_job_status: {
      parameters: ["u32"],
      result: "pointer",
    },
    cleanup_old_jobs: {
      parameters: ["u64"],
      result: "u32",
    },
    // New Printer struct functions
    printer_create: {
      parameters: ["pointer"],
      result: "pointer",
    },
    printer_free: {
      parameters: ["pointer"],
      result: "void",
    },
    printer_get_name: {
      parameters: ["pointer"],
      result: "pointer",
    },
    printer_get_system_name: {
      parameters: ["pointer"],
      result: "pointer",
    },
    printer_get_driver_name: {
      parameters: ["pointer"],
      result: "pointer",
    },
    printer_get_uri: {
      parameters: ["pointer"],
      result: "pointer",
    },
    printer_get_port_name: {
      parameters: ["pointer"],
      result: "pointer",
    },
    printer_get_processor: {
      parameters: ["pointer"],
      result: "pointer",
    },
    printer_get_data_type: {
      parameters: ["pointer"],
      result: "pointer",
    },
    printer_get_description: {
      parameters: ["pointer"],
      result: "pointer",
    },
    printer_get_location: {
      parameters: ["pointer"],
      result: "pointer",
    },
    printer_get_is_default: {
      parameters: ["pointer"],
      result: "i32",
    },
    printer_get_is_shared: {
      parameters: ["pointer"],
      result: "i32",
    },
    printer_get_state: {
      parameters: ["pointer"],
      result: "pointer",
    },
    printer_get_state_reasons: {
      parameters: ["pointer"],
      result: "pointer",
    },
    printer_print_file: {
      parameters: ["pointer", "pointer", "pointer"],
      result: "i32",
    },
    shutdown_library: {
      parameters: [],
      result: "void",
    },
    force_simulation_mode: {
      parameters: ["i32"],
      result: "void",
    },
  });
} catch (error) {
  console.error(`Failed to load FFI library at ${libPath}:`, error);
  try {
    const stats = Deno.statSync(libPath);
    console.error(`Library exists: true (size: ${stats.size} bytes)`);
  } catch {
    console.error(`Library exists: false`);
  }
  console.error(`Current working directory: ${Deno.cwd()}`);
  console.error(`Expected library path: ${libPath}`);
  throw new Error(`FFI library loading failed: ${error}`);
}

// Force simulation mode if the environment variable is set
// This is a workaround for CI environments where env vars don't propagate to FFI libraries
if (Deno.env.get("PRINTERS_JS_SIMULATE") === "true") {
  console.log("[DENO DEBUG] Forcing simulation mode in Rust library");
  lib.symbols.force_simulation_mode(1);
}

/**
 * Shutdown the library and cleanup all background threads
 * This should be called before the process exits to prevent segfaults
 */
export function shutdown(): void {
  lib.symbols.shutdown_library();
}

// Auto cleanup on process exit and unload
function setupCleanupHandlers(): void {
  // Handle process exit
  if (typeof Deno !== "undefined") {
    const originalExit = Deno.exit;
    Deno.exit = function (code?: number): never {
      shutdown();
      return originalExit.call(Deno, code);
    };

    // Handle unload events
    globalThis.addEventListener?.("beforeunload", shutdown);
    globalThis.addEventListener?.("unload", shutdown);
  }

  // Handle process signals (Node.js style)
  interface NodeProcess {
    on?: (signal: string, callback: () => void) => void;
    exit: (code?: number) => never;
  }

  const globalWithProcess = globalThis as typeof globalThis & {
    process?: NodeProcess;
  };

  if (typeof globalWithProcess.process !== "undefined") {
    const process = globalWithProcess.process;
    ["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
      process.on?.(signal, () => {
        shutdown();
        process.exit(0);
      });
    });
  }
}

// Set up cleanup handlers
setupCleanupHandlers();

/**
 * Get the status of a print job
 * @param jobId The job ID returned from printFile
 * @returns Job status object or null if not found
 */
export function getJobStatus(jobId: number): JobStatus | null {
  return withCStringResult(
    () => lib.symbols.get_job_status(jobId) as Deno.PointerValue,
    (jsonString) => {
      if (jsonString === null) return null;
      try {
        return JSON.parse(jsonString) as JobStatus;
      } catch {
        return null;
      }
    },
  );
}

/**
 * Clean up old completed/failed jobs
 * @param maxAgeSeconds Maximum age in seconds for completed/failed jobs
 * @returns Number of jobs cleaned up
 */
export function cleanupOldJobs(maxAgeSeconds: number): number {
  return lib.symbols.cleanup_old_jobs(BigInt(maxAgeSeconds)) as number;
}

// Global FinalizationRegistry for automatic cleanup
const printerRegistry = new FinalizationRegistry((ptr: Deno.PointerValue) => {
  if (ptr) {
    lib.symbols.printer_free(ptr);
  }
});

/**
 * Printer class representing a system printer with comprehensive metadata and printing capabilities.
 *
 * Printer instances wrap native Rust structures and automatically manage memory using FinalizationRegistry.
 * Create instances using `Printer.fromName()` or `getPrinterByName()`.
 *
 * All properties are implemented as getters that call into the native layer on each access,
 * ensuring you always get current information.
 *
 * @example
 * ```typescript
 * const printer = getPrinterByName("My Printer");
 * if (printer) {
 *   console.log(`Name: ${printer.name}`);
 *   console.log(`Driver: ${printer.driverName}`);
 *   console.log(`State: ${printer.state}`);
 *   console.log(`Default: ${printer.isDefault}`);
 *
 *   await printer.printFile("document.pdf", { copies: "2" });
 * }
 * ```
 */
export class Printer {
  private ptr: Deno.PointerValue;
  private disposed = false;

  /**
   * Private constructor - use Printer.fromName() to create instances
   * @param ptr Pointer to the native Printer struct
   */
  private constructor(ptr: Deno.PointerValue) {
    if (!ptr || ptr === null) {
      throw new Error("Invalid printer pointer");
    }
    this.ptr = ptr;
    // Register for automatic cleanup
    printerRegistry.register(this, ptr, this);
  }

  /**
   * Create a Printer instance from a printer name.
   *
   * This is the preferred way to create Printer instances. The constructor is private.
   *
   * @param name The name of the printer to find
   * @returns A Printer instance if found, null if not found or name is invalid
   * @example
   * ```typescript
   * const printer = Printer.fromName("Microsoft Print to PDF");
   * if (printer) {
   *   console.log(`Found: ${printer.name}`);
   * } else {
   *   console.log("Printer not found");
   * }
   * ```
   */
  static fromName(name: string): Printer | null {
    return withCString(name, (namePtr) => {
      const ptr = lib.symbols.printer_create(namePtr) as Deno.PointerValue;
      if (!ptr || ptr === null) {
        return null;
      }
      return new Printer(ptr);
    });
  }

  /**
   * Manually release the printer's native resources.
   *
   * This is optional - the FinalizationRegistry will automatically clean up resources
   * when the instance is garbage collected. However, calling dispose() allows for
   * immediate resource release.
   *
   * This method is idempotent - it's safe to call multiple times.
   * After disposal, accessing any property will throw an error.
   *
   * @example
   * ```typescript
   * const printer = getPrinterByName("My Printer");
   * if (printer) {
   *   console.log(printer.name); // Works fine
   *
   *   printer.dispose();
   *
   *   // This will throw an error
   *   try {
   *     console.log(printer.name);
   *   } catch (e) {
   *     console.log("Error:", e instanceof Error ? e.message : String(e)); // "Printer instance has been disposed"
   *   }
   * }
   * ```
   */
  dispose(): void {
    if (!this.disposed && this.ptr) {
      lib.symbols.printer_free(this.ptr);
      this.ptr = null;
      this.disposed = true;
      // Unregister from finalization registry
      printerRegistry.unregister(this);
    }
  }

  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw new Error("Printer instance has been disposed");
    }
  }

  private getStringField(
    getter: (ptr: Deno.PointerValue) => Deno.PointerValue,
  ): string {
    this.ensureNotDisposed();
    return withCStringResult(
      () => getter(this.ptr),
      (result) => result || "",
    );
  }

  exists(): boolean {
    this.ensureNotDisposed();
    // A printer created via printer_create always exists
    return true;
  }

  /**
   * The display name of the printer.
   * This is typically what users see in print dialogs.
   */
  get name(): string {
    return this.getStringField((ptr) =>
      lib.symbols.printer_get_name(ptr) as Deno.PointerValue
    );
  }

  /**
   * The system-level name of the printer.
   * This may be different from the display name and is used internally by the OS.
   */
  get systemName(): string {
    return this.getStringField((ptr) =>
      lib.symbols.printer_get_system_name(ptr) as Deno.PointerValue
    );
  }

  /**
   * The name of the printer driver.
   */
  get driverName(): string {
    return this.getStringField((ptr) =>
      lib.symbols.printer_get_driver_name(ptr) as Deno.PointerValue
    );
  }

  /**
   * The URI of the printer (if available).
   * May be empty for local printers.
   */
  get uri(): string {
    return this.getStringField((ptr) =>
      lib.symbols.printer_get_uri(ptr) as Deno.PointerValue
    );
  }

  /**
   * The port name used by the printer.
   */
  get portName(): string {
    return this.getStringField((ptr) =>
      lib.symbols.printer_get_port_name(ptr) as Deno.PointerValue
    );
  }

  /**
   * The print processor used by the printer.
   */
  get processor(): string {
    return this.getStringField((ptr) =>
      lib.symbols.printer_get_processor(ptr) as Deno.PointerValue
    );
  }

  /**
   * The default data type for print jobs.
   */
  get dataType(): string {
    return this.getStringField((ptr) =>
      lib.symbols.printer_get_data_type(ptr) as Deno.PointerValue
    );
  }

  /**
   * Optional description of the printer.
   */
  get description(): string {
    return this.getStringField((ptr) =>
      lib.symbols.printer_get_description(ptr) as Deno.PointerValue
    );
  }

  /**
   * Physical location description of the printer.
   */
  get location(): string {
    return this.getStringField((ptr) =>
      lib.symbols.printer_get_location(ptr) as Deno.PointerValue
    );
  }

  /**
   * Whether this is the default printer for the system.
   */
  get isDefault(): boolean {
    this.ensureNotDisposed();
    return (lib.symbols.printer_get_is_default(this.ptr) as number) === 1;
  }

  /**
   * Whether this printer is shared on the network.
   */
  get isShared(): boolean {
    this.ensureNotDisposed();
    return (lib.symbols.printer_get_is_shared(this.ptr) as number) === 1;
  }

  /**
   * Current state of the printer.
   */
  get state(): PrinterState {
    return this.getStringField((ptr) =>
      lib.symbols.printer_get_state(ptr) as Deno.PointerValue
    ) as PrinterState;
  }

  /**
   * Array of state reason strings describing any issues.
   */
  get stateReasons(): string[] {
    this.ensureNotDisposed();
    return withCStringResult(
      () =>
        lib.symbols.printer_get_state_reasons(this.ptr) as Deno.PointerValue,
      (jsonString) => {
        if (!jsonString) return [];
        try {
          return JSON.parse(jsonString) as string[];
        } catch {
          return [];
        }
      },
    );
  }

  /**
   * Backward compatibility methods
   */
  getName(): string {
    return this.name;
  }

  toString(): string {
    const fields: string[] = [
      `name: ${this.name}`,
      `systemName: ${this.systemName}`,
      `driver: ${this.driverName}`,
      `isDefault: ${this.isDefault}`,
      `isShared: ${this.isShared}`,
      `state: ${this.state}`,
    ];

    // Add optional fields if they have values
    if (this.uri) fields.push(`uri: ${this.uri}`);
    if (this.portName && this.portName !== "nul:") {
      fields.push(`port: ${this.portName}`);
    }
    if (this.description) fields.push(`description: ${this.description}`);
    if (this.location) fields.push(`location: ${this.location}`);
    if (this.processor && this.processor !== "winprint") {
      fields.push(`processor: ${this.processor}`);
    }
    if (this.dataType && this.dataType !== "RAW") {
      fields.push(`dataType: ${this.dataType}`);
    }

    const stateReasons = this.stateReasons;
    if (stateReasons.length > 0 && stateReasons[0] !== "none") {
      fields.push(`stateReasons: [${stateReasons.join(", ")}]`);
    }

    return `Printer { ${fields.join(", ")} }`;
  }

  equals(other: Printer): boolean {
    return this.name === other.name;
  }

  /**
   * Print a file using this printer
   * @param filePath Path to the file to print
   * @param jobProperties Optional job properties (copies, orientation, etc.)
   * @returns Promise that resolves when printing succeeds or rejects with error
   */
  printFile(
    filePath: string,
    jobProperties?: Record<string, string>,
  ): Promise<void> {
    this.ensureNotDisposed();

    return new Promise((resolve, reject) => {
      // Convert parameters to C strings
      const filePathCString = toCString(filePath);

      let jobPropertiesCString: Uint8Array | null = null;
      if (jobProperties) {
        const jsonString = JSON.stringify(jobProperties);
        jobPropertiesCString = toCString(jsonString);
      }

      // Get pointers
      const filePathPtr = Deno.UnsafePointer.of(filePathCString);
      const jobPropertiesPtr = jobPropertiesCString
        ? Deno.UnsafePointer.of(jobPropertiesCString)
        : null;

      // Call the native function to start the print job
      const result = lib.symbols.printer_print_file(
        this.ptr,
        filePathPtr,
        jobPropertiesPtr,
      ) as number;

      // Handle immediate errors
      if (isErrorCode(result)) {
        const errorMessage = getErrorMessage(result);
        reject(new Error(errorMessage));
        return;
      }

      // Result is a job ID, start polling for job completion
      const jobId = result;
      const pollInterval = 250; // Poll every 250ms
      const maxPollTime = 30000; // Max 30 seconds
      let totalTime = 0;

      const poll = () => {
        const status = getJobStatus(jobId);

        if (!status) {
          reject(new Error("Job not found"));
          return;
        }

        switch (status.status) {
          case "completed":
            resolve();
            return;
          case "failed":
            reject(new Error(status.error_message || "Print job failed"));
            return;
          case "queued":
          case "printing":
            // Job still in progress
            totalTime += pollInterval;
            if (totalTime >= maxPollTime) {
              reject(new Error("Print job timed out"));
              return;
            }
            setTimeout(poll, pollInterval);
            break;
        }
      };

      // Start polling
      setTimeout(poll, pollInterval);
    });
  }
}

/**
 * Get a printer by its name
 * @param name The name of the printer to find
 * @returns A Printer object if found, null if not found
 */
export function getPrinterByName(name: string): Printer | null {
  return Printer.fromName(name);
}

/**
 * Check if a printer exists by name
 * @param name The name of the printer to check
 * @returns true if the printer exists, false otherwise
 */
export function printerExists(name: string): boolean {
  return withCString(
    name,
    (ptr) => lib.symbols.printer_exists(ptr) as number === 1,
  );
}

/**
 * Get all available printer names
 * @returns Array of printer names
 */
export function getAllPrinterNames(): string[] {
  console.log("[DENO DEBUG] Calling getAllPrinterNames()");
  return withCStringResult(
    () => {
      console.log(
        "[DENO DEBUG] About to call lib.symbols.get_all_printer_names()",
      );
      const result = lib.symbols.get_all_printer_names() as Deno.PointerValue;
      console.log("[DENO DEBUG] FFI call returned:", result);
      return result;
    },
    (jsonString) => {
      console.log("[DENO DEBUG] Received JSON string:", jsonString);
      if (jsonString === null) {
        console.log("[DENO DEBUG] JSON string is null, returning empty array");
        return [];
      }
      try {
        const parsed = JSON.parse(jsonString) as string[];
        console.log("[DENO DEBUG] Parsed JSON successfully:", parsed);
        return parsed;
      } catch (error) {
        console.log("[DENO DEBUG] Failed to parse JSON:", error);
        return [];
      }
    },
  );
}

/**
 * Get all available printers as Printer objects
 * @returns Array of Printer objects
 */
export function getAllPrinters(): Printer[] {
  const names = getAllPrinterNames();
  return names.map((name) => Printer.fromName(name)).filter((p): p is Printer =>
    p !== null
  );
}

/** @internal - Do not use directly */
export function freeString(ptr: Deno.PointerValue): void {
  lib.symbols.free_string(ptr);
}

// Example usage when run directly
if (import.meta.main) {
  console.log("Available printers:");
  const printers = getAllPrinters();
  console.log(printers.map((p) => p.toString()));

  if (printers.length > 0) {
    const firstPrinter = printers[0];
    console.log(`\n=== Testing Printer: ${firstPrinter.name} ===`);

    // Test all getter properties
    console.log(`Name: ${firstPrinter.name}`);
    console.log(`System Name: ${firstPrinter.systemName}`);
    console.log(`Driver Name: ${firstPrinter.driverName}`);
    console.log(`URI: ${firstPrinter.uri}`);
    console.log(`Port Name: ${firstPrinter.portName}`);
    console.log(`Processor: ${firstPrinter.processor}`);
    console.log(`Data Type: ${firstPrinter.dataType}`);
    console.log(`Description: ${firstPrinter.description}`);
    console.log(`Location: ${firstPrinter.location}`);
    console.log(`Is Default: ${firstPrinter.isDefault}`);
    console.log(`Is Shared: ${firstPrinter.isShared}`);
    console.log(`State: ${firstPrinter.state}`);
    console.log(`State Reasons: ${JSON.stringify(firstPrinter.stateReasons)}`);

    // Test backward compatibility method
    console.log(`\n=== Backward Compatibility ===`);
    console.log(`printer.getName() method: ${firstPrinter.getName()}`);
    console.log(`printer.exists(): ${firstPrinter.exists()}`);

    // Test toString with all fields
    console.log(`\n=== Full toString representation ===`);
    console.log(firstPrinter.toString());

    // Test memory management - create and dispose
    console.log(`\n=== Memory Management Test ===`);
    const tempPrinter = getPrinterByName(firstPrinter.name);
    if (tempPrinter) {
      console.log(`Created temp printer: ${tempPrinter.name}`);
      tempPrinter.dispose();
      console.log("Disposed temp printer");

      // This should throw an error
      try {
        console.log(tempPrinter.name);
        console.log("ERROR: Should have thrown after dispose!");
      } catch (e) {
        console.log(
          `Correctly threw error after dispose: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }
    }

    // Example of printing (will fail since file doesn't exist)
    console.log(`\n=== Testing printFile ===`);
    firstPrinter.printFile("nonexistent.txt", {
      copies: "1",
      orientation: "portrait",
    })
      .then(() => console.log("Print job succeeded"))
      .catch((error) => console.log(`Print job failed: ${error.message}`));
  }

  console.log(`\n=== Testing non-existent printer ===`);
  const nonExistent = getPrinterByName("NonExistentPrinter123");
  console.log(`Non-existent printer: ${nonExistent?.toString() ?? "null"}`);
  console.log(
    `Non-existent printer exists: ${printerExists("NonExistentPrinter123")}`,
  );
}
