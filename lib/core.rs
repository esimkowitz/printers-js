use printers::common::base::printer::Printer;
use printers::get_printer_by_name;
use std::collections::HashMap;
use std::env;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

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
pub type JobId = u32;
type JobTracker = Arc<Mutex<HashMap<JobId, JobStatus>>>;
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

#[derive(Clone, Debug)]
pub struct JobStatus {
    pub printer_name: String,
    pub file_path: String,
    pub status: String, // "queued", "printing", "completed", "failed"
    pub error_message: Option<String>,
    pub created_at: Instant,
}

/// Create a JSON status object for a job
pub fn create_status_json(job_id: JobId, job: &JobStatus) -> Option<String> {
    let status_obj = serde_json::json!({
        "id": job_id,
        "printer_name": job.printer_name,
        "file_path": job.file_path,
        "status": job.status,
        "error_message": job.error_message,
        "age_seconds": job.created_at.elapsed().as_secs()
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
                    Some(printer)
                } else {
                    // No real printers available - create a mock printer struct
                    Some(Printer {
                        name: name.to_string(),
                        system_name: name.to_string(),
                        driver_name: "Mock Driver".to_string(),
                        uri: "mock://printer".to_string(),
                        location: "Test Location".to_string(),
                        description: "Mock printer for testing".to_string(),
                        port_name: "MOCK:".to_string(),
                        processor: "Mock Processor".to_string(),
                        data_type: "RAW".to_string(),
                        is_shared: false,
                        is_default: false,
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
    pub fn get_printer_state(_printer: &Printer) -> String {
        "idle".to_string()
    }

    /// Get printer state reasons as JSON array
    pub fn get_printer_state_reasons(_printer: &Printer) -> String {
        "[]".to_string()
    }

    /// Print a file with optional job properties (simplified for now)
    pub fn print_file(
        printer_name: &str,
        file_path: &str,
        _job_properties: Option<HashMap<String, String>>,
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

        // Create job status
        let job_status = JobStatus {
            printer_name: printer_name.to_string(),
            file_path: file_path.to_string(),
            status: "queued".to_string(),
            error_message: None,
            created_at: Instant::now(),
        };

        // Store job in tracker
        {
            let mut tracker = JOB_TRACKER.lock().unwrap();
            tracker.insert(job_id, job_status.clone());
        }

        // Spawn background thread to handle printing (simplified)
        let printer_name_owned = printer_name.to_string();
        let file_path_owned = file_path.to_string();
        let shutdown_flag = SHUTDOWN_FLAG.clone();
        let job_tracker = JOB_TRACKER.clone();

        let handle = thread::spawn(move || {
            Self::handle_print_job_simple(
                job_id,
                printer_name_owned,
                file_path_owned,
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

    /// Simplified print job handler
    fn handle_print_job_simple(
        job_id: JobId,
        _printer_name: String,
        _file_path: String,
        shutdown_flag: Arc<AtomicBool>,
        job_tracker: JobTracker,
    ) {
        // Update status to printing
        {
            let mut tracker = job_tracker.lock().unwrap();
            if let Some(job) = tracker.get_mut(&job_id) {
                job.status = "printing".to_string();
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
                    job.status = "completed".to_string();
                } else {
                    job.status = "failed".to_string();
                    job.error_message = Some("Simulated print failure".to_string());
                }
            }
        } else {
            // For now, just mark as completed in real mode
            // TODO: Implement actual printing logic
            let mut tracker = job_tracker.lock().unwrap();
            if let Some(job) = tracker.get_mut(&job_id) {
                job.status = "completed".to_string();
            }
        }
    }

    /// Get job status
    pub fn get_job_status(job_id: JobId) -> Option<JobStatus> {
        let tracker = JOB_TRACKER.lock().unwrap();
        tracker.get(&job_id).cloned()
    }

    /// Clean up old completed/failed jobs
    pub fn cleanup_old_jobs(max_age_seconds: u64) -> u32 {
        let mut tracker = JOB_TRACKER.lock().unwrap();
        let max_age = Duration::from_secs(max_age_seconds);
        let mut removed_count = 0;

        tracker.retain(|_, job| {
            let should_keep = job.created_at.elapsed() < max_age
                || (job.status != "completed" && job.status != "failed");
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
}
