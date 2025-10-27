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

/** Printer state enum matching the Rust PrinterState enum */
export type PrinterState =
  | "idle"
  | "printing"
  | "paused"
  | "offline"
  | "unknown";

// ===== PRINTER STATE MONITORING INTERFACES =====

/** Printer state change event types */
export type PrinterStateEventType =
  | "connected" // Printer connected/appeared
  | "disconnected" // Printer disconnected/removed
  | "state_changed" // Printer state changed (idle -> printing, etc.)
  | "state_reasons_changed"; // Printer state reasons changed (error conditions, etc.)

/** Printer state change event */
export interface PrinterStateChangeEvent {
  /** Type of event that occurred */
  eventType: PrinterStateEventType;
  /** Name of the printer that changed */
  printerName: string;
  /** Previous state (for state_changed events) */
  oldState?: PrinterState;
  /** New state (for state_changed events) */
  newState?: PrinterState;
  /** Previous state reasons (for state_reasons_changed events) */
  oldReasons?: string[];
  /** New state reasons (for state_reasons_changed events) */
  newReasons?: string[];
  /** Timestamp when the event occurred */
  timestamp: number;
}

/** Callback function for printer state change events */
export type PrinterStateChangeCallback = (
  event: PrinterStateChangeEvent
) => void;

/** Subscription handle for unsubscribing from events */
export interface PrinterStateSubscription {
  /** Unique subscription ID */
  id: number;
  /** Unsubscribe from events */
  unsubscribe(): Promise<boolean>;
}

/** Current printer state snapshot */
export interface PrinterStateSnapshot {
  /** Printer name */
  name: string;
  /** Current state */
  state: PrinterState;
  /** Current state reasons */
  stateReasons: string[];
  /** Timestamp of this snapshot */
  timestamp: number;
}

/** Printer state monitoring configuration */
export interface PrinterStateMonitorConfig {
  /** Polling interval in seconds (default: 2) */
  pollInterval?: number;
  /** Whether to start monitoring immediately (default: true) */
  autoStart?: boolean;
}

/**
 * N-API native printer interface
 * Represents the raw PrinterInfo struct from Rust - data only, no methods
 */
export interface NativePrinter {
  name: string;
  systemName: string;
  driverName: string;
  uri: string;
  portName: string;
  processor: string;
  dataType: string;
  description: string;
  location: string;
  isDefault: boolean;
  isShared: boolean;
  state: PrinterState;
  stateReasons: string[];
}

// Trick to expose NativePrinter properties on Printer for linting and type checking
// Properties are readonly - automatically proxied from the underlying NativePrinter
export interface Printer extends Readonly<NativePrinter> {
  exists(): boolean;
  toString(): string;
  equals(other: Printer): boolean;
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

// Runtime detection interfaces
interface GlobalWithProcess {
  process?: {
    versions?: { node?: string };
    version?: string;
    env?: Record<string, string | undefined>;
    platform?: string;
    arch?: string;
    report?: {
      getReport?: () => {
        header?: {
          glibcVersionRuntime?: string;
        };
        sharedObjects?: string[];
      };
    };
  };
}

interface GlobalWithBun {
  Bun?: { version: string };
}

interface GlobalWithDeno {
  Deno?: {
    version?: { deno: string };
    env?: { get(key: string): string | undefined };
  };
}

// Type-safe global access
const g = globalThis as GlobalWithProcess & GlobalWithBun & GlobalWithDeno;

// Simple runtime detection
const isDeno = typeof g.Deno !== "undefined";
const isBun = typeof g.Bun !== "undefined";
const isNode = typeof g.process?.versions?.node !== "undefined";

// Simulation mode detection
const simValue = isDeno
  ? g.Deno?.env?.get("PRINTERS_JS_SIMULATE")
  : g.process?.env?.PRINTERS_JS_SIMULATE;

export const isSimulationMode: boolean =
  simValue === "true" || simValue === "1";

// Runtime information
export const runtimeInfo: RuntimeInfo = {
  name: isDeno ? "deno" : isBun ? "bun" : isNode ? "node" : "unknown",
  isDeno,
  isNode,
  isBun,
  version: isDeno
    ? (g.Deno?.version?.deno ?? "unknown")
    : isBun
      ? (g.Bun?.version ?? "unknown")
      : isNode
        ? (g.process?.version ?? "unknown")
        : "unknown",
};

// N-API module interface
interface NativeModule {
  getAllPrinterNames(): string[];
  getAllPrinters(): NativePrinter[];
  findPrinterByName(name: string): NativePrinter | null;
  printerExists(name: string): boolean;
  shutdown(): void;
  printFile(
    printerName: string,
    filePath: string,
    jobProperties?: Record<string, string>,
    waitForCompletion?: boolean
  ): Promise<number>;
  printBytes(
    printerName: string,
    data: Uint8Array | Buffer,
    jobProperties?: Record<string, string>,
    waitForCompletion?: boolean
  ): Promise<number>;
  // Printer-specific job tracking methods
  printerGetActiveJobs?(printerName: string): PrinterJob[];
  printerGetJobHistory?(printerName: string, limit?: number): PrinterJob[];
  printerGetJob?(printerName: string, jobId: number): PrinterJob | null;
  printerGetAllJobs?(printerName: string): PrinterJob[];
  printerCleanupOldJobs?(printerName: string, maxAgeSeconds: number): number;
  // Printer state monitoring methods
  startStateMonitoring?(): void;
  stopStateMonitoring?(): void;
  isStateMonitoringActive?(): boolean;
  setStateMonitoringInterval?(seconds: number): void;
  getPrinterStateSnapshot?(): Record<string, [PrinterState, string[]]>;
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
  const platform = g.process?.platform;
  const arch = g.process?.arch;

