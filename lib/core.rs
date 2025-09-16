use printers::common::base::printer::Printer;
use printers::get_printer_by_name;
use std::collections::HashMap;
use std::env;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant, SystemTime};
use uuid::Uuid;

/// Print job options for configuring print jobs
#[derive(Clone, Debug)]
pub struct PrinterJobOptions {
    /// Optional job name
    pub name: Option<String>,
    /// Raw properties for CUPS/system-specific options
    pub raw_properties: HashMap<String, String>,
}

impl PrinterJobOptions {
    /// Create empty job options
    pub fn none() -> Self {
        PrinterJobOptions {
            name: None,
            raw_properties: HashMap::new(),
        }
    }

    /// Create job options from raw properties map
    pub fn from_map(mut raw_properties: HashMap<String, String>) -> Self {
        // Extract job name if present in raw properties
        let name = raw_properties.remove("job-name");

        PrinterJobOptions {
            name,
            raw_properties,
        }
    }

    /// Create job options with name and properties
    pub fn with_name_and_properties(name: String, raw_properties: HashMap<String, String>) -> Self {
        PrinterJobOptions {
            name: Some(name),
            raw_properties,
        }
    }
}

/// Error codes for the printing operations
#[repr(i32)]
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PrintError {
    InvalidParams = 1,
    InvalidPrinterName = 2,
    InvalidFilePath = 3,
    InvalidJson = 4,
    InvalidJsonEncoding = 5,
    PrinterNotFound = 6,
    FileNotFound = 7,
    SimulatedFailure = 8,
}

impl PrintError {
    pub fn as_i32(self) -> i32 {
        self as i32
    }
}

// Timing constants for simulation mode
const SIMULATION_BASE_TIME_MS: u64 = 1000;
const SIMULATION_VARIABLE_TIME_MS: u64 = 2000;

// Type aliases for better readability
pub type JobId = u64;
type JobTracker = Arc<Mutex<HashMap<JobId, PrinterJob>>>;
type JobIdGenerator = Arc<Mutex<JobId>>;

/// Check if we should use simulated printing (for testing)
/// Only simulates when PRINTERS_JS_SIMULATE is explicitly set to "true" or "1"
/// If unset or any other value, uses real printers
pub fn should_simulate_printing() -> bool {
    match env::var("PRINTERS_JS_SIMULATE") {
        Ok(val) => val == "true" || val == "1",
        Err(_) => false, // If unset, use real printers
    }
}

/// Generate the next job ID
fn generate_job_id() -> JobId {
    let mut next_id = NEXT_JOB_ID.lock().unwrap();
    let id = *next_id;
    *next_id += 1;
    id
}

// Global job tracking
lazy_static::lazy_static! {
    static ref JOB_TRACKER: JobTracker = Arc::new(Mutex::new(HashMap::new()));
    static ref NEXT_JOB_ID: JobIdGenerator = Arc::new(Mutex::new(1000));
    static ref SHUTDOWN_FLAG: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
    static ref THREAD_HANDLES: Arc<Mutex<Vec<JoinHandle<()>>>> = Arc::new(Mutex::new(Vec::new()));
}

/// Job status enum matching upstream printers crate
#[derive(Clone, Debug, PartialEq)]
pub enum PrinterJobState {
    PENDING,    // Job queued, waiting to be processed
    PAUSED,     // Job temporarily halted
    PROCESSING, // Job currently being printed
    CANCELLED,  // Job cancelled by user or system
    COMPLETED,  // Job finished successfully
    UNKNOWN,    // Undetermined state
}

impl PrinterJobState {
    pub fn as_string(&self) -> String {
        match self {
            PrinterJobState::PENDING => "pending".to_string(),
            PrinterJobState::PAUSED => "paused".to_string(),
            PrinterJobState::PROCESSING => "processing".to_string(),
            PrinterJobState::CANCELLED => "cancelled".to_string(),
            PrinterJobState::COMPLETED => "completed".to_string(),
            PrinterJobState::UNKNOWN => "unknown".to_string(),
        }
    }
}

/// Print job structure matching upstream printers crate
#[derive(Clone, Debug)]
pub struct PrinterJob {
    pub id: JobId,                        // Unique job identifier
    pub name: String,                     // Job title/description
    pub state: PrinterJobState,           // Current job status
    pub media_type: String,               // File type (e.g., "application/pdf")
    pub created_at: SystemTime,           // Job creation timestamp
    pub processed_at: Option<SystemTime>, // Processing start time (optional)
    pub completed_at: Option<SystemTime>, // Job completion time (optional)
    pub printer_name: String,             // Associated printer name
    pub error_message: Option<String>,    // Error details if failed
}

/// Detect media type from file extension
fn detect_media_type(file_path: &str) -> String {
    if file_path.starts_with("<bytes:") {
        return "application/vnd.cups-raw".to_string();
    }

    let path = std::path::Path::new(file_path);
    if let Some(extension) = path.extension() {
        match extension.to_str().unwrap_or("").to_lowercase().as_str() {
            "pdf" => "application/pdf".to_string(),
            "ps" => "application/postscript".to_string(),
            "txt" | "text" => "text/plain".to_string(),
            "jpg" | "jpeg" => "image/jpeg".to_string(),
            "png" => "image/png".to_string(),
            "gif" => "image/gif".to_string(),
            _ => "application/octet-stream".to_string(),
        }
    } else {
        "application/octet-stream".to_string()
    }
}

