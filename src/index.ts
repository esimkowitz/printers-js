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

// CUPS Printing Options Types
export type MediaSize =
  | "Letter"
  | "Legal"
  | "A4"
  | "A3"
  | "A5"
  | "B4"
  | "B5"
  | "Executive"
  | "Tabloid"
  | "COM10"
  | "DL"
  | "C5"
  | "B5-envelope"
  | "Monarch"
  | "Invoice"
  | "Folio"
  | "QuartoUs"
  | "a0"
  | "a1"
  | "a2"
  | string; // Allow custom sizes

export type MediaType =
  | "auto"
  | "plain"
  | "bond"
  | "letterhead"
  | "transparency"
  | "envelope"
  | "envelope-manual"
  | "continuous"
  | "continuous-long"
  | "continuous-short"
  | "tab-stock"
  | "pre-printed"
  | "labels"
  | "multi-layer"
  | "screen"
  | "stationery"
  | "stationery-coated"
  | "stationery-inkjet"
  | "stationery-preprinted"
  | "stationery-letterhead"
  | "stationery-fine"
  | "multi-part-form"
  | "other"
  | string; // Allow custom types

export type MediaSource =
  | "auto"
  | "main"
  | "alternate"
  | "large-capacity"
  | "manual"
  | "envelope"
  | "envelope-manual"
  | "auto-select"
  | "tray-1"
  | "tray-2"
  | "tray-3"
  | "tray-4"
  | "left"
  | "middle"
  | "right"
  | "rear"
  | "side"
  | "top"
  | "bottom"
  | "center"
  | "photo"
  | "disc"
  | string; // Allow custom sources

export type OrientationRequested = 3 | 4 | 5 | 6; // Portrait, Landscape, Reverse landscape, Reverse portrait

export type PrintQuality = 3 | 4 | 5; // Draft, Normal, High

export type Sides =
  | "one-sided"
  | "two-sided-long-edge"
  | "two-sided-short-edge";

export type NumberUp = 1 | 2 | 4 | 6 | 9 | 16;

export type NumberUpLayout =
  | "lrtb"
  | "lrbt"
  | "rltb"
  | "rlbt"
  | "tblr"
  | "tbrl"
  | "btlr"
  | "btrl";

export type PageBorder =
  | "none"
  | "single"
  | "single-thick"
  | "double"
  | "double-thick";

export type OutputOrder = "normal" | "reverse";

export type JobHoldUntil =
  | "no-hold"
  | "indefinite"
  | "day-time"
  | "evening"
  | "night"
  | "second-shift"
  | "third-shift"
  | "weekend"
  | string; // Allow specific times like "HH:MM"

export type ColorMode = "monochrome" | "color" | "auto";

export type DocumentFormat =
  | "application/pdf"
  | "application/postscript"
  | "application/vnd.cups-raw"
  | "text/plain"
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "application/vnd.cups-raster"
  | "image/urf"
  | string; // Allow other formats

/**
 * Comprehensive CUPS printing options interface
 * Based on CUPS documentation: https://www.cups.org/doc/options.html
 *
 * @example
 * ```typescript
 * const options: CUPSOptions = {
 *   "job-name": "My Document",
 *   copies: 2,
 *   sides: "two-sided-long-edge",
 *   "media-size": "A4",
 *   "print-quality": 5, // High quality
 *   "print-color-mode": "color"
 * };
 * await printer.printFile("document.pdf", { cups: options });
 * ```
 */
export interface CUPSOptions {
  // Job identification and control
  "job-name"?: string;
  "job-priority"?: number; // 1-100
  "job-hold-until"?: JobHoldUntil;
  "job-billing"?: string;
  "job-sheets"?: string; // Banner pages

  // Copies and collation
  copies?: number;
  collate?: boolean;

  // Media selection
  media?: string; // Can be size, type, or source
  "media-size"?: MediaSize;
  "media-type"?: MediaType;
  "media-source"?: MediaSource;

  // Page orientation and layout
  landscape?: boolean;
  "orientation-requested"?: OrientationRequested;

