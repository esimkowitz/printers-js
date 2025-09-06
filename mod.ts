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

// Library loading - simplified platform detection
const LIB_EXTENSIONS = { windows: "dll", darwin: "dylib" } as const;
const libExtension =
  LIB_EXTENSIONS[Deno.build.os as keyof typeof LIB_EXTENSIONS] ?? "so";

const currentDir = new URL(".", import.meta.url).pathname;
const cleanDir = Deno.build.os === "windows" && currentDir.startsWith("/")
  ? currentDir.slice(1)
  : currentDir;

const libPath = join(
  cleanDir,
  "target",
  "release",
  `deno_printers.${libExtension}`,
);

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
  };
  return errorMessages[errorCode] || `Unknown error (code: ${errorCode})`;
}

function isErrorCode(result: number): boolean {
  return Object.values(PrintError).includes(result as PrintError);
}

// Load the dynamic library
const lib = Deno.dlopen(libPath, {
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
});

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

/**
 * Printer class with methods for printer operations
 */
export class Printer {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  exists(): boolean {
    return printerExists(this.name);
  }
  getName(): string {
    return this.name;
  }
  toString(): string {
    return this.name;
  }
  equals(other: Printer): boolean {
    return this.name === other.name;
  }
  toJSON() {
    return { name: this.name };
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
    return new Promise((resolve, reject) => {
      // Convert parameters to C strings
      const printerNameCString = toCString(this.name);
      const filePathCString = toCString(filePath);

      let jobPropertiesCString: Uint8Array | null = null;
      if (jobProperties) {
        const jsonString = JSON.stringify(jobProperties);
        jobPropertiesCString = toCString(jsonString);
      }

      // Get pointers
      const printerNamePtr = Deno.UnsafePointer.of(printerNameCString);
      const filePathPtr = Deno.UnsafePointer.of(filePathCString);
      const jobPropertiesPtr = jobPropertiesCString
        ? Deno.UnsafePointer.of(jobPropertiesCString)
        : null;

      // Call the native function to start the print job
      const result = lib.symbols.print_file(
        printerNamePtr,
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
  return withCString(name, (ptr) => {
    return withCStringResult(
      () => lib.symbols.find_printer_by_name(ptr) as Deno.PointerValue,
      (result) => result ? new Printer(result) : null,
    );
  });
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
  return withCStringResult(
    () => lib.symbols.get_all_printer_names() as Deno.PointerValue,
    (jsonString) => {
      if (jsonString === null) return [];
      try {
        return JSON.parse(jsonString) as string[];
      } catch {
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
  return names.map((name) => new Printer(name));
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
    console.log(`\nFirst printer: ${firstPrinter.getName()}`);
    console.log(`Printer exists: ${firstPrinter.exists()}`);

    // Also test getting by name
    const foundPrinter = getPrinterByName(firstPrinter.getName());
    console.log(`Found printer by name: ${foundPrinter?.toString() ?? "null"}`);

    // Example of printing (will fail since file doesn't exist)
    console.log(`\nTesting printFile with non-existent file:`);
    firstPrinter.printFile("nonexistent.txt", {
      copies: "1",
      orientation: "portrait",
    })
      .then(() => console.log("Print job succeeded"))
      .catch((error) => console.log(`Print job failed: ${error.message}`));
  }

  console.log(`\nTesting non-existent printer:`);
  const nonExistent = getPrinterByName("NonExistentPrinter123");
  console.log(`Non-existent printer: ${nonExistent?.toString() ?? "null"}`);
  console.log(
    `Non-existent printer exists: ${printerExists("NonExistentPrinter123")}`,
  );
}