/// Create a JSON status object for a job
pub fn create_status_json(_job_id: JobId, job: &PrinterJob) -> Option<String> {
    let age_seconds = job
        .created_at
        .elapsed()
        .unwrap_or(Duration::from_secs(0))
        .as_secs();

    let status_obj = serde_json::json!({
        "id": job.id,
        "printer_name": job.printer_name,
        "name": job.name,
        "state": job.state.as_string(),
        "media_type": job.media_type,
        "created_at": job.created_at.duration_since(SystemTime::UNIX_EPOCH).unwrap_or(Duration::from_secs(0)).as_secs(),
        "processed_at": job.processed_at.map(|t| t.duration_since(SystemTime::UNIX_EPOCH).unwrap_or(Duration::from_secs(0)).as_secs()),
        "completed_at": job.completed_at.map(|t| t.duration_since(SystemTime::UNIX_EPOCH).unwrap_or(Duration::from_secs(0)).as_secs()),
        "error_message": job.error_message,
        "age_seconds": age_seconds
    });

    serde_json::to_string(&status_obj).ok()
}

/// Core printer operations
pub struct PrinterCore;

impl PrinterCore {
    /// Find a printer by name
    pub fn find_printer_by_name(name: &str) -> Option<Printer> {
        if should_simulate_printing() {
            // In simulation mode, only return printer if name matches simulated printers
            if name == "Simulated Printer" {
                // Try to use a real printer as template, but with the requested name
                if let Some(mut printer) = printers::get_printers().first().cloned() {
                    printer.name = name.to_string();
                    printer.is_default = true; // Always mark simulated printer as default
                    Some(printer)
                } else {
                    // No real printers available - create a mock printer struct
                    Some(Printer {
                        name: name.to_string(),
                        system_name: "Brother_MFC_J6955DW".to_string(),
                        driver_name: "Brother MFC-J6955DW-AirPrint".to_string(),
                        uri: "mock://printer".to_string(),
                        location: "Test Location".to_string(),
                        description: "Mock printer for testing".to_string(),
                        port_name: "MOCK:".to_string(),
                        processor: "Mock Processor".to_string(),
                        data_type: "RAW".to_string(),
                        is_shared: false,
                        is_default: true,
                        state: printers::common::base::printer::PrinterState::READY,
                        state_reasons: Vec::new(),
                    })
                }
            } else {
                None
            }
        } else {
            get_printer_by_name(name)
        }
    }

    /// Check if a printer exists
    pub fn printer_exists(name: &str) -> bool {
        Self::find_printer_by_name(name).is_some()
    }

    /// Get all printer names
    pub fn get_all_printer_names() -> Vec<String> {
        if should_simulate_printing() {
            vec!["Simulated Printer".to_string()]
        } else {
            printers::get_printers()
                .into_iter()
                .map(|p| p.name.clone())
                .collect()
        }
    }

    /// Serialize printer to JSON (simplified)
    pub fn printer_to_json(printer: &Printer) -> Option<String> {
        let printer_obj = serde_json::json!({
            "name": printer.name,
            "system_name": printer.system_name,
            "driver_name": printer.driver_name,
            "is_default": printer.is_default,
            "is_shared": printer.is_shared,
        });

        serde_json::to_string(&printer_obj).ok()
    }

    /// Get printer state as string
    pub fn get_printer_state(printer: &Printer) -> String {
        // Convert the PrinterState enum to a string representation
        use printers::common::base::printer::PrinterState;

        match printer.state {
            PrinterState::READY => "idle".to_string(),
            PrinterState::PRINTING => "printing".to_string(),
            PrinterState::PAUSED => "paused".to_string(),
            _ => "unknown".to_string(),
        }
    }

    /// Get printer state reasons as JSON array
    pub fn get_printer_state_reasons(printer: &Printer) -> String {
        // Convert state_reasons Vec to JSON array string
        if printer.state_reasons.is_empty() {
            "[]".to_string()
        } else {
            // Convert each reason to a JSON string array
            let reasons: Vec<String> = printer
                .state_reasons
                .iter()
                .map(|r| format!("\"{}\"", r))
                .collect();
            format!("[{}]", reasons.join(","))
        }
    }

    /// Print a file with optional job properties
    pub fn print_file(
        printer_name: &str,
        file_path: &str,
        job_options: Option<PrinterJobOptions>,
    ) -> Result<JobId, PrintError> {
        // Check if printer exists
        let _printer =
            Self::find_printer_by_name(printer_name).ok_or(PrintError::PrinterNotFound)?;

        // Check if file exists
        if should_simulate_printing() {
            // In simulation mode, simulate different types of errors based on filename
            if file_path.contains("nonexistent") || file_path.contains("does_not_exist") {
                return Err(PrintError::FileNotFound);
            } else if file_path.contains("fail-test") {
                return Err(PrintError::SimulatedFailure);
            }
        } else if !std::path::Path::new(file_path).exists() {
            return Err(PrintError::FileNotFound);
        }

        // Generate job ID
        let job_id = generate_job_id();

        // Extract job options
        let job_options = job_options.unwrap_or_else(PrinterJobOptions::none);

        // Detect media type from file extension
        let media_type = detect_media_type(file_path);

        // Create job name from options or default to GUID
        let job_name = job_options
            .name
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().simple().to_string());

        // Create job status
        let job_status = PrinterJob {
            id: job_id,
            name: job_name,
            state: PrinterJobState::PENDING,
            media_type,
            created_at: SystemTime::now(),
            processed_at: None,
            completed_at: None,
            printer_name: printer_name.to_string(),
            error_message: None,
        };

        // Store job in tracker
        {
            let mut tracker = JOB_TRACKER.lock().unwrap();
            tracker.insert(job_id, job_status.clone());
        }

        // Spawn background thread to handle printing (simplified)
        let printer_name_owned = printer_name.to_string();
        let file_path_owned = file_path.to_string();
        let job_options_owned = Some(job_options);
        let shutdown_flag = SHUTDOWN_FLAG.clone();
        let job_tracker = JOB_TRACKER.clone();