  // Duplex printing
  sides?: Sides;

  // Page selection and arrangement
  "page-ranges"?: string; // e.g., "1-4,7,9-12"
  "number-up"?: NumberUp;
  "number-up-layout"?: NumberUpLayout;
  "page-border"?: PageBorder;
  "page-bottom"?: number;
  "page-left"?: number;
  "page-right"?: number;
  "page-top"?: number;

  // Print quality and appearance
  "print-quality"?: PrintQuality;
  "print-color-mode"?: ColorMode;
  resolution?: string; // e.g., "300dpi", "600x300dpi"

  // Output control
  "output-order"?: OutputOrder;
  outputbin?: string;

  // Image and document options
  "fit-to-page"?: boolean;
  mirror?: boolean;
  "natural-scaling"?: number; // Percentage
  ppi?: number; // Pixels per inch
  scaling?: number; // Percentage

  // Document format
  "document-format"?: DocumentFormat;

  // Finishing options
  finishings?: string; // Stapling, hole punching, etc.
  "finishings-col"?: string;

  // Color management
  "color-management"?: string;
  gamma?: number;
  brightness?: number;

  // Custom options (catch-all for printer-specific options)
  [key: string]: string | number | boolean | undefined;
}

/**
 * Simplified print options interface for common use cases
 *
 * @example
 * ```typescript
 * const options: SimplePrintOptions = {
 *   copies: 3,
 *   duplex: true,
 *   paperSize: "Letter",
 *   quality: "high",
 *   color: false,
 *   jobName: "My Print Job"
 * };
 * await printer.printFile("document.pdf", { simple: options });
 * ```
 */
export interface SimplePrintOptions {
  /** Number of copies to print */
  copies?: number;
  /** Print on both sides of paper */
  duplex?: boolean;
  /** Paper size */
  paperSize?: MediaSize;
  /** Print quality */
  quality?: "draft" | "normal" | "high";
  /** Color or black and white */
  color?: boolean;
  /** Page range to print (e.g., "1-5,8,10-12") */
  pageRange?: string;
  /** Job name for identification */
  jobName?: string;
  /** Pages per sheet */
  pagesPerSheet?: NumberUp;
  /** Print in landscape orientation */
  landscape?: boolean;
}

/** Job state enum matching upstream printers crate */
export type PrinterJobState =
  | "pending" // Job queued, waiting to be processed
  | "paused" // Job temporarily halted
  | "processing" // Job currently being printed
  | "cancelled" // Job cancelled by user or system
  | "completed" // Job finished successfully
  | "unknown"; // Undetermined state

/** Print job structure matching upstream printers crate */
export interface PrinterJob {
  id: number; // Unique job identifier (u64 in Rust)
  name: string; // Job title/description
  state: PrinterJobState; // Current job status
  mediaType: string; // File type (e.g., "application/pdf")
  createdAt: number; // Job creation timestamp (Unix timestamp)
  processedAt?: number; // Processing start time (Unix timestamp, optional)
  completedAt?: number; // Job completion time (Unix timestamp, optional)
  printerName: string; // Associated printer name
  errorMessage?: string; // Error details if failed
  ageSeconds: number; // Age in seconds for convenience
}

/** Legacy interface for backward compatibility */
export interface JobStatus {
  id: number;
  printer_name: string;
  file_path: string;
  job_name?: string;
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
    options?: PrintJobOptions | Record<string, string>
  ): Promise<number>;
  printBytes(
    data: Uint8Array | Buffer,
    options?: PrintJobOptions | Record<string, string>
  ): Promise<number>;

  // Job tracking methods
  getActiveJobs(): PrinterJob[];
  getJobHistory(limit?: number): PrinterJob[];
  getJob(jobId: number): PrinterJob | null;
  getAllJobs(): PrinterJob[];
  cleanupOldJobs(maxAgeSeconds: number): number;
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
  ) => Promise<number>;
  printBytes?: (
    data: Uint8Array | Buffer,
    jobProperties?: Record<string, string>
  ) => Promise<number>;
  toString?: () => string;
  dispose?: () => void;
}

