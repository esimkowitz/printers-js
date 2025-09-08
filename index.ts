/**
 * Universal entrypoint for @printers/printers
 *
 * This module automatically detects the JavaScript runtime and loads
 * the appropriate implementation. Works with Deno, Node.js, and Bun.
 */

// Runtime detection helpers

// Runtime detection
const isNode: boolean = typeof (globalThis as any).process !== "undefined" &&
  (globalThis as any).process?.versions?.node;
const isBun: boolean = typeof (globalThis as any).Bun !== "undefined";
// @ts-expect-error: Deno namespace exists
const isDeno: boolean = typeof Deno !== "undefined";

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
    jobProperties?: Record<string, string>,
  ): Promise<void>;
}

// Static methods interface for Printer class
export interface PrinterClass {
  /**
   * Create a Printer instance from a printer name
   * @param name The name of the printer to find
   * @returns A Printer instance if found, null if not found or name is invalid
   */
  fromName(name: string): Printer | null;
  new(): never; // Prevent direct construction
}

// Runtime information interface
export interface RuntimeInfo {
  name: "deno" | "node" | "bun" | "unknown";
  isDeno: boolean;
  isNode: boolean;
  isBun: boolean;
  version: string;
}

// Runtime-specific imports and exports
let printerModule: any;

if (isDeno) {
  // Deno runtime
  printerModule = await import("./deno.ts");
} else if (isBun) {
  // Bun runtime - use dynamic string to prevent type checking
  const bunPath = "./bun" + ".ts";
  printerModule = await import(bunPath);
} else if (isNode) {
  // Node.js runtime - use dynamic string to prevent type checking
  const nodePath = "./node" + ".ts";
  const nodeModule = await import(nodePath);
  printerModule = nodeModule;
} else {
  throw new Error(
    "Unsupported JavaScript runtime. This library supports Deno, Node.js, and Bun.",
  );
}

// Re-export all functionality from the runtime-specific module with proper typing
export const getAllPrinters: () => Printer[] = printerModule.getAllPrinters;
export const getAllPrinterNames: () => string[] = printerModule.getAllPrinterNames;
export const getPrinterByName: (name: string) => Printer | null = printerModule.getPrinterByName;
export const printerExists: (name: string) => boolean = printerModule.printerExists;
export const getJobStatus: (jobId: number) => JobStatus | null = printerModule.getJobStatus;
export const cleanupOldJobs: (maxAgeMs?: number) => Promise<number> = printerModule.cleanupOldJobs;
export const shutdown: () => Promise<void> = printerModule.shutdown;
export const PrinterConstructor: PrinterClass = printerModule.Printer;

// Runtime information
export const runtimeInfo: RuntimeInfo = {
  name: isDeno ? "deno" : isBun ? "bun" : isNode ? "node" : "unknown",
  isDeno,
  isNode,
  isBun,
  version: isDeno
    ? // @ts-expect-error: Deno namespace exists
      Deno.version.deno
    : isBun
    ? (globalThis as any).Bun.version
    : isNode
    ? (globalThis as any).process.version
    : "unknown",
};

// Simulation mode detection (works across all runtimes)
export const isSimulationMode: boolean =
  // @ts-expect-error: Deno namespace exists
  (isDeno && Deno?.env?.get?.("PRINTERS_JS_SIMULATE") === "true") ||
  (isNode &&
    (globalThis as any).process?.env?.PRINTERS_JS_SIMULATE === "true") ||
  (isBun && (globalThis as any).process?.env?.PRINTERS_JS_SIMULATE === "true");