        let handle = thread::spawn(move || {
            Self::handle_print_job_simple(
                job_id,
                printer_name_owned,
                file_path_owned,
                job_options_owned,
                shutdown_flag,
                job_tracker,
            );
        });

        // Store thread handle for cleanup
        {
            let mut handles = THREAD_HANDLES.lock().unwrap();
            handles.push(handle);
        }

        Ok(job_id)
    }

    /// Print raw bytes with optional job properties
    pub fn print_bytes(
        printer_name: &str,
        data: &[u8],
        job_options: Option<PrinterJobOptions>,
    ) -> Result<JobId, PrintError> {
        // Check if printer exists
        let _printer =
            Self::find_printer_by_name(printer_name).ok_or(PrintError::PrinterNotFound)?;

        // Generate job ID
        let job_id = generate_job_id();

        // Extract job options
        let job_options = job_options.unwrap_or_else(PrinterJobOptions::none);

        // Create a temporary file path for tracking (since we're printing bytes)
        let temp_file_path = format!("<bytes:{} bytes>", data.len());

        // Detect media type (raw bytes)
        let media_type = detect_media_type(&temp_file_path);

        // Create job name from options or default
        let job_name = job_options
            .name
            .clone()
            .unwrap_or_else(|| "Raw Bytes Print Job".to_string());

        // Create job status
        let job_status = PrinterJob {
            id: job_id,
            name: job_name,
            state: PrinterJobState::PENDING,
            media_type,
            created_at: SystemTime::now(),
            processed_at: None,
            completed_at: None,
            printer_name: printer_name.to_string(),
            error_message: None,
        };

        // Store job in tracker
        {
            let mut tracker = JOB_TRACKER.lock().unwrap();
            tracker.insert(job_id, job_status.clone());
        }

        // Spawn background thread to handle printing
        let printer_name_owned = printer_name.to_string();
        let data_owned = data.to_vec();
        let job_options_owned = Some(job_options);
        let shutdown_flag = SHUTDOWN_FLAG.clone();
        let job_tracker = JOB_TRACKER.clone();

        let handle = thread::spawn(move || {
            Self::handle_print_bytes_job(
                job_id,
                printer_name_owned,
                data_owned,
                job_options_owned,
                shutdown_flag,
                job_tracker,
            );
        });

        // Store thread handle for cleanup
        {
            let mut handles = THREAD_HANDLES.lock().unwrap();
            handles.push(handle);
        }

        Ok(job_id)
    }

    /// Handle print job (file) - updated with real printing
    fn handle_print_job_simple(
        job_id: JobId,
        printer_name: String,
        file_path: String,
        job_options: Option<PrinterJobOptions>,
        shutdown_flag: Arc<AtomicBool>,
        job_tracker: JobTracker,
    ) {
        // Update status to processing
        {
            let mut tracker = job_tracker.lock().unwrap();
            if let Some(job) = tracker.get_mut(&job_id) {
                job.state = PrinterJobState::PROCESSING;
                job.processed_at = Some(SystemTime::now());
            }
        }

        if should_simulate_printing() {
            // Simulate printing with fixed delay
            let duration_ms = SIMULATION_BASE_TIME_MS + SIMULATION_VARIABLE_TIME_MS / 2;
            let duration = Duration::from_millis(duration_ms);
            let start = Instant::now();

            // Check for shutdown periodically
            while start.elapsed() < duration {
                if shutdown_flag.load(Ordering::Relaxed) {
                    return;
                }
                thread::sleep(Duration::from_millis(100));
            }

            // Always simulate success for simplicity
            let success = true;
            let mut tracker = job_tracker.lock().unwrap();
            if let Some(job) = tracker.get_mut(&job_id) {
                if success {
                    job.state = PrinterJobState::COMPLETED;
                } else {
                    job.state = PrinterJobState::CANCELLED;
                    job.error_message = Some("Simulated print failure".to_string());
                }
                job.completed_at = Some(SystemTime::now());
            }
        } else {
            // Real printing using printers crate
            let raw_options = job_options
                .map(|opts| opts.raw_properties)
                .unwrap_or_default();
            let print_result =
                Self::execute_real_print_job(&printer_name, &file_path, &raw_options);

            let mut tracker = job_tracker.lock().unwrap();
            if let Some(job) = tracker.get_mut(&job_id) {
                match print_result {
                    Ok(_) => {
                        job.state = PrinterJobState::COMPLETED;
                        job.completed_at = Some(SystemTime::now());
                    }
                    Err(error_msg) => {
                        job.state = PrinterJobState::CANCELLED;
                        job.error_message = Some(error_msg);
                        job.completed_at = Some(SystemTime::now());
                    }
                }
            }
        }
    }

    /// Execute actual printing using the printers crate
    fn execute_real_print_job(
        printer_name: &str,
        file_path: &str,
        job_options: &HashMap<String, String>,
    ) -> Result<(), String> {
        // Find the printer
        let printer = get_printer_by_name(printer_name)
            .ok_or_else(|| format!("Printer '{}' not found", printer_name))?;

        // Check if file exists
        if !std::path::Path::new(file_path).exists() {
            return Err(format!("File '{}' not found", file_path));
        }

        // Convert HashMap to upstream PrinterJobOptions
        use printers::common::base::job::PrinterJobOptions as PrinterJobOpts;
        // Execute print with proper lifetime management
        let result = if job_options.is_empty() {
            let job_opts = PrinterJobOpts::none();
            match printer.print_file(file_path, job_opts) {
                Ok(_) => Ok(()),
                Err(e) => Err(format!("Print failed: {}", e)),
            }
        } else {
            // Convert HashMap to slice of tuple references with proper lifetime
            let properties: Vec<(&str, &str)> = job_options
                .iter()
                .map(|(k, v)| (k.as_str(), v.as_str()))
                .collect();

            let job_opts = PrinterJobOpts {
                name: job_options.get("job-name").map(|s| s.as_str()),
                raw_properties: &properties,
            };

            match printer.print_file(file_path, job_opts) {
                Ok(_) => Ok(()),
                Err(e) => Err(format!("Print failed: {}", e)),
            }
        };

        // If print was successful, add delay to keep printer instance alive
        // This prevents premature disposal during data transfer to printer
        if result.is_ok() {
            // Determine delay based on file size and type
            let delay_ms = Self::calculate_print_delay(file_path);
            eprintln!(
                "DEBUG: Applying keep-alive delay for file printing: {}ms",
                delay_ms
            );
            thread::sleep(Duration::from_millis(delay_ms));
        }

        result
    }

    /// Calculate appropriate delay to keep printer instance alive based on file characteristics
    fn calculate_print_delay(file_path: &str) -> u64 {
        let file_size = std::fs::metadata(file_path)
            .map(|metadata| metadata.len())
            .unwrap_or(0);

        // Base delay for small files (minimum 2 seconds)
        let mut delay_ms = 2000;

        // Add delay based on file size (1 second per MB, up to 30 seconds max)
        let size_delay = ((file_size / 1_048_576) * 1000).min(30_000) as u64;
        delay_ms += size_delay;

        // Add extra delay for image files that may need more processing time
        if let Some(extension) = std::path::Path::new(file_path)
            .extension()
            .and_then(|ext| ext.to_str())
        {
            match extension.to_lowercase().as_str() {
                "jpg" | "jpeg" | "png" | "gif" | "bmp" | "tiff" | "tif" => {
                    delay_ms += 3000; // Extra 3 seconds for images
                }
                "pdf" => {
                    delay_ms += 2000; // Extra 2 seconds for PDFs
                }
                _ => {}
            }
        }

        delay_ms
    }

    /// Calculate appropriate delay for raw bytes printing to keep printer instance alive
    fn calculate_bytes_print_delay(data_size: usize) -> u64 {
        // Base delay for small data (minimum 2 seconds)
        let mut delay_ms = 2000;

        // Add delay based on data size (1 second per MB, up to 30 seconds max)
        let size_delay = ((data_size / 1_048_576) * 1000).min(30_000) as u64;
        delay_ms += size_delay;

        // Add extra delay for larger raw data that might be images or complex documents
        if data_size > 5_242_880 {
            // > 5MB
            delay_ms += 3000; // Extra 3 seconds for large data
        } else if data_size > 1_048_576 {
            // > 1MB
            delay_ms += 1500; // Extra 1.5 seconds for medium data
        }

        delay_ms
    }

    /// Execute actual byte printing using the printers crate
    fn execute_real_print_bytes(
        printer_name: &str,
        data: &[u8],
        job_options: &HashMap<String, String>,
    ) -> Result<(), String> {
        // Find the printer
        let printer = get_printer_by_name(printer_name)
            .ok_or_else(|| format!("Printer '{}' not found", printer_name))?;

        // Execute the print job with raw bytes - use temp file approach
        let result = match std::fs::write("/tmp/temp_print_data", data) {
            Ok(_) => {
                // Convert HashMap to upstream PrinterJobOptions
                use printers::common::base::job::PrinterJobOptions as PrinterJobOpts;
                // Execute print with proper lifetime management
                let print_result = if job_options.is_empty() {
                    let job_opts = PrinterJobOpts::none();
                    match printer.print_file("/tmp/temp_print_data", job_opts) {
                        Ok(_) => Ok(()),
                        Err(e) => Err(format!("Byte print failed: {}", e)),
                    }
                } else {
                    // Convert HashMap to slice of tuple references with proper lifetime
                    let properties: Vec<(&str, &str)> = job_options
                        .iter()
                        .map(|(k, v)| (k.as_str(), v.as_str()))
                        .collect();

                    let job_opts = PrinterJobOpts {
                        name: job_options.get("job-name").map(|s| s.as_str()),
                        raw_properties: &properties,
                    };

                    match printer.print_file("/tmp/temp_print_data", job_opts) {
                        Ok(_) => Ok(()),
                        Err(e) => Err(format!("Byte print failed: {}", e)),
                    }
                };

                // Clean up temp file regardless of result
                let _ = std::fs::remove_file("/tmp/temp_print_data");

                // If print was successful, add delay to keep printer instance alive
                if print_result.is_ok() {
                    // Calculate delay based on data size (bytes printing)
                    let delay_ms = Self::calculate_bytes_print_delay(data.len());
                    eprintln!(
                        "DEBUG: Applying keep-alive delay for bytes printing: {}ms",
                        delay_ms
                    );
                    thread::sleep(Duration::from_millis(delay_ms));
                }

                print_result
            }
            Err(e) => Err(format!("Failed to write temp file: {}", e)),
        };

        result
    }

    /// Handle print bytes job
    fn handle_print_bytes_job(
        job_id: JobId,
        printer_name: String,
        data: Vec<u8>,
        job_options: Option<PrinterJobOptions>,
        shutdown_flag: Arc<AtomicBool>,
        job_tracker: JobTracker,
    ) {
        // Update status to processing
        {
            let mut tracker = job_tracker.lock().unwrap();
            if let Some(job) = tracker.get_mut(&job_id) {
                job.state = PrinterJobState::PROCESSING;
                job.processed_at = Some(SystemTime::now());
            }
        }

        if should_simulate_printing() {
            // Simulate printing with fixed delay
            let duration_ms = SIMULATION_BASE_TIME_MS + SIMULATION_VARIABLE_TIME_MS / 2;
            let duration = Duration::from_millis(duration_ms);
            let start = Instant::now();

            // Check for shutdown periodically
            while start.elapsed() < duration {
                if shutdown_flag.load(Ordering::Relaxed) {
                    return;
                }
                thread::sleep(Duration::from_millis(100));
            }

            // Always simulate success for simplicity
            let success = true;
            let mut tracker = job_tracker.lock().unwrap();
            if let Some(job) = tracker.get_mut(&job_id) {
                if success {
                    job.state = PrinterJobState::COMPLETED;
                } else {
                    job.state = PrinterJobState::CANCELLED;
                    job.error_message = Some("Simulated print failure".to_string());
                }
                job.completed_at = Some(SystemTime::now());
            }
        } else {
            // Real printing using printers crate
            let raw_options = job_options
                .map(|opts| opts.raw_properties)
                .unwrap_or_default();
            let print_result = Self::execute_real_print_bytes(&printer_name, &data, &raw_options);

            let mut tracker = job_tracker.lock().unwrap();
            if let Some(job) = tracker.get_mut(&job_id) {
                match print_result {
                    Ok(_) => {
                        job.state = PrinterJobState::COMPLETED;
                        job.completed_at = Some(SystemTime::now());
                    }
                    Err(error_msg) => {
                        job.state = PrinterJobState::CANCELLED;
                        job.error_message = Some(error_msg);
                        job.completed_at = Some(SystemTime::now());
                    }
                }
            }
        }
    }

    /// Get job status
    pub fn get_job_status(job_id: JobId) -> Option<PrinterJob> {
        let tracker = JOB_TRACKER.lock().unwrap();
        tracker.get(&job_id).cloned()
    }

    /// Get all active jobs (pending or processing)
    pub fn get_active_jobs() -> Vec<PrinterJob> {
        let tracker = JOB_TRACKER.lock().unwrap();
        tracker
            .values()
            .filter(|job| {
                matches!(
                    job.state,
                    PrinterJobState::PENDING
                        | PrinterJobState::PROCESSING
                        | PrinterJobState::PAUSED
                )
            })
            .cloned()
            .collect()
    }

    /// Get active jobs for a specific printer
    pub fn get_active_jobs_for_printer(printer_name: &str) -> Vec<PrinterJob> {
        let tracker = JOB_TRACKER.lock().unwrap();
        tracker
            .values()
            .filter(|job| {
                job.printer_name == printer_name
                    && matches!(
                        job.state,
                        PrinterJobState::PENDING
                            | PrinterJobState::PROCESSING
                            | PrinterJobState::PAUSED
                    )
            })
            .cloned()
            .collect()
    }

    /// Get job history (completed or cancelled jobs)
    pub fn get_job_history() -> Vec<PrinterJob> {
        let tracker = JOB_TRACKER.lock().unwrap();
        tracker
            .values()
            .filter(|job| {
                matches!(
                    job.state,
                    PrinterJobState::COMPLETED | PrinterJobState::CANCELLED
                )
            })
            .cloned()
            .collect()
    }

    /// Get job history for a specific printer
    pub fn get_job_history_for_printer(printer_name: &str) -> Vec<PrinterJob> {
        let tracker = JOB_TRACKER.lock().unwrap();
        tracker
            .values()
            .filter(|job| {
                job.printer_name == printer_name
                    && matches!(
                        job.state,
                        PrinterJobState::COMPLETED | PrinterJobState::CANCELLED
                    )
            })
            .cloned()
            .collect()
    }

    /// Get all jobs for a specific printer
    pub fn get_all_jobs_for_printer(printer_name: &str) -> Vec<PrinterJob> {
        let tracker = JOB_TRACKER.lock().unwrap();
        tracker
            .values()
            .filter(|job| job.printer_name == printer_name)
            .cloned()
            .collect()
    }

    /// Clean up old completed/failed jobs
    pub fn cleanup_old_jobs(max_age_seconds: u64) -> u32 {
        let mut tracker = JOB_TRACKER.lock().unwrap();
        let max_age = Duration::from_secs(max_age_seconds);
        let mut removed_count = 0;

        tracker.retain(|_, job| {
            let should_keep = job.created_at.elapsed().unwrap_or(Duration::from_secs(0)) < max_age
                || (job.state != PrinterJobState::COMPLETED
                    && job.state != PrinterJobState::CANCELLED);
            if !should_keep {
                removed_count += 1;
            }
            should_keep
        });

        removed_count
    }

    /// Shutdown the library and cleanup all background threads
    pub fn shutdown_library() {
        // Set shutdown flag
        SHUTDOWN_FLAG.store(true, Ordering::Relaxed);

        // Wait for all threads to complete (with timeout)
        let mut handles = THREAD_HANDLES.lock().unwrap();
        let timeout = Duration::from_secs(5);
        let start = Instant::now();

        while !handles.is_empty() && start.elapsed() < timeout {
            // Take ownership of handles
            let current_handles: Vec<_> = handles.drain(..).collect();

            for handle in current_handles {
                let _ = handle.join();
            }

            if !handles.is_empty() {
                thread::sleep(Duration::from_millis(100));
            }
        }

        // Clear job tracker
        let mut tracker = JOB_TRACKER.lock().unwrap();
        tracker.clear();

        // Reset shutdown flag for potential reuse
        SHUTDOWN_FLAG.store(false, Ordering::Relaxed);
    }
}