  let platformString: string;

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
      // Dynamic import works for all runtimes (Node.js, Deno with nodeModulesDir, Bun)
      // Deno uses npm: specifier, Node.js/Bun use bare specifier
      const packageName = isDeno
        ? `npm:@printers/printers-${platformString}`
        : `@printers/printers-${platformString}`;

      nativeModule = await import(packageName);
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
 * Uses Proxy to dynamically expose all NativePrinter properties.
 */
class PrinterWrapperImpl {
  private _native: NativePrinter;

  constructor(nativePrinter: NativePrinter) {
    this._native = nativePrinter;

    // Return a Proxy that intercepts property access
    return new Proxy(this, {
      get(target, prop, receiver) {
        // If the property exists on the wrapper, use it
        if (prop in target) {
          const value = Reflect.get(target, prop, receiver);
          // Bind functions to maintain correct 'this' context
          return typeof value === "function" ? value.bind(target) : value;
        }

        // Otherwise, try to get it from the native printer
        const nativeValue = (target._native as any)[prop];
        if (nativeValue !== undefined) {
          // Bind native functions to the native printer
          return typeof nativeValue === "function"
            ? nativeValue.bind(target._native)
            : nativeValue;
        }

        return undefined;
      },

      // Make properties enumerable for iteration
      ownKeys(target) {
        const wrapperKeys = Reflect.ownKeys(target);
        const nativeKeys = Reflect.ownKeys(target._native);
        return [...new Set([...wrapperKeys, ...nativeKeys])];
      },

      // Required for ownKeys to work properly
      getOwnPropertyDescriptor(target, prop) {
        if (prop in target) {
          return Reflect.getOwnPropertyDescriptor(target, prop);
        }
        if (prop in target._native) {
          return {
            enumerable: true,
            configurable: true,
          };
        }
        return undefined;
      },
    });
  }

  /**
   * Check if the printer exists on the system.
   * @returns True if printer exists
   */
  exists(): boolean {
    return printerExists(this._native.name);
  }

  /**
   * Get string representation of the printer.
   * @returns Formatted printer information string
   */
  toString(): string {
    const status = this._native.isDefault ? " (default)" : "";
    const state = this._native.state ? ` [${this._native.state}]` : "";
    return `${this._native.name}${status}${state}`;
  }

  /**
   * Compare equality with another printer.
   * Printers are considered equal if they have the same name.
   * @param other - Printer to compare with
   * @returns True if printers have same name
   */
  equals(other: Printer): boolean {
    // Since name is guaranteed to exist on NativePrinter, we can directly compare
    return this._native.name === other.name;
  }