interface NativeModule {
  getAllPrinterNames(): string[];
  getAllPrinters(): NativePrinter[];
  findPrinterByName(name: string): NativePrinter | null;
  printerExists(name: string): boolean;
  shutdown(): void;
  printFile(
    printerName: string,
    filePath: string,
    jobProperties?: Record<string, string>
  ): Promise<number>;
  printBytes(
    printerName: string,
    data: Uint8Array | Buffer,
    jobProperties?: Record<string, string>
  ): Promise<number>;
  // Printer-specific job tracking methods
  printerGetActiveJobs?(printerName: string): PrinterJob[];
  printerGetJobHistory?(printerName: string, limit?: number): PrinterJob[];
  printerGetJob?(printerName: string, jobId: number): PrinterJob | null;
  printerGetAllJobs?(printerName: string): PrinterJob[];
  printerCleanupOldJobs?(printerName: string, maxAgeSeconds: number): number;
  Printer: {
    fromName(name: string): NativePrinter | null;
  };
}

// Helper functions for CUPS options conversion

/**
 * Convert SimplePrintOptions to CUPS raw properties
 */
export function simpleToCUPS(
  options: Partial<SimplePrintOptions>
): Record<string, string> {
  const cupsOptions: Record<string, string> = {};

  if (options.copies !== undefined) {
    cupsOptions.copies = options.copies.toString();
  }

  if (options.duplex !== undefined) {
    cupsOptions.sides = options.duplex ? "two-sided-long-edge" : "one-sided";
  }

  if (options.paperSize !== undefined) {
    cupsOptions["media-size"] = options.paperSize;
  }

  if (options.quality !== undefined) {
    const qualityMap = { draft: "3", normal: "4", high: "5" };
    cupsOptions["print-quality"] = qualityMap[options.quality];
  }

  if (options.color !== undefined) {
    cupsOptions["print-color-mode"] = options.color ? "color" : "monochrome";
  }

  if (options.pageRange !== undefined) {
    cupsOptions["page-ranges"] = options.pageRange;
  }

  if (options.jobName !== undefined) {
    cupsOptions["job-name"] = options.jobName;
  }

  if (options.pagesPerSheet !== undefined) {
    cupsOptions["number-up"] = options.pagesPerSheet.toString();
  }

  if (options.landscape !== undefined && options.landscape) {
    cupsOptions.landscape = "true";
  }

  return cupsOptions;
}

/**
 * Convert CUPSOptions to raw properties for backend
 */
export function cupsToRaw(
  options: Partial<CUPSOptions>
): Record<string, string> {
  const rawOptions: Record<string, string> = {};

  // Convert all options to string values
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      if (typeof value === "boolean") {
        rawOptions[key] = value ? "true" : "false";
      } else {
        rawOptions[key] = value.toString();
      }
    }
  }

  return rawOptions;
}

/**
 * Print job options that can accept either raw properties or typed options
 *
 * @example
 * ```typescript
 * // Using simple options
 * await printer.printFile("doc.pdf", {
 *   simple: { copies: 2, duplex: true, quality: "high" }
 * });
 *
 * // Using full CUPS options
 * await printer.printFile("doc.pdf", {
 *   cups: { "job-name": "Important", "print-quality": 5 }
 * });
 *
 * // Mixing different option types
 * await printer.printFile("doc.pdf", {
 *   jobName: "Mixed Options",
 *   raw: { "custom-setting": "value" },
 *   simple: { copies: 3, color: true }
 * });
 * ```
 */
export interface PrintJobOptions {
  /** Job name for identification */
  jobName?: string;
  /** Raw CUPS properties (key-value pairs) */
  raw?: Record<string, string>;
  /** Simple typed options for common use cases */
  simple?: Partial<SimplePrintOptions>;
  /** Full CUPS options with complete type safety */
  cups?: Partial<CUPSOptions>;
  /**
   * Whether to wait for job completion before returning.
   * - true (default): Promise resolves when job completes/fails, keeps printer alive during transfer
   * - false: Promise resolves immediately with job ID, background thread keeps printer alive
   */
  waitForCompletion?: boolean;
}