/// Extended functionality for Printer objects
pub trait PrinterJobTracking {
    /// Get active jobs for this printer
    fn get_active_jobs(&self) -> Vec<PrinterJob>;

    /// Get job history for this printer
    fn get_job_history(&self, limit: Option<usize>) -> Vec<PrinterJob>;

    /// Get a specific job by ID (only if it belongs to this printer)
    fn get_job(&self, job_id: JobId) -> Option<PrinterJob>;

    /// Get all jobs for this printer
    fn get_all_jobs(&self) -> Vec<PrinterJob>;

    /// Clean up old jobs for this printer
    fn cleanup_old_jobs(&self, max_age_seconds: u64) -> u32;
}

impl PrinterJobTracking for Printer {
    fn get_active_jobs(&self) -> Vec<PrinterJob> {
        let tracker = JOB_TRACKER.lock().unwrap();
        tracker
            .values()
            .filter(|job| {
                job.printer_name == self.name
                    && !matches!(
                        job.state,
                        PrinterJobState::COMPLETED | PrinterJobState::CANCELLED
                    )
            })
            .cloned()
            .collect()
    }

    fn get_job_history(&self, limit: Option<usize>) -> Vec<PrinterJob> {
        let tracker = JOB_TRACKER.lock().unwrap();
        let mut jobs: Vec<_> = tracker
            .values()
            .filter(|job| {
                job.printer_name == self.name
                    && matches!(
                        job.state,
                        PrinterJobState::COMPLETED | PrinterJobState::CANCELLED
                    )
            })
            .cloned()
            .collect();

        // Sort by creation time (most recent first)
        jobs.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        if let Some(limit) = limit {
            jobs.truncate(limit);
        }

        jobs
    }

