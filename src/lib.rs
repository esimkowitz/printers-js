use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use std::env;
use printers::{get_printer_by_name};
use printers::common::base::printer::Printer;
use printers::common::base::job::{PrinterJobOptions, PrinterJobState};

/// Error codes for the printing operations
#[repr(i32)]
#[derive(Debug, Clone, Copy)]
pub enum PrintError {
    InvalidParams = 1,
    InvalidPrinterName = 2,
    InvalidFilePath = 3,
    InvalidJson = 4,
    InvalidJsonEncoding = 5,
    PrinterNotFound = 6,
    FileNotFound = 7,
}

impl PrintError {
    pub fn as_i32(self) -> i32 {
        self as i32
    }
}

// Timing constants for simulation mode
const SIMULATION_BASE_TIME_MS: u64 = 1000;
const SIMULATION_VARIABLE_TIME_MS: u64 = 2000;
const JOB_MONITORING_INTERVAL_MS: u64 = 500;

// Type aliases for better readability
type JobId = u32;
type JobTracker = Arc<Mutex<HashMap<JobId, JobStatus>>>;
type JobIdGenerator = Arc<Mutex<JobId>>;

/// Check if we should use simulated printing (for testing)
fn should_simulate_printing() -> bool {
    env::var("DENO_PRINTERS_SIMULATE").unwrap_or_default() == "true"
}