  /**
   * Get the printer name.
   * @returns Printer name
   */
  getName(): string {
    return this._native.name;
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
        this._native.name,
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
        this._native.name,
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
        ? nativeModule.printerGetActiveJobs(this._native.name)
        : [];
    } catch (error) {
      console.error(
        `Failed to get active jobs for ${this._native.name}:`,
        error
      );
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
        ? nativeModule.printerGetJobHistory(this._native.name, limit)
        : [];
    } catch (error) {
      console.error(
        `Failed to get job history for ${this._native.name}:`,
        error
      );
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
        ? nativeModule.printerGetJob(this._native.name, jobId)
        : null;
    } catch (error) {
      console.error(
        `Failed to get job ${jobId} for ${this._native.name}:`,
        error
      );
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
        ? nativeModule.printerGetAllJobs(this._native.name)
        : [];
    } catch (error) {
      console.error(`Failed to get all jobs for ${this._native.name}:`, error);
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
        ? nativeModule.printerCleanupOldJobs(this._native.name, maxAgeSeconds)
        : 0;
    } catch (error) {
      console.error(
        `Failed to cleanup old jobs for ${this._native.name}:`,
        error
      );
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
      nativePrinter =>
        new PrinterWrapperImpl(nativePrinter) as unknown as Printer
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
    return nativePrinter
      ? (new PrinterWrapperImpl(nativePrinter) as unknown as Printer)
      : null;
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

// ===== PRINTER STATE MONITORING FUNCTIONS =====

// Global state for managing subscriptions
let nextSubscriptionId = 1;
const stateSubscriptions = new Map<number, PrinterStateChangeCallback>();
let monitoringInterval: any = null;
let previousStates = new Map<string, PrinterStateSnapshot>();

/**
 * Start printer state monitoring.
 * @param config - Optional configuration for monitoring
 * @returns Promise that resolves when monitoring starts
 */
export async function startPrinterStateMonitoring(
  config: PrinterStateMonitorConfig = {}
): Promise<void> {
  try {
    // Start native monitoring if available
    if (nativeModule.startStateMonitoring) {
      nativeModule.startStateMonitoring();
    }

    // Set polling interval if specified
    if (config.pollInterval && nativeModule.setStateMonitoringInterval) {
      nativeModule.setStateMonitoringInterval(config.pollInterval);
    }

    // Start JavaScript-side polling for event emission
    if (!monitoringInterval) {
      const pollInterval = (config.pollInterval || 2) * 1000; // Convert to milliseconds
      monitoringInterval = setInterval(() => {
        pollPrinterStates();
      }, pollInterval);
    }
  } catch (error) {
    throw new Error(
      `Failed to start printer state monitoring: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Stop printer state monitoring.
 * @returns Promise that resolves when monitoring stops
 */
export async function stopPrinterStateMonitoring(): Promise<void> {
  try {
    // Stop native monitoring if available
    if (nativeModule.stopStateMonitoring) {
      nativeModule.stopStateMonitoring();
    }

    // Stop JavaScript-side polling
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }

    // Clear previous states
    previousStates.clear();
  } catch (error) {
    throw new Error(
      `Failed to stop printer state monitoring: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Check if printer state monitoring is currently active.
 * @returns True if monitoring is active
 */
export function isPrinterStateMonitoringActive(): boolean {
  return (
    monitoringInterval !== null ||
    Boolean(nativeModule.isStateMonitoringActive?.())
  );
}

/**
 * Subscribe to printer state change events.
 * @param callback - Function to call when state changes occur
 * @returns Subscription object with unsubscribe method
 */
export async function subscribeToPrinterStateChanges(
  callback: PrinterStateChangeCallback
): Promise<PrinterStateSubscription> {
  const id = nextSubscriptionId++;
  stateSubscriptions.set(id, callback);

  // Auto-start monitoring if not already active
  if (!isPrinterStateMonitoringActive()) {
    await startPrinterStateMonitoring();
  }

  return {
    id,
    async unsubscribe(): Promise<boolean> {
      const removed = stateSubscriptions.delete(id);

      // Stop monitoring if no more subscriptions
      if (stateSubscriptions.size === 0) {
        try {
          await stopPrinterStateMonitoring();
        } catch (error) {
          // Monitoring might already be stopped, which is fine
          console.debug(
            "Warning: Could not stop monitoring during unsubscribe:",
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      return removed;
    },
  };
}

/**
 * Get current snapshot of all printer states.
 * @returns Map of printer names to their current state information
 */
export function getPrinterStateSnapshots(): Map<string, PrinterStateSnapshot> {
  const snapshots = new Map<string, PrinterStateSnapshot>();
  const timestamp = Date.now();

  try {
    if (nativeModule.getPrinterStateSnapshot) {
      const nativeStates = nativeModule.getPrinterStateSnapshot();
      for (const [name, [state, stateReasons]] of Object.entries(
        nativeStates
      )) {
        snapshots.set(name, {
          name,
          state,
          stateReasons,
          timestamp,
        });
      }
    } else {
      // Fallback: get states from current printers
      const printers = getAllPrinters();
      for (const printer of printers) {
        snapshots.set(printer.name, {
          name: printer.name,
          state: printer.state || "unknown",
          stateReasons: printer.stateReasons || [],
          timestamp,
        });
      }
    }
  } catch (error) {
    console.error("Failed to get printer state snapshots:", error);
  }

  return snapshots;
}

/**
 * Set the polling interval for state monitoring.
 * @param seconds - Polling interval in seconds
 */
export async function setPrinterStateMonitoringInterval(
  seconds: number
): Promise<void> {
  if (seconds < 1) {
    throw new Error("Polling interval must be at least 1 second");
  }

  try {
    // Update native monitoring interval if available
    if (nativeModule.setStateMonitoringInterval) {
      nativeModule.setStateMonitoringInterval(seconds);
    }

    // Restart JavaScript polling with new interval if active
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = setInterval(() => {
        pollPrinterStates();
      }, seconds * 1000);
    }
  } catch (error) {
    throw new Error(
      `Failed to set monitoring interval: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Internal function to poll printer states and emit events
 */
function pollPrinterStates(): void {
  try {
    const currentStates = getPrinterStateSnapshots();
    const currentNames = new Set(currentStates.keys());
    const previousNames = new Set(previousStates.keys());
    const timestamp = Date.now();

    // Check for new printers (connected)
    for (const name of currentNames) {
      if (!previousNames.has(name)) {
        const event: PrinterStateChangeEvent = {
          eventType: "connected",
          printerName: name,
          timestamp,
        };
        emitStateChangeEvent(event);
      }
    }

    // Check for removed printers (disconnected)
    for (const name of previousNames) {
      if (!currentNames.has(name)) {
        const event: PrinterStateChangeEvent = {
          eventType: "disconnected",
          printerName: name,
          timestamp,
        };
        emitStateChangeEvent(event);
      }
    }

    // Check for state changes in existing printers
    for (const [name, currentState] of currentStates) {
      const previousState = previousStates.get(name);

      if (previousState) {
        // Check for state change
        if (currentState.state !== previousState.state) {
          const event: PrinterStateChangeEvent = {
            eventType: "state_changed",
            printerName: name,
            oldState: previousState.state,
            newState: currentState.state,
            timestamp,
          };
          emitStateChangeEvent(event);
        }

        // Check for state reasons change
        if (
          JSON.stringify(currentState.stateReasons) !==
          JSON.stringify(previousState.stateReasons)
        ) {
          const event: PrinterStateChangeEvent = {
            eventType: "state_reasons_changed",
            printerName: name,
            oldReasons: previousState.stateReasons,
            newReasons: currentState.stateReasons,
            timestamp,
          };
          emitStateChangeEvent(event);
        }
      }
    }

    // Update previous states
    previousStates = currentStates;
  } catch (error) {
    console.error("Error polling printer states:", error);
  }
}

/**
 * Internal function to emit state change events to all subscribers
 */
function emitStateChangeEvent(event: PrinterStateChangeEvent): void {
  for (const callback of stateSubscriptions.values()) {
    try {
      callback(event);
    } catch (error) {
      console.error("Error in state change callback:", error);
    }
  }
}
