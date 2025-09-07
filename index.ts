/**
 * Universal entrypoint for @esimkowitz/printers
 *
 * This module automatically detects the JavaScript runtime and loads
 * the appropriate implementation. Works with Deno, Node.js, and Bun.
 */

// Type declarations for global variables (Deno type checking compatibility)
declare global {
  const process: any;
  const Bun: any;
}

// Runtime detection
const isNode = typeof (globalThis as any).process !== "undefined" && 
  (globalThis as any).process?.versions?.node;
const isBun = typeof (globalThis as any).Bun !== "undefined";
const isDeno = typeof Deno !== "undefined";

// Type definitions (shared across all runtimes)
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

export interface PrinterAPI {
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
  equals(other: PrinterAPI): boolean;
  dispose?(): void;
  getName(): string;
  printFile(
    filePath: string,
    jobProperties?: Record<string, string>,
  ): Promise<void>;
}

// Runtime-specific imports and exports
let printerModule: any;

if (isDeno) {
  // Deno runtime
  printerModule = await import("./deno.ts");
} else if (isBun) {
  // Bun runtime
  printerModule = await import("./bun.js");
} else if (isNode) {
  // Node.js runtime
  const nodeModule = await import("./node.js");
  printerModule = nodeModule;
} else {
  throw new Error(
    "Unsupported JavaScript runtime. This library supports Deno, Node.js, and Bun.",
  );
}

// Re-export all functionality from the runtime-specific module
export const {
  getAllPrinters,
  getAllPrinterNames,
  getPrinterByName,
  printerExists,
  getJobStatus,
  cleanupOldJobs,
  shutdown,
  Printer,
} = printerModule;

// Runtime information
export const runtimeInfo = {
  name: isDeno ? "deno" : isBun ? "bun" : isNode ? "node" : "unknown",
  isDeno,
  isNode,
  isBun,
  version: isDeno
    ? Deno.version.deno
    : isBun
    ? (globalThis as any).Bun.version
    : isNode
    ? (globalThis as any).process.version
    : "unknown",
};

// Simulation mode detection (works across all runtimes)
export const isSimulationMode =
  (isDeno && Deno?.env?.get?.("PRINTERS_JS_SIMULATE") === "true") ||
  (isNode && (globalThis as any).process?.env?.PRINTERS_JS_SIMULATE === "true") ||
  (isBun && (globalThis as any).process?.env?.PRINTERS_JS_SIMULATE === "true");

// Utility function to get typed printer instances
export function getTypedPrinters(): PrinterAPI[] {
  return getAllPrinters() as PrinterAPI[];
}

export function getTypedPrinterByName(name: string): PrinterAPI | null {
  return getPrinterByName(name) as PrinterAPI | null;
}

// Default export for CommonJS compatibility
export default {
  PrintError,
  getAllPrinters,
  getAllPrinterNames,
  getPrinterByName,
  printerExists,
  getJobStatus,
  cleanupOldJobs,
  shutdown,
  Printer,
  runtimeInfo,
  isSimulationMode,
  getTypedPrinters,
  getTypedPrinterByName,
};
