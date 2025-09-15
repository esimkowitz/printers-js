/**
 * Universal cross-runtime printer library
 *
 * This library provides printer functionality for JavaScript runtimes
 * through Node-API bindings, compatible with Node.js, Deno, and Bun.
 *
 * Usage:
 * - Node.js: import { getPrinters } from "@printers/printers"
 * - Deno: import { getPrinters } from "npm:@printers/printers"
 * - Bun: import { getPrinters } from "@printers/printers"
 */

// Type definitions
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

export interface JobStatus {
  id: number;
  printer_name: string;
  file_path: string;
  status: "queued" | "printing" | "completed" | "failed";
  error_message?: string;
  age_seconds: number;
}

export type PrinterState = "idle" | "processing" | "stopped" | "unknown";

export interface Printer {
  name: string;
  systemName?: string;
  driverName?: string;
  uri?: string;
  portName?: string;
  processor?: string;
  dataType?: string;
  description?: string;
  location?: string;
  isDefault?: boolean;
  isShared?: boolean;
  state?: PrinterState;
  stateReasons?: string[];
  exists(): boolean;
  toString(): string;
  equals(other: Printer): boolean;
  dispose?(): void;
  getName(): string;
  printFile(
    filePath: string,
    jobProperties?: Record<string, string>
  ): Promise<void>;
}

export interface PrinterClass {
  fromName(name: string): Printer | null;
  new (): never;
}

export interface RuntimeInfo {
  name: "deno" | "node" | "bun" | "unknown";
  isDeno: boolean;
  isNode: boolean;
  isBun: boolean;
  version: string;
}

// Runtime detection
interface GlobalWithProcess {
  process?: {
    versions?: { node?: string };
    version?: string;
    env?: { PRINTERS_JS_SIMULATE?: string };
    platform?: string;
    arch?: string;
  };
}

interface GlobalWithBun {
  Bun?: { version: string };
}

const isNode =
  typeof (globalThis as GlobalWithProcess).process !== "undefined" &&
  !!(globalThis as GlobalWithProcess).process?.versions?.node;
const isBun = typeof (globalThis as GlobalWithBun).Bun !== "undefined";
const isDeno = typeof (globalThis as any).Deno !== "undefined";

// Simulation mode detection
const simValue = isDeno
  ? typeof (globalThis as any).Deno !== "undefined" &&
    (globalThis as any).Deno.env &&
    typeof (globalThis as any).Deno.env.get === "function"
    ? (globalThis as any).Deno.env.get("PRINTERS_JS_SIMULATE")
    : undefined
  : (globalThis as GlobalWithProcess).process?.env?.PRINTERS_JS_SIMULATE;

export const isSimulationMode: boolean =
  simValue === "true" || simValue === "1";

// Runtime information
export const runtimeInfo: RuntimeInfo = {
  name: isDeno ? "deno" : isBun ? "bun" : isNode ? "node" : "unknown",
  isDeno,
  isNode,
  isBun,
  version: isDeno
    ? typeof (globalThis as any).Deno !== "undefined" &&
      (globalThis as any).Deno.version
      ? (globalThis as any).Deno.version.deno
      : "unknown"
    : isBun
      ? ((globalThis as GlobalWithBun).Bun?.version ?? "unknown")
      : isNode
        ? ((globalThis as GlobalWithProcess).process?.version ?? "unknown")
        : "unknown",
};

// N-API module interfaces
interface NativePrinter {
  name: string;
  systemName?: string;
  driverName?: string;
  uri?: string;
  portName?: string;
  processor?: string;
  dataType?: string;
  description?: string;
  location?: string;
  isDefault?: boolean;
  isShared?: boolean;
  state?: string;
  stateReasons?: string[];
  exists?: () => boolean;
  printFile?: (
    filePath: string,
    jobProperties?: Record<string, string>
  ) => Promise<void>;
  toString?: () => string;
  dispose?: () => void;
}