    fn get_job(&self, job_id: JobId) -> Option<PrinterJob> {
        let tracker = JOB_TRACKER.lock().unwrap();
        tracker
            .get(&job_id)
            .filter(|job| job.printer_name == self.name)
            .cloned()
    }

    fn get_all_jobs(&self) -> Vec<PrinterJob> {
        let tracker = JOB_TRACKER.lock().unwrap();
        tracker
            .values()
            .filter(|job| job.printer_name == self.name)
            .cloned()
            .collect()
    }

    fn cleanup_old_jobs(&self, max_age_seconds: u64) -> u32 {
        let mut tracker = JOB_TRACKER.lock().unwrap();
        let max_age = Duration::from_secs(max_age_seconds);
        let mut removed_count = 0;

        tracker.retain(|_, job| {
            let should_remove = job.printer_name == self.name
                && job.created_at.elapsed().unwrap_or(Duration::from_secs(0)) >= max_age
                && (job.state == PrinterJobState::COMPLETED
                    || job.state == PrinterJobState::CANCELLED);

            if should_remove {
                removed_count += 1;
                false
            } else {
                true
            }
        });

        removed_count
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;
    use serial_test::serial;
    use std::env;

    #[test]
    fn test_media_type_detection_additional() {
        assert_eq!(detect_media_type("document.pdf"), "application/pdf");
        assert_eq!(detect_media_type("script.ps"), "application/postscript");
        assert_eq!(detect_media_type("image.jpg"), "image/jpeg");
        assert_eq!(detect_media_type("image.jpeg"), "image/jpeg");
        assert_eq!(detect_media_type("image.png"), "image/png");
        assert_eq!(detect_media_type("image.gif"), "image/gif");
        assert_eq!(detect_media_type("file.txt"), "text/plain");
        assert_eq!(detect_media_type("file.text"), "text/plain");
        assert_eq!(detect_media_type("unknown.xyz"), "application/octet-stream");
        assert_eq!(
            detect_media_type("no_extension"),
            "application/octet-stream"
        );
        assert_eq!(
            detect_media_type("<bytes:1024 bytes>"),
            "application/vnd.cups-raw"
        );
    }

    #[test]
    fn test_printer_job_state_string_conversions() {
        assert_eq!(PrinterJobState::PENDING.as_string(), "pending");
        assert_eq!(PrinterJobState::PAUSED.as_string(), "paused");
        assert_eq!(PrinterJobState::PROCESSING.as_string(), "processing");
        assert_eq!(PrinterJobState::CANCELLED.as_string(), "cancelled");
        assert_eq!(PrinterJobState::COMPLETED.as_string(), "completed");
        assert_eq!(PrinterJobState::UNKNOWN.as_string(), "unknown");
    }

    #[test]
    #[serial]
    fn test_job_state_tracking() {
        env::set_var("PRINTERS_JS_SIMULATE", "true");

        // Clear any existing jobs
        PrinterCore::cleanup_old_jobs(0);

        let job_id = generate_job_id();
        let initial_job = PrinterJob {
            id: job_id,
            name: "State Transition Test".to_string(),
            state: PrinterJobState::PENDING,
            media_type: "application/pdf".to_string(),
            created_at: SystemTime::now(),
            processed_at: None,
            completed_at: None,
            printer_name: "Simulated Printer".to_string(),
            error_message: None,
        };

        // Insert initial job
        {
            let mut tracker = JOB_TRACKER.lock().unwrap();
            tracker.insert(job_id, initial_job);
        }

        // Verify initial state
        let job = PrinterCore::get_job_status(job_id).unwrap();
        assert_eq!(job.state, PrinterJobState::PENDING);
        assert!(job.processed_at.is_none());
        assert!(job.completed_at.is_none());

        // Transition to processing
        {
            let mut tracker = JOB_TRACKER.lock().unwrap();
            if let Some(job) = tracker.get_mut(&job_id) {
                job.state = PrinterJobState::PROCESSING;
                job.processed_at = Some(SystemTime::now());
            }
        }

        let job = PrinterCore::get_job_status(job_id).unwrap();
        assert_eq!(job.state, PrinterJobState::PROCESSING);
        assert!(job.processed_at.is_some());
        assert!(job.completed_at.is_none());

        // Transition to completed
        {
            let mut tracker = JOB_TRACKER.lock().unwrap();
            if let Some(job) = tracker.get_mut(&job_id) {
                job.state = PrinterJobState::COMPLETED;
                job.completed_at = Some(SystemTime::now());
            }
        }

        let job = PrinterCore::get_job_status(job_id).unwrap();
        assert_eq!(job.state, PrinterJobState::COMPLETED);
        assert!(job.processed_at.is_some());
        assert!(job.completed_at.is_some());

        // Cleanup
        PrinterCore::cleanup_old_jobs(0);
    }

    #[test]
    #[serial]
    fn test_job_options_creation_and_parsing() {
        // Test none()
        let none_options = PrinterJobOptions::none();
        assert!(none_options.name.is_none());
        assert!(none_options.raw_properties.is_empty());

        // Test from_map with job-name
        let mut properties = HashMap::new();
        properties.insert("job-name".to_string(), "Test Job".to_string());
        properties.insert("copies".to_string(), "2".to_string());

        let options = PrinterJobOptions::from_map(properties);
        assert_eq!(options.name, Some("Test Job".to_string()));
        assert_eq!(options.raw_properties.get("copies"), Some(&"2".to_string()));
        assert!(!options.raw_properties.contains_key("job-name")); // Should be extracted

        // Test from_map without job-name
        let mut properties = HashMap::new();
        properties.insert("copies".to_string(), "3".to_string());

        let options = PrinterJobOptions::from_map(properties);
        assert!(options.name.is_none());
        assert_eq!(options.raw_properties.get("copies"), Some(&"3".to_string()));

        // Test with_name_and_properties
        let mut properties = HashMap::new();
        properties.insert("quality".to_string(), "high".to_string());

        let options =
            PrinterJobOptions::with_name_and_properties("Named Job".to_string(), properties);
        assert_eq!(options.name, Some("Named Job".to_string()));
        assert_eq!(
            options.raw_properties.get("quality"),
            Some(&"high".to_string())
        );
    }

    #[test]
    #[serial]
    fn test_json_status_creation() {
        let job = PrinterJob {
            id: 1234,
            name: "Test Job".to_string(),
            state: PrinterJobState::COMPLETED,
            media_type: "application/pdf".to_string(),
            created_at: SystemTime::now() - Duration::from_secs(10),
            processed_at: Some(SystemTime::now() - Duration::from_secs(8)),
            completed_at: Some(SystemTime::now() - Duration::from_secs(5)),
            printer_name: "Test Printer".to_string(),
            error_message: Some("Test error".to_string()),
        };

        let json_str = create_status_json(1234, &job).unwrap();
        let json_value: serde_json::Value = serde_json::from_str(&json_str).unwrap();

        assert_eq!(json_value["id"], 1234);
        assert_eq!(json_value["name"], "Test Job");
        assert_eq!(json_value["state"], "completed");
        assert_eq!(json_value["media_type"], "application/pdf");
        assert_eq!(json_value["printer_name"], "Test Printer");
        assert_eq!(json_value["error_message"], "Test error");
        assert!(json_value["created_at"].is_number());
        assert!(json_value["processed_at"].is_number());
        assert!(json_value["completed_at"].is_number());
        assert!(json_value["age_seconds"].is_number());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;
    use std::env;

    #[test]
    #[serial]
    fn test_should_simulate_printing_when_env_var_is_true() {
        env::set_var("PRINTERS_JS_SIMULATE", "true");
        assert!(should_simulate_printing());
    }

    #[test]
    #[serial]
    fn test_should_simulate_printing_when_env_var_is_false() {
        // Store original value to restore later
        let original = env::var("PRINTERS_JS_SIMULATE").ok();

        env::set_var("PRINTERS_JS_SIMULATE", "false");
        assert!(!should_simulate_printing());

        // Restore original environment state
        match original {
            Some(val) => env::set_var("PRINTERS_JS_SIMULATE", val),
            None => env::remove_var("PRINTERS_JS_SIMULATE"),
        }
    }

    #[test]
    #[serial]
    fn test_should_simulate_printing_when_env_var_is_missing() {
        // Store original value to restore later
        let original = env::var("PRINTERS_JS_SIMULATE").ok();

        env::remove_var("PRINTERS_JS_SIMULATE");
        assert!(!should_simulate_printing());

        // Restore original environment state
        if let Some(val) = original {
            env::set_var("PRINTERS_JS_SIMULATE", val);
        }
    }

    #[test]
    #[serial]
    fn test_get_all_printer_names_in_simulation_mode() {
        env::set_var("PRINTERS_JS_SIMULATE", "true");
        let names = PrinterCore::get_all_printer_names();
        assert_eq!(names, vec!["Simulated Printer"]);
    }

    #[test]
    #[serial]
    fn test_printer_exists_in_simulation_mode() {
        env::set_var("PRINTERS_JS_SIMULATE", "true");
        assert!(PrinterCore::printer_exists("Simulated Printer"));
        assert!(!PrinterCore::printer_exists("NonExistent Printer"));
    }

    #[test]
    #[serial]
    fn test_find_printer_by_name_in_simulation_mode() {
        env::set_var("PRINTERS_JS_SIMULATE", "true");
        let printer = PrinterCore::find_printer_by_name("Simulated Printer");
        assert!(printer.is_some());

        let printer = PrinterCore::find_printer_by_name("NonExistent Printer");
        assert!(printer.is_none());
    }

    #[test]
    #[serial]
    fn test_print_file_error_codes() {
        env::set_var("PRINTERS_JS_SIMULATE", "true");

        // Test successful print job
        let result = PrinterCore::print_file("Simulated Printer", "/path/to/file.pdf", None);
        assert!(result.is_ok());

        // Test with file that should trigger file not found error
        let result = PrinterCore::print_file(
            "Simulated Printer",
            "/path/that/does_not_exist/file.pdf",
            None,
        );
        assert_eq!(result, Err(PrintError::FileNotFound));

        // Test with file that should trigger simulated failure
        let result = PrinterCore::print_file("Simulated Printer", "/path/to/fail-test.pdf", None);
        assert_eq!(result, Err(PrintError::SimulatedFailure));

        // Test print bytes
        let data = b"Hello, printer!";
        let result = PrinterCore::print_bytes("Simulated Printer", data, None);
        assert!(result.is_ok());

        // Test print with job options
        let job_options = Some(PrinterJobOptions::with_name_and_properties(
            "Test Job".to_string(),
            [("copies".to_string(), "2".to_string())]
                .iter()
                .cloned()
                .collect(),
        ));
        let result = PrinterCore::print_file("Simulated Printer", "/path/to/file.pdf", job_options);
        assert!(result.is_ok());
    }

    #[test]
    fn test_print_error_codes() {
        assert_eq!(PrintError::InvalidParams.as_i32(), 1);
        assert_eq!(PrintError::InvalidPrinterName.as_i32(), 2);
        assert_eq!(PrintError::InvalidFilePath.as_i32(), 3);
        assert_eq!(PrintError::InvalidJson.as_i32(), 4);
        assert_eq!(PrintError::InvalidJsonEncoding.as_i32(), 5);
        assert_eq!(PrintError::PrinterNotFound.as_i32(), 6);
        assert_eq!(PrintError::FileNotFound.as_i32(), 7);
        assert_eq!(PrintError::SimulatedFailure.as_i32(), 8);
    }

    #[test]
    fn test_media_type_detection() {
        assert_eq!(detect_media_type("document.pdf"), "application/pdf");
        assert_eq!(detect_media_type("script.ps"), "application/postscript");
        assert_eq!(detect_media_type("image.jpg"), "image/jpeg");
        assert_eq!(detect_media_type("image.jpeg"), "image/jpeg");
        assert_eq!(detect_media_type("image.png"), "image/png");
        assert_eq!(detect_media_type("image.gif"), "image/gif");
        assert_eq!(detect_media_type("file.txt"), "text/plain");
        assert_eq!(detect_media_type("file.text"), "text/plain");
        assert_eq!(detect_media_type("unknown.xyz"), "application/octet-stream");
        assert_eq!(
            detect_media_type("no_extension"),
            "application/octet-stream"
        );
        assert_eq!(
            detect_media_type("<bytes:1024 bytes>"),
            "application/vnd.cups-raw"
        );
    }

    #[test]
    fn test_printer_job_state_conversions() {
        assert_eq!(PrinterJobState::PENDING.as_string(), "pending");
        assert_eq!(PrinterJobState::PAUSED.as_string(), "paused");
        assert_eq!(PrinterJobState::PROCESSING.as_string(), "processing");
        assert_eq!(PrinterJobState::CANCELLED.as_string(), "cancelled");
        assert_eq!(PrinterJobState::COMPLETED.as_string(), "completed");
        assert_eq!(PrinterJobState::UNKNOWN.as_string(), "unknown");
    }

    #[test]
    #[serial]
    fn test_job_options_creation() {
        // Test none()
        let none_options = PrinterJobOptions::none();
        assert!(none_options.name.is_none());
        assert!(none_options.raw_properties.is_empty());

        // Test from_map with job-name
        let mut properties = HashMap::new();
        properties.insert("job-name".to_string(), "Test Job".to_string());
        properties.insert("copies".to_string(), "2".to_string());

        let options = PrinterJobOptions::from_map(properties);
        assert_eq!(options.name, Some("Test Job".to_string()));
        assert_eq!(options.raw_properties.get("copies"), Some(&"2".to_string()));
        assert!(!options.raw_properties.contains_key("job-name")); // Should be extracted

        // Test from_map without job-name
        let mut properties = HashMap::new();
        properties.insert("copies".to_string(), "3".to_string());

        let options = PrinterJobOptions::from_map(properties);
        assert!(options.name.is_none());
        assert_eq!(options.raw_properties.get("copies"), Some(&"3".to_string()));

        // Test with_name_and_properties
        let mut properties = HashMap::new();
        properties.insert("quality".to_string(), "high".to_string());

        let options =
            PrinterJobOptions::with_name_and_properties("Named Job".to_string(), properties);
        assert_eq!(options.name, Some("Named Job".to_string()));
        assert_eq!(
            options.raw_properties.get("quality"),
            Some(&"high".to_string())
        );
    }

    #[test]
    #[serial]
    fn test_create_status_json() {
        let job = PrinterJob {
            id: 1234,
            name: "Test Job".to_string(),
            state: PrinterJobState::COMPLETED,
            media_type: "application/pdf".to_string(),
            created_at: SystemTime::now() - Duration::from_secs(10),
            processed_at: Some(SystemTime::now() - Duration::from_secs(8)),
            completed_at: Some(SystemTime::now() - Duration::from_secs(5)),
            printer_name: "Test Printer".to_string(),
            error_message: Some("Test error".to_string()),
        };

        let json_str = create_status_json(1234, &job).unwrap();
        let json_value: serde_json::Value = serde_json::from_str(&json_str).unwrap();

        assert_eq!(json_value["id"], 1234);
        assert_eq!(json_value["name"], "Test Job");
        assert_eq!(json_value["state"], "completed");
        assert_eq!(json_value["media_type"], "application/pdf");
        assert_eq!(json_value["printer_name"], "Test Printer");
        assert_eq!(json_value["error_message"], "Test error");
        assert!(json_value["created_at"].is_number());
        assert!(json_value["processed_at"].is_number());
        assert!(json_value["completed_at"].is_number());
        assert!(json_value["age_seconds"].is_number());
    }
}