/// Convert a C string pointer to a Rust String, returning an error code on failure
unsafe fn c_str_to_string(ptr: *const c_char, error_code: PrintError) -> Result<String, i32> {
    if ptr.is_null() {
        return Err(PrintError::InvalidParams.as_i32());
    }
    
    match CStr::from_ptr(ptr).to_str() {
        Ok(s) => Ok(s.to_string()),
        Err(_) => Err(error_code.as_i32()),
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
}

#[derive(Clone, Debug)]
struct JobStatus {
    printer_name: String,
    file_path: String,
    status: String, // "queued", "printing", "completed", "failed"
    error_message: Option<String>,
    created_at: Instant,
    real_job_id: Option<u64>, // Job ID from the printers crate
    printer: Option<Printer>, // Keep a reference to the printer for monitoring
}

/// Create a JSON status object for a job
fn create_status_json(job_id: JobId, job: &JobStatus) -> Option<String> {
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

/// Print a file to a specific printer (non-blocking)
/// 
/// Returns positive job ID on success, negative error code on failure.
/// Use `get_job_status()` to monitor progress.
/// 
/// # Safety
/// Caller must ensure valid null-terminated C strings for printer_name_ptr and file_path_ptr.
/// job_properties_json_ptr can be null.
#[no_mangle]
pub unsafe extern "C" fn print_file(
    printer_name_ptr: *const c_char,
    file_path_ptr: *const c_char,
    job_properties_json_ptr: *const c_char,
) -> i32 {
    if printer_name_ptr.is_null() || file_path_ptr.is_null() {
        return PrintError::InvalidParams.as_i32();
    }
    
    let printer_name = match c_str_to_string(printer_name_ptr, PrintError::InvalidPrinterName) {
        Ok(s) => s,
        Err(code) => return code,
    };
    
    let file_path = match c_str_to_string(file_path_ptr, PrintError::InvalidFilePath) {
        Ok(s) => s,
        Err(code) => return code,
    };
    
    // Parse job properties if provided
    let _job_properties: Option<serde_json::Value> = if !job_properties_json_ptr.is_null() {
        match CStr::from_ptr(job_properties_json_ptr).to_str() {
            Ok(json_str) => {
                match serde_json::from_str(json_str) {
                    Ok(props) => Some(props),
                    Err(_) => return PrintError::InvalidJson.as_i32(),
                }
            }
            Err(_) => return PrintError::InvalidJsonEncoding.as_i32(),
        }
    } else {
        None
    };
    
    // Check if printer exists
    let printers = printers::get_printers();
    let _printer = match printers.iter().find(|p| p.name == printer_name) {
        Some(p) => p,
        None => return PrintError::PrinterNotFound.as_i32(),
    };
    
    // Check if file exists
    if !std::path::Path::new(&file_path).exists() {
        return PrintError::FileNotFound.as_i32();
    }
    
    // Generate job ID
    let job_id = generate_job_id();
    
    // Create job status
    let job_status = JobStatus {
        printer_name: printer_name.clone(),
        file_path: file_path.clone(),
        status: "queued".to_string(),
        error_message: None,
        created_at: Instant::now(),
        real_job_id: None,
        printer: None,
    };
    
    // Store job in tracker
    {
        let mut tracker = JOB_TRACKER.lock().unwrap();
        tracker.insert(job_id, job_status);
    }
    
    // Start printing in background thread
    let printer_name_bg = printer_name.clone();
    let file_path_bg = file_path.clone();
    let job_tracker = JOB_TRACKER.clone();
    
    thread::spawn(move || {
        // Update status to printing
        {
            let mut tracker = job_tracker.lock().unwrap();
            if let Some(job) = tracker.get_mut(&job_id) {
                job.status = "printing".to_string();
            }
        }
        
        // Check if we should simulate printing
        if should_simulate_printing() {
            // Simulate printing time (1-3 seconds)
            thread::sleep(Duration::from_millis(SIMULATION_BASE_TIME_MS + (job_id as u64 % SIMULATION_VARIABLE_TIME_MS)));
            
            // Simulate success/failure based on file name
            let mut tracker = job_tracker.lock().unwrap();
            if let Some(job) = tracker.get_mut(&job_id) {
                if file_path_bg.contains("fail") || file_path_bg.contains("nonexistent") {
                    job.status = "failed".to_string();
                    job.error_message = Some("Simulated failure - file not found".to_string());
                } else {
                    job.status = "completed".to_string();
                }
            }
            return;
        }
        
        // Real printing mode - get the printer instance
        let printer = match get_printer_by_name(&printer_name_bg) {
            Some(p) => p,
            None => {
                let mut tracker = job_tracker.lock().unwrap();
                if let Some(job) = tracker.get_mut(&job_id) {
                    job.status = "failed".to_string();
                    job.error_message = Some("Printer not found".to_string());
                }
                return;
            }
        };
        
        // Store printer reference
        {
            let mut tracker = job_tracker.lock().unwrap();
            if let Some(job) = tracker.get_mut(&job_id) {
                job.printer = Some(printer.clone());
            }
        }
        
        // Create print job options
        let file_name = std::path::Path::new(&file_path_bg)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("print_job");
        
        let job_options = PrinterJobOptions {
            name: Some(file_name),
            raw_properties: &[],
        };
        
        // Submit print job
        match printer.print_file(&file_path_bg, job_options) {
            Ok(real_job_id) => {
                // Store real job ID
                {
                    let mut tracker = job_tracker.lock().unwrap();
                    if let Some(job) = tracker.get_mut(&job_id) {
                        job.real_job_id = Some(real_job_id);
                    }
                }
                
                // Monitor job completion
                loop {
                    thread::sleep(Duration::from_millis(JOB_MONITORING_INTERVAL_MS));
                    
                    let active_jobs = printer.get_active_jobs();
                    let job_still_active = active_jobs.iter().any(|j| j.id == real_job_id);
                    
                    if !job_still_active {
                        let job_history = printer.get_job_history();
                        let mut tracker = job_tracker.lock().unwrap();
                        if let Some(job) = tracker.get_mut(&job_id) {
                            if let Some(finished_job) = job_history.iter().find(|j| j.id == real_job_id) {
                                match finished_job.state {
                                    PrinterJobState::COMPLETED => job.status = "completed".to_string(),
                                    PrinterJobState::CANCELLED => {
                                        job.status = "failed".to_string();
                                        job.error_message = Some("Job was cancelled".to_string());
                                    },
                                    _ => {
                                        job.status = "failed".to_string();
                                        job.error_message = Some(format!("Job ended with state: {:?}", finished_job.state));
                                    }
                                }
                            } else {
                                // Job not found in history, assume success
                                job.status = "completed".to_string();
                            }
                        }
                        break;
                    }
                }
            },
            Err(error_msg) => {
                let mut tracker = job_tracker.lock().unwrap();
                if let Some(job) = tracker.get_mut(&job_id) {
                    job.status = "failed".to_string();
                    job.error_message = Some(error_msg.to_string());
                }
            }
        }
    });
    
    job_id as i32
}

/// Get the status of a print job
/// Returns a JSON string with job status or null if job not found
#[no_mangle]
pub extern "C" fn get_job_status(job_id: u32) -> *mut c_char {
    let tracker = JOB_TRACKER.lock().unwrap();
    
    match tracker.get(&job_id) {
        Some(job) => {
            match create_status_json(job_id, job) {
                Some(json) => match CString::new(json) {
                    Ok(c_string) => c_string.into_raw(),
                    Err(_) => std::ptr::null_mut(),
                },
                None => std::ptr::null_mut(),
            }
        }
        None => std::ptr::null_mut(),
    }
}

/// Clean up completed or failed jobs older than the specified age in seconds
#[no_mangle]
pub extern "C" fn cleanup_old_jobs(max_age_seconds: u64) -> u32 {
    let mut tracker = JOB_TRACKER.lock().unwrap();
    let cutoff_time = Duration::from_secs(max_age_seconds);
    
    let mut removed_count = 0;
    tracker.retain(|_, job| {
        let should_keep = match job.status.as_str() {
            "completed" | "failed" => job.created_at.elapsed() < cutoff_time,
            _ => true, // Keep active jobs
        };
        
        if !should_keep {
            removed_count += 1;
        }
        
        should_keep
    });
    
    removed_count
}

/// Get a printer by its name
/// Returns a pointer to a null-terminated string containing the printer name if found,
/// or a null pointer if not found
/// 
/// # Safety
/// The caller must ensure that `name_ptr` is a valid null-terminated C string.
#[no_mangle]
pub unsafe extern "C" fn find_printer_by_name(name_ptr: *const c_char) -> *mut c_char {
    if name_ptr.is_null() {
        return std::ptr::null_mut();
    }
    
    // Convert the C string to a Rust string
    let name = match CStr::from_ptr(name_ptr).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };
    
    // Get all printers using the real printers crate
    let printers = printers::get_printers();
    
    // Find the printer by name
    for printer in printers {
        if printer.name == name {
            // Convert the printer name back to a C string and return it
            match CString::new(printer.name) {
                Ok(c_string) => return c_string.into_raw(),
                Err(_) => return std::ptr::null_mut(),
            }
        }
    }
    
    // Printer not found
    std::ptr::null_mut()
}

/// Get all available printers
/// Returns a JSON string containing an array of printer names
#[no_mangle]
pub extern "C" fn get_all_printer_names() -> *mut c_char {
    // Get all printers using the real printers crate
    let printers = printers::get_printers();
    
    // Extract printer names
    let printer_names: Vec<&str> = printers.iter().map(|p| p.name.as_str()).collect();
    
    // Serialize to JSON
    match serde_json::to_string(&printer_names) {
        Ok(json) => match CString::new(json) {
            Ok(c_string) => c_string.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(_) => std::ptr::null_mut(),
    }
}

/// Check if a printer exists by name
/// Returns 1 if the printer exists, 0 otherwise
/// 
/// # Safety
/// The caller must ensure that `name_ptr` is a valid null-terminated C string.
#[no_mangle]
pub unsafe extern "C" fn printer_exists(name_ptr: *const c_char) -> i32 {
    if name_ptr.is_null() {
        return 0;
    }
    
    // Convert the C string to a Rust string
    let name = match CStr::from_ptr(name_ptr).to_str() {
        Ok(s) => s,
        Err(_) => return 0,
    };
    
    // Check if printer exists using the real printers crate
    match get_printer_by_name(name) {
        Some(_) => 1,
        None => 0,
    }
}

/// Free a string allocated by this library
/// 
/// # Safety
/// The caller must ensure that `ptr` was allocated by this library and is not used after this call.
#[no_mangle]
pub unsafe extern "C" fn free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        let _ = CString::from_raw(ptr);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::CString;

    #[test]
    fn test_get_all_printer_names() {
        let result = get_all_printer_names();
        assert!(!result.is_null());
        
        // Clean up the allocated string
        unsafe {
            free_string(result);
        }
    }

    #[test]
    fn test_printer_exists_with_null() {
        let result = unsafe { printer_exists(std::ptr::null()) };
        assert_eq!(result, 0);
    }

    #[test]
    fn test_get_printer_by_name_with_null() {
        let result = unsafe { find_printer_by_name(std::ptr::null()) };
        assert!(result.is_null());
    }

    #[test]
    fn test_get_printer_by_name_with_nonexistent() {
        let name = CString::new("NonExistentPrinter123").unwrap();
        let result = unsafe { find_printer_by_name(name.as_ptr()) };
        assert!(result.is_null());
    }
}