/**
 * Convert PrintJobOptions to raw properties for the backend
 */
export function printJobOptionsToRaw(
  options?: PrintJobOptions
): Record<string, string> {
  if (!options) return {};

  let rawOptions: Record<string, string> = {};

  // Start with raw options if provided
  if (options.raw) {
    rawOptions = { ...options.raw };
  }

  // Add simple options (converted to CUPS)
  if (options.simple) {
    rawOptions = { ...rawOptions, ...simpleToCUPS(options.simple) };
  }

  // Add CUPS options (converted to raw)
  if (options.cups) {
    rawOptions = { ...rawOptions, ...cupsToRaw(options.cups) };
  }

  // Add job name if specified at top level
  if (options.jobName) {
    rawOptions["job-name"] = options.jobName;
  }

  return rawOptions;
}

/**
 * Unit for custom page size measurements
 */
export type CustomPageSizeUnit = "pt" | "in" | "cm" | "mm";

/**
 * Generate a custom page size string for CUPS media option
 *
 * @param width - Width of the media
 * @param length - Length of the media
 * @param unit - Unit of measurement ("pt" for points, "in" for inches, "cm" for centimeters, "mm" for millimeters)
 * @returns Formatted custom media size string
 *
 * @example
 * ```typescript
 * // Create a custom 4x6 inch photo size
 * const photoSize = createCustomPageSize(4, 6, "in");
 * // Returns: "Custom.4x6in"
 *
 * // Create a custom A3+ size in millimeters
 * const a3Plus = createCustomPageSize(329, 483, "mm");
 * // Returns: "Custom.329x483mm"
 *
 * // Use in print options
 * await printer.printFile("document.pdf", {
 *   cups: {
 *     media: createCustomPageSize(210, 297, "mm") // A4 equivalent
 *   }
 * });
 * ```
 */