interface NativeModule {
  getAllPrinterNames(): string[];
  getAllPrinters(): NativePrinter[];
  findPrinterByName(name: string): NativePrinter | null;
  printerExists(name: string): boolean;
  getJobStatus(jobId: number): JobStatus | null;
  cleanupOldJobs(maxAgeSeconds: number): number;
  shutdown(): void;
  printFile(
    printerName: string,
    filePath: string,
    jobProperties?: Record<string, string>
  ): Promise<void>;
  Printer: {
    fromName(name: string): NativePrinter | null;
  };
}

// N-API module loading
let nativeModule: NativeModule;

// Log simulation mode if enabled
if (isSimulationMode) {
  console.log(
    `[SIMULATION] ${runtimeInfo.name} running in simulation mode - no actual printing will occur`
  );
}

// Always load the N-API module - let the backend handle simulation mode
try {
  // Platform detection for N-API module loading
  let platformString: string;

  // Map to npm package names (not NAPI-RS target names)
  const platform = (globalThis as GlobalWithProcess).process?.platform;
  const arch = (globalThis as GlobalWithProcess).process?.arch;

  if (platform === "darwin") {
    if (arch === "x64") {
      platformString = "darwin-x64";
    } else if (arch === "arm64") {
      platformString = "darwin-arm64";
    } else {
      throw new Error(`Unsupported architecture for Darwin: ${arch}`);
    }
  } else if (platform === "win32") {
    if (arch === "x64") {
      platformString = "win32-x64-msvc";
    } else if (arch === "arm64") {
      platformString = "win32-arm64-msvc";
    } else {
      throw new Error(`Unsupported architecture for Windows: ${arch}`);
    }
  } else if (platform === "linux") {
    if (arch === "x64") {
      platformString = "linux-x64-gnu";
    } else if (arch === "arm64") {
      platformString = "linux-arm64-gnu";
    } else {
      throw new Error(`Unsupported architecture for Linux: ${arch}`);
    }
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  // Try to load the platform-specific N-API module using dynamic imports
  // Always use ESM for consistency across all runtimes
  try {
    // For Deno, use npm: prefix for npm packages
    const packageSpecifier = isDeno
      ? `npm:@printers/printers-${platformString}`
      : `@printers/printers-${platformString}`;
    nativeModule = await import(packageSpecifier);
  } catch (importError) {
    // Fallback: try to load from npm directory structure (for local development)
    try {
      nativeModule = await import(`../npm/${platformString}/index.mjs`);
    } catch (fallbackError) {
      throw new Error(
        `Failed to load N-API module for platform ${platformString}. ` +
          `Make sure the platform-specific package is installed. ` +
          `Primary error: ${importError}. Fallback error: ${fallbackError}`
      );
    }
  }
} catch (error) {
  throw new Error(
    `Failed to initialize printer library: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
}

// Wrapper class for consistent API
class PrinterWrapper implements Printer {
  private nativePrinter: NativePrinter;

  constructor(nativePrinter: NativePrinter) {
    this.nativePrinter = nativePrinter;
  }

  get name(): string {
    return this.nativePrinter.name || "";
  }

  get systemName(): string | undefined {
    return this.nativePrinter.systemName;
  }

  get driverName(): string | undefined {
    return this.nativePrinter.driverName;
  }

  get uri(): string | undefined {
    return this.nativePrinter.uri;
  }

  get portName(): string | undefined {
    return this.nativePrinter.portName;
  }

  get processor(): string | undefined {
    return this.nativePrinter.processor;
  }

  get dataType(): string | undefined {
    return this.nativePrinter.dataType;
  }

  get description(): string | undefined {
    return this.nativePrinter.description;
  }

  get location(): string | undefined {
    return this.nativePrinter.location;
  }

  get isDefault(): boolean | undefined {
    return this.nativePrinter.isDefault;
  }

  get isShared(): boolean | undefined {
    return this.nativePrinter.isShared;
  }

  get state(): PrinterState | undefined {
    return (this.nativePrinter.state as PrinterState) || "unknown";
  }

  get stateReasons(): string[] | undefined {
    return this.nativePrinter.stateReasons;
  }

  exists(): boolean {
    return this.nativePrinter.exists ? this.nativePrinter.exists() : true;
  }

  toString(): string {
    return this.nativePrinter.toString
      ? this.nativePrinter.toString()
      : this.name;
  }

  equals(other: Printer): boolean {
    return this.name === other.name;
  }

  dispose(): void {
    if (this.nativePrinter.dispose) {
      this.nativePrinter.dispose();
    }
  }

  getName(): string {
    return this.name;
  }

  async printFile(
    filePath: string,
    jobProperties?: Record<string, string>
  ): Promise<void> {
    if (this.nativePrinter.printFile) {
      await this.nativePrinter.printFile(filePath, jobProperties);
      return;
    }
    throw new Error("Print functionality not available");
  }
}

// Public API functions
export function getAllPrinters(): Printer[] {
  try {
    const printers = nativeModule.getAllPrinters
      ? nativeModule.getAllPrinters()
      : [];
    return printers.map(p => new PrinterWrapper(p));
  } catch (error) {
    console.error("Failed to get all printers:", error);
    return [];
  }
}

export function getAllPrinterNames(): string[] {
  try {
    return nativeModule.getAllPrinterNames
      ? nativeModule.getAllPrinterNames()
      : [];
  } catch (error) {
    console.error("Failed to get printer names:", error);
    return [];
  }
}

export function getPrinterByName(name: string): Printer | null {
  try {
    const nativePrinter = nativeModule.findPrinterByName
      ? nativeModule.findPrinterByName(name)
      : null;
    return nativePrinter ? new PrinterWrapper(nativePrinter) : null;
  } catch (error) {
    console.error(`Failed to get printer ${name}:`, error);
    return null;
  }
}

export function printerExists(name: string): boolean {
  try {
    return nativeModule.printerExists
      ? nativeModule.printerExists(name)
      : false;
  } catch (error) {
    console.error(`Failed to check if printer ${name} exists:`, error);
    return false;
  }
}

export function getJobStatus(jobId: number): JobStatus | null {
  try {
    return nativeModule.getJobStatus ? nativeModule.getJobStatus(jobId) : null;
  } catch (error) {
    console.error(`Failed to get job status for ${jobId}:`, error);
    return null;
  }
}

export function cleanupOldJobs(maxAgeMs: number = 30000): number {
  try {
    const maxAgeSeconds = Math.floor(maxAgeMs / 1000);
    return nativeModule.cleanupOldJobs
      ? nativeModule.cleanupOldJobs(maxAgeSeconds)
      : 0;
  } catch (error) {
    console.error("Failed to cleanup old jobs:", error);
    return 0;
  }
}

export function shutdown(): void {
  try {
    if (nativeModule.shutdown) {
      nativeModule.shutdown();
    }
  } catch (error) {
    console.error("Failed to shutdown:", error);
  }
}

// Printer class for static methods
export const PrinterConstructor: PrinterClass = {
  fromName: (name: string) => getPrinterByName(name),
  // @ts-expect-error: Prevent direct construction
  new: () => {
    throw new Error("Use PrinterConstructor.fromName() instead");
  },
};

// Legacy exports for backward compatibility
export const findPrinter = getPrinterByName;
export const getDefaultPrinter = () =>
  getAllPrinters().find(p => p.isDefault) || null;
export const createPrintJob = async (
  printerName: string,
  filePath: string,
  options?: Record<string, string>
): Promise<void> => {
  const printer = getPrinterByName(printerName);
  if (!printer) {
    throw new Error(`Printer not found: ${printerName}`);
  }
  return await printer.printFile(filePath, options);
};