export function createCustomPageSize(
  width: number,
  length: number,
  unit: CustomPageSizeUnit = "pt"
): string {
  // Validate inputs
  if (width <= 0 || length <= 0) {
    throw new Error("Width and length must be positive numbers");
  }

  if (!["pt", "in", "cm", "mm"].includes(unit)) {
    throw new Error("Unit must be one of: pt, in, cm, mm");
  }

  // Format the custom size string
  const unitSuffix = unit === "pt" ? "" : unit; // Points don't need a suffix
  return `Custom.${width}x${length}${unitSuffix}`;
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

  // For local development, try to load the local build first
  try {
    // All runtimes use the ESM generated by NAPI-RS with --esm flag
    nativeModule = await import(`../npm/${platformString}/index.js`);
  } catch (localError) {
    // If local path fails, try the published npm package
    try {
      const packageName = `@printers/printers-${platformString}`;

      // For Deno, we need to use createRequire to load the module
      // since dynamic imports of bare module specifiers don't work
      if (isDeno) {
        // Use Node.js-style module resolution for Deno
        const { createRequire } = await import("node:module");
        const require = createRequire(import.meta.url);

        // Require the platform package - this should work with node_modules
        nativeModule = require(packageName);
      } else {
        // For Node.js and Bun, dynamic import should work
        nativeModule = await import(packageName);
      }
    } catch (npmError) {
      throw new Error(
        `Failed to load N-API module for platform ${platformString}. ` +
          `Make sure the platform-specific package is installed or built locally. ` +
          `Local error: ${localError}. NPM error: ${npmError}`
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

/**
 * Wrapper class providing consistent API across all runtimes.
 */
class PrinterWrapper implements Printer {
  private nativePrinter: NativePrinter;

  constructor(nativePrinter: NativePrinter) {
    this.nativePrinter = nativePrinter;
  }

  private getInfoProperty(propertyName: string): any {
    // For native Printer class instances, we need to get the info
    if (
      "getInfo" in this.nativePrinter &&
      typeof this.nativePrinter.getInfo === "function"
    ) {
      try {
        const info = (this.nativePrinter as any).getInfo();
        return info[propertyName];
      } catch (error) {
        console.warn("Failed to get printer info:", error);
      }
    }
    return undefined;
  }

  get name(): string {
    return this.nativePrinter.name || "";
  }

  get systemName(): string | undefined {
    if (this.nativePrinter.systemName) {
      return this.nativePrinter.systemName;
    }
    return this.getInfoProperty("systemName");
  }

  get driverName(): string | undefined {
    if (this.nativePrinter.driverName) {
      return this.nativePrinter.driverName;
    }
    return this.getInfoProperty("driverName");
  }

  get uri(): string | undefined {
    if (this.nativePrinter.uri) {
      return this.nativePrinter.uri;
    }
    return this.getInfoProperty("uri");
  }

  get portName(): string | undefined {
    if (this.nativePrinter.portName) {
      return this.nativePrinter.portName;
    }
    return this.getInfoProperty("portName");
  }

  get processor(): string | undefined {
    if (this.nativePrinter.processor) {
      return this.nativePrinter.processor;
    }
    return this.getInfoProperty("processor");
  }

  get dataType(): string | undefined {
    if (this.nativePrinter.dataType) {
      return this.nativePrinter.dataType;
    }
    return this.getInfoProperty("dataType");
  }

  get description(): string | undefined {
    if (this.nativePrinter.description) {
      return this.nativePrinter.description;
    }
    return this.getInfoProperty("description");
  }

  get location(): string | undefined {
    if (this.nativePrinter.location) {
      return this.nativePrinter.location;
    }
    return this.getInfoProperty("location");
  }

  get isDefault(): boolean | undefined {
    if (this.nativePrinter.isDefault !== undefined) {
      return this.nativePrinter.isDefault;
    }
    // For native Printer class instances, we need to get the info
    if (
      "getInfo" in this.nativePrinter &&
      typeof this.nativePrinter.getInfo === "function"
    ) {
      try {
        const info = (this.nativePrinter as any).getInfo();
        return info.isDefault;
      } catch (error) {
        console.warn("Failed to get printer info:", error);
      }
    }
    return undefined;
  }

  get isShared(): boolean | undefined {
    if (this.nativePrinter.isShared !== undefined) {
      return this.nativePrinter.isShared;
    }
    // For native Printer class instances, we need to get the info
    if (
      "getInfo" in this.nativePrinter &&
      typeof this.nativePrinter.getInfo === "function"
    ) {
      try {
        const info = (this.nativePrinter as any).getInfo();
        return info.isShared;
      } catch (error) {
        console.warn("Failed to get printer info:", error);
      }
    }
    return undefined;
  }

  get state(): PrinterState | undefined {
    if (this.nativePrinter.state) {
      return this.nativePrinter.state as PrinterState;
    }
    // For native Printer class instances, we need to get the info
    if (
      "getInfo" in this.nativePrinter &&
      typeof this.nativePrinter.getInfo === "function"
    ) {
      try {
        const info = (this.nativePrinter as any).getInfo();
        return (info.state as PrinterState) || "unknown";
      } catch (error) {
        console.warn("Failed to get printer info:", error);
      }
    }
    return "unknown";
  }

  get stateReasons(): string[] | undefined {
    if (this.nativePrinter.stateReasons) {
      return this.nativePrinter.stateReasons;
    }
    // For native Printer class instances, we need to get the info
    if (
      "getInfo" in this.nativePrinter &&
      typeof this.nativePrinter.getInfo === "function"
    ) {
      try {
        const info = (this.nativePrinter as any).getInfo();
        return info.stateReasons;
      } catch (error) {
        console.warn("Failed to get printer info:", error);
      }
    }
    return [];
  }

  /**
   * Check if the printer exists on the system.
   * @returns True if printer exists
   */
  exists(): boolean {
    return this.nativePrinter.exists ? this.nativePrinter.exists() : true;
  }

  /**
   * Get string representation of the printer.
   * @returns Printer name or custom string representation
   */
  toString(): string {
    return this.nativePrinter.toString
      ? this.nativePrinter.toString()
      : this.name;
  }

  /**
   * Compare equality with another printer.
   * @param other - Printer to compare with
   * @returns True if printers have same name
   */
  equals(other: Printer): boolean {
    return this.name === other.name;
  }

  /**
   * Clean up printer resources.
   */
  dispose(): void {
    if (this.nativePrinter.dispose) {
      this.nativePrinter.dispose();
    }
  }

  /**
   * Get the printer name.
   * @returns Printer name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Print a file using this printer.
   * @param filePath - Path to file to print
   * @param options - Typed print options or raw properties
   * @throws Error if print functionality unavailable
   */
  async printFile(
    filePath: string,
    options?: PrintJobOptions | Record<string, string>
  ): Promise<number> {
    if (nativeModule.printFile) {
      const { rawOptions, waitForCompletion } = this.convertOptions(options);
      return await nativeModule.printFile(
        this.name,
        filePath,
        rawOptions,
        waitForCompletion
      );
    }
    throw new Error("Print functionality not available");
  }

  /**
   * Print raw bytes using this printer.
   * @param data - Byte data to print
   * @param options - Typed print options or raw properties
   * @throws Error if print functionality unavailable
   */
  async printBytes(
    data: Uint8Array | Buffer,
    options?: PrintJobOptions | Record<string, string>
  ): Promise<number> {
    if (nativeModule.printBytes) {
      const { rawOptions, waitForCompletion } = this.convertOptions(options);
      return await nativeModule.printBytes(
        this.name,
        data,
        rawOptions,
        waitForCompletion
      );
    }
    throw new Error("Print bytes functionality not available");
  }

  /**
   * Convert options to raw properties for the backend and extract waitForCompletion
   */
  private convertOptions(options?: PrintJobOptions | Record<string, string>): {
    rawOptions?: Record<string, string>;
    waitForCompletion: boolean;
  } {
    if (!options) {
      return { rawOptions: undefined, waitForCompletion: true };
    }

    // If it's already raw properties (has string keys and values)
    if (this.isRawOptions(options)) {
      return { rawOptions: options, waitForCompletion: true };
    }

    const typedOptions = options as PrintJobOptions;
    const waitForCompletion = typedOptions.waitForCompletion !== false; // Default to true

    // Convert typed options to raw (excluding waitForCompletion)
    const rawOptions = printJobOptionsToRaw(typedOptions);

    return { rawOptions, waitForCompletion };
  }

  /**
   * Check if options are raw properties
   */
  private isRawOptions(
    options: PrintJobOptions | Record<string, string>
  ): options is Record<string, string> {
    // If it has any of the PrintJobOptions specific keys, it's typed options
    return !(
      "jobName" in options ||
      "raw" in options ||
      "simple" in options ||
      "cups" in options
    );
  }

  /**
   * Get active print jobs for this printer.
   * @returns Array of active PrinterJob objects
   */
  getActiveJobs(): PrinterJob[] {
    try {
      return nativeModule.printerGetActiveJobs
        ? nativeModule.printerGetActiveJobs(this.name)
        : [];
    } catch (error) {
      console.error(`Failed to get active jobs for ${this.name}:`, error);
      return [];
    }
  }

  /**
   * Get job history for this printer.
   * @param limit - Maximum number of jobs to return (optional)
   * @returns Array of completed/cancelled PrinterJob objects
   */
  getJobHistory(limit?: number): PrinterJob[] {
    try {
      return nativeModule.printerGetJobHistory
        ? nativeModule.printerGetJobHistory(this.name, limit)
        : [];
    } catch (error) {
      console.error(`Failed to get job history for ${this.name}:`, error);
      return [];
    }
  }

  /**
   * Get a specific job by ID if it belongs to this printer.
   * @param jobId - Job ID to look up
   * @returns PrinterJob object if found, null otherwise
   */
  getJob(jobId: number): PrinterJob | null {
    try {
      return nativeModule.printerGetJob
        ? nativeModule.printerGetJob(this.name, jobId)
        : null;
    } catch (error) {
      console.error(`Failed to get job ${jobId} for ${this.name}:`, error);
      return null;
    }
  }

  /**
   * Get all jobs (active and completed) for this printer.
   * @returns Array of all PrinterJob objects
   */
  getAllJobs(): PrinterJob[] {
    try {
      return nativeModule.printerGetAllJobs
        ? nativeModule.printerGetAllJobs(this.name)
        : [];
    } catch (error) {
      console.error(`Failed to get all jobs for ${this.name}:`, error);
      return [];
    }
  }

  /**
   * Clean up old completed/cancelled jobs for this printer.
   * @param maxAgeSeconds - Maximum age in seconds for jobs to keep
   * @returns Number of jobs cleaned up
   */
  cleanupOldJobs(maxAgeSeconds: number): number {
    try {
      return nativeModule.printerCleanupOldJobs
        ? nativeModule.printerCleanupOldJobs(this.name, maxAgeSeconds)
        : 0;
    } catch (error) {
      console.error(`Failed to cleanup old jobs for ${this.name}:`, error);
      return 0;
    }
  }
}

// Public API functions

/**
 * Get all available printers on the system.
 * @returns Array of Printer objects
 */
export function getAllPrinters(): Printer[] {
  try {
    // Use the N-API getAllPrinters method which returns complete printer info
    const nativePrinters = nativeModule.getAllPrinters
      ? nativeModule.getAllPrinters()
      : [];

    return nativePrinters.map(
      nativePrinter => new PrinterWrapper(nativePrinter)
    );
  } catch (error) {
    console.error("Failed to get all printers:", error);
    return [];
  }
}

/**
 * Get names of all available printers.
 * @returns Array of printer names
 */
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

/**
 * Get a specific printer by name.
 * @param name - Printer name to search for
 * @returns Printer object if found, null otherwise
 */
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

/**
 * Check if a printer exists.
 * @param name - Printer name to check
 * @returns True if printer exists, false otherwise
 */
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

/**
 * Clean up resources and shutdown the printer module.
 */
export function shutdown(): void {
  try {
    if (nativeModule.shutdown) {
      nativeModule.shutdown();
    }
  } catch (error) {
    console.error("Failed to shutdown:", error);
  }
}

/**
 * Static methods for creating Printer instances.
 */
export const PrinterConstructor: PrinterClass = {
  fromName: (name: string) => getPrinterByName(name),
  // @ts-expect-error: Prevent direct construction
  new: () => {
    throw new Error("Use PrinterConstructor.fromName() instead");
  },
};

// Legacy exports for backward compatibility

/** @deprecated Use getPrinterByName instead */
export const findPrinter = getPrinterByName;

/**
 * Get the default printer.
 * @returns Default printer if found, null otherwise
 */
export const getDefaultPrinter = () =>
  getAllPrinters().find(p => p.isDefault) || null;

/**
 * Print a file to a printer.
 * @param printerName - Name of the printer
 * @param filePath - Path to file to print
 * @param options - Typed print options or raw properties
 * @returns Promise<number> - Job ID
 * @throws Error if printer not found
 */
export const printFile = async (
  printerName: string,
  filePath: string,
  options?: PrintJobOptions | Record<string, string>
): Promise<number> => {
  const printer = getPrinterByName(printerName);
  if (!printer) {
    throw new Error(`Printer not found: ${printerName}`);
  }
  return await printer.printFile(filePath, options);
};

/**
 * Print raw bytes to a printer.
 * @param printerName - Name of the printer
 * @param data - Byte data to print
 * @param options - Typed print options or raw properties
 * @returns Promise<number> - Job ID
 * @throws Error if printer not found
 */
export const printBytes = async (
  printerName: string,
  data: Uint8Array | Buffer,
  options?: PrintJobOptions | Record<string, string>
): Promise<number> => {
  const printer = getPrinterByName(printerName);
  if (!printer) {
    throw new Error(`Printer not found: ${printerName}`);
  }
  return await printer.printBytes(data, options);
};
