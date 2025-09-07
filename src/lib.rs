use printers::common::base::job::{PrinterJobOptions, PrinterJobState};
use printers::common::base::printer::Printer;
use printers::get_printer_by_name;
use std::collections::HashMap;
use std::env;
use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

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
    static ref SHUTDOWN_FLAG: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
    static ref THREAD_HANDLES: Arc<Mutex<Vec<JoinHandle<()>>>> = Arc::new(Mutex::new(Vec::new()));
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
            Ok(json_str) => match serde_json::from_str(json_str) {
                Ok(props) => Some(props),
                Err(_) => return PrintError::InvalidJson.as_i32(),
            },
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
    let shutdown_flag = SHUTDOWN_FLAG.clone();

    let handle = thread::spawn(move || {
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
            thread::sleep(Duration::from_millis(
                SIMULATION_BASE_TIME_MS + (job_id as u64 % SIMULATION_VARIABLE_TIME_MS),
            ));

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
                    // Check for shutdown signal
                    if shutdown_flag.load(Ordering::Relaxed) {
                        // Mark job as failed due to shutdown
                        let mut tracker = job_tracker.lock().unwrap();
                        if let Some(job) = tracker.get_mut(&job_id) {
                            job.status = "failed".to_string();
                            job.error_message = Some("Shutdown requested".to_string());
                        }
                        break;
                    }

                    thread::sleep(Duration::from_millis(JOB_MONITORING_INTERVAL_MS));

                    let active_jobs = printer.get_active_jobs();
                    let job_still_active = active_jobs.iter().any(|j| j.id == real_job_id);

                    if !job_still_active {
                        let job_history = printer.get_job_history();
                        let mut tracker = job_tracker.lock().unwrap();
                        if let Some(job) = tracker.get_mut(&job_id) {
                            if let Some(finished_job) =
                                job_history.iter().find(|j| j.id == real_job_id)
                            {
                                match finished_job.state {
                                    PrinterJobState::COMPLETED => {
                                        job.status = "completed".to_string()
                                    }
                                    PrinterJobState::CANCELLED => {
                                        job.status = "failed".to_string();
                                        job.error_message = Some("Job was cancelled".to_string());
                                    }
                                    _ => {
                                        job.status = "failed".to_string();
                                        job.error_message = Some(format!(
                                            "Job ended with state: {:?}",
                                            finished_job.state
                                        ));
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
            }
            Err(error_msg) => {
                let mut tracker = job_tracker.lock().unwrap();
                if let Some(job) = tracker.get_mut(&job_id) {
                    job.status = "failed".to_string();
                    job.error_message = Some(error_msg.to_string());
                }
            }
        }
    });

    // Store the thread handle for cleanup
    {
        let mut handles = THREAD_HANDLES.lock().unwrap();
        handles.push(handle);
    }

    job_id as i32
}

/// Get the status of a print job
/// Returns a JSON string with job status or null if job not found
#[no_mangle]
pub extern "C" fn get_job_status(job_id: u32) -> *mut c_char {
    let tracker = JOB_TRACKER.lock().unwrap();

    match tracker.get(&job_id) {
        Some(job) => match create_status_json(job_id, job) {
            Some(json) => match CString::new(json) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            },
            None => std::ptr::null_mut(),
        },
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

/// Signal all background threads to shut down and wait for them to complete
/// This should be called before the process exits to prevent segfaults
#[no_mangle]
pub extern "C" fn shutdown_library() {
    // Set shutdown flag to signal all threads to stop
    SHUTDOWN_FLAG.store(true, Ordering::Relaxed);

    // Wait for all threads to complete (with timeout)
    let mut handles = THREAD_HANDLES.lock().unwrap();
    let timeout = Duration::from_secs(5); // 5 second timeout
    let start_time = Instant::now();

    while let Some(handle) = handles.pop() {
        // Check if we've exceeded the timeout
        if start_time.elapsed() > timeout {
            break; // Don't wait forever
        }

        // Try to join the thread (this will block until the thread completes)
        let _ = handle.join();
    }

    // Clear job tracker
    {
        let mut tracker = JOB_TRACKER.lock().unwrap();
        tracker.clear();
    }
}

/// Create a new Printer instance by name
/// Returns a pointer to the Printer struct or null if not found
///
/// # Safety
/// The caller must ensure that `name_ptr` is a valid null-terminated C string.
/// The returned pointer must be freed with `printer_free`.
#[no_mangle]
pub unsafe extern "C" fn printer_create(name_ptr: *const c_char) -> *mut Printer {
    if name_ptr.is_null() {
        return std::ptr::null_mut();
    }

    let name = match CStr::from_ptr(name_ptr).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    match get_printer_by_name(name) {
        Some(printer) => Box::into_raw(Box::new(printer)),
        None => std::ptr::null_mut(),
    }
}

/// Free a Printer instance
///
/// # Safety
/// The caller must ensure that `printer_ptr` was created by `printer_create`
/// and is not used after this call.
#[no_mangle]
pub unsafe extern "C" fn printer_free(printer_ptr: *mut Printer) {
    if !printer_ptr.is_null() {
        let _ = Box::from_raw(printer_ptr);
    }
}

/// Get the name field of a Printer
///
/// # Safety
/// The caller must ensure that `printer_ptr` is a valid Printer pointer.
/// The returned string must be freed with `free_string`.
#[no_mangle]
pub unsafe extern "C" fn printer_get_name(printer_ptr: *const Printer) -> *mut c_char {
    if printer_ptr.is_null() {
        return std::ptr::null_mut();
    }

    let printer = &*printer_ptr;
    match CString::new(printer.name.clone()) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Get the system_name field of a Printer
///
/// # Safety
/// The caller must ensure that `printer_ptr` is a valid Printer pointer.
/// The returned string must be freed with `free_string`.
#[no_mangle]
pub unsafe extern "C" fn printer_get_system_name(printer_ptr: *const Printer) -> *mut c_char {
    if printer_ptr.is_null() {
        return std::ptr::null_mut();
    }

    let printer = &*printer_ptr;
    match CString::new(printer.system_name.clone()) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Get the driver_name field of a Printer
///
/// # Safety
/// The caller must ensure that `printer_ptr` is a valid Printer pointer.
/// The returned string must be freed with `free_string`.
#[no_mangle]
pub unsafe extern "C" fn printer_get_driver_name(printer_ptr: *const Printer) -> *mut c_char {
    if printer_ptr.is_null() {
        return std::ptr::null_mut();
    }

    let printer = &*printer_ptr;
    match CString::new(printer.driver_name.clone()) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Get the uri field of a Printer
///
/// # Safety
/// The caller must ensure that `printer_ptr` is a valid Printer pointer.
/// The returned string must be freed with `free_string`.
#[no_mangle]
pub unsafe extern "C" fn printer_get_uri(printer_ptr: *const Printer) -> *mut c_char {
    if printer_ptr.is_null() {
        return std::ptr::null_mut();
    }

    let printer = &*printer_ptr;
    match CString::new(printer.uri.clone()) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Get the port_name field of a Printer
///
/// # Safety
/// The caller must ensure that `printer_ptr` is a valid Printer pointer.
/// The returned string must be freed with `free_string`.
#[no_mangle]
pub unsafe extern "C" fn printer_get_port_name(printer_ptr: *const Printer) -> *mut c_char {
    if printer_ptr.is_null() {
        return std::ptr::null_mut();
    }

    let printer = &*printer_ptr;
    match CString::new(printer.port_name.clone()) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Get the processor field of a Printer
///
/// # Safety
/// The caller must ensure that `printer_ptr` is a valid Printer pointer.
/// The returned string must be freed with `free_string`.
#[no_mangle]
pub unsafe extern "C" fn printer_get_processor(printer_ptr: *const Printer) -> *mut c_char {
    if printer_ptr.is_null() {
        return std::ptr::null_mut();
    }

    let printer = &*printer_ptr;
    match CString::new(printer.processor.clone()) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Get the data_type field of a Printer
///
/// # Safety
/// The caller must ensure that `printer_ptr` is a valid Printer pointer.
/// The returned string must be freed with `free_string`.
#[no_mangle]
pub unsafe extern "C" fn printer_get_data_type(printer_ptr: *const Printer) -> *mut c_char {
    if printer_ptr.is_null() {
        return std::ptr::null_mut();
    }

    let printer = &*printer_ptr;
    match CString::new(printer.data_type.clone()) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Get the description field of a Printer
///
/// # Safety
/// The caller must ensure that `printer_ptr` is a valid Printer pointer.
/// The returned string must be freed with `free_string`.
#[no_mangle]
pub unsafe extern "C" fn printer_get_description(printer_ptr: *const Printer) -> *mut c_char {
    if printer_ptr.is_null() {
        return std::ptr::null_mut();
    }

    let printer = &*printer_ptr;
    match CString::new(printer.description.clone()) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Get the location field of a Printer
///
/// # Safety
/// The caller must ensure that `printer_ptr` is a valid Printer pointer.
/// The returned string must be freed with `free_string`.
#[no_mangle]
pub unsafe extern "C" fn printer_get_location(printer_ptr: *const Printer) -> *mut c_char {
    if printer_ptr.is_null() {
        return std::ptr::null_mut();
    }

    let printer = &*printer_ptr;
    match CString::new(printer.location.clone()) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Get the is_default field of a Printer
///
/// # Safety
/// The caller must ensure that `printer_ptr` is a valid Printer pointer.
#[no_mangle]
pub unsafe extern "C" fn printer_get_is_default(printer_ptr: *const Printer) -> i32 {
    if printer_ptr.is_null() {
        return 0;
    }

    let printer = &*printer_ptr;
    if printer.is_default {
        1
    } else {
        0
    }
}

/// Get the is_shared field of a Printer
///
/// # Safety
/// The caller must ensure that `printer_ptr` is a valid Printer pointer.
#[no_mangle]
pub unsafe extern "C" fn printer_get_is_shared(printer_ptr: *const Printer) -> i32 {
    if printer_ptr.is_null() {
        return 0;
    }

    let printer = &*printer_ptr;
    if printer.is_shared {
        1
    } else {
        0
    }
}

/// Get the state field of a Printer as a JSON string
///
/// # Safety
/// The caller must ensure that `printer_ptr` is a valid Printer pointer.
/// The returned string must be freed with `free_string`.
#[no_mangle]
pub unsafe extern "C" fn printer_get_state(printer_ptr: *const Printer) -> *mut c_char {
    if printer_ptr.is_null() {
        return std::ptr::null_mut();
    }

    let printer = &*printer_ptr;

    // Convert PrinterState to string using Debug trait
    let state_str = format!("{:?}", printer.state);

    match CString::new(state_str) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Get the state_reasons field of a Printer as a JSON array string
///
/// # Safety
/// The caller must ensure that `printer_ptr` is a valid Printer pointer.
/// The returned string must be freed with `free_string`.
#[no_mangle]
pub unsafe extern "C" fn printer_get_state_reasons(printer_ptr: *const Printer) -> *mut c_char {
    if printer_ptr.is_null() {
        return std::ptr::null_mut();
    }

    let printer = &*printer_ptr;

    // Serialize state_reasons to JSON array
    match serde_json::to_string(&printer.state_reasons) {
        Ok(json) => match CString::new(json) {
            Ok(c_string) => c_string.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(_) => std::ptr::null_mut(),
    }
}

/// Print a file using a Printer instance
///
/// # Safety
/// The caller must ensure that `printer_ptr` is a valid Printer pointer,
/// `file_path_ptr` is a valid null-terminated C string.
/// `job_properties_json_ptr` can be null.
#[no_mangle]
pub unsafe extern "C" fn printer_print_file(
    printer_ptr: *const Printer,
    file_path_ptr: *const c_char,
    job_properties_json_ptr: *const c_char,
) -> i32 {
    if printer_ptr.is_null() || file_path_ptr.is_null() {
        return PrintError::InvalidParams.as_i32();
    }

    let printer = &*printer_ptr;
    let printer_name = printer.name.clone();

    // Reuse the existing print_file function logic
    print_file(
        CString::new(printer_name).unwrap().as_ptr(),
        file_path_ptr,
        job_properties_json_ptr,
    )
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

    #[test]
    fn test_print_file_with_null_printer() {
        let file_path = CString::new("test.txt").unwrap();
        let result = unsafe { print_file(std::ptr::null(), file_path.as_ptr(), std::ptr::null()) };
        assert_eq!(result, PrintError::InvalidParams.as_i32());
    }

    #[test]
    fn test_print_file_with_null_file_path() {
        let printer_name = CString::new("Test Printer").unwrap();
        let result =
            unsafe { print_file(printer_name.as_ptr(), std::ptr::null(), std::ptr::null()) };
        assert_eq!(result, PrintError::InvalidParams.as_i32());
    }

    #[test]
    fn test_print_file_with_nonexistent_printer() {
        let printer_name = CString::new("NonExistentPrinter123").unwrap();
        let file_path = CString::new("test.txt").unwrap();
        let result =
            unsafe { print_file(printer_name.as_ptr(), file_path.as_ptr(), std::ptr::null()) };
        assert_eq!(result, PrintError::PrinterNotFound.as_i32());
    }

    #[test]
    fn test_print_file_with_nonexistent_file() {
        // Use a truly nonexistent printer to ensure we get a predictable error
        let printer_name = CString::new("NonExistentPrinter123").unwrap();
        let file_path = CString::new("/nonexistent/path/file.txt").unwrap();
        let result =
            unsafe { print_file(printer_name.as_ptr(), file_path.as_ptr(), std::ptr::null()) };
        // Should return PrinterNotFound error since printer doesn't exist
        assert_eq!(result, PrintError::PrinterNotFound.as_i32());
    }

    #[test]
    fn test_print_file_with_invalid_json() {
        let printer_name = CString::new("Test Printer").unwrap();
        let file_path = CString::new("test.txt").unwrap();
        let invalid_json = CString::new("invalid json {").unwrap();
        let result = unsafe {
            print_file(
                printer_name.as_ptr(),
                file_path.as_ptr(),
                invalid_json.as_ptr(),
            )
        };
        assert_eq!(result, PrintError::InvalidJson.as_i32());
    }

    #[test]
    fn test_get_job_status_nonexistent() {
        let result = get_job_status(99999);
        assert!(result.is_null());
    }

    #[test]
    fn test_cleanup_old_jobs() {
        // Test cleanup function - should return number of cleaned jobs (0 is valid)
        let result = cleanup_old_jobs(3600); // 1 hour
                                             // Result is u32, so it's always non-negative - just verify function executes
        let _ = result; // Verify function returns without panic
    }

    #[test]
    fn test_free_string_with_null() {
        // Should not crash with null pointer
        unsafe {
            free_string(std::ptr::null_mut());
        }
        // If we get here without panicking, the test passes
    }

    #[test]
    fn test_error_codes() {
        // Test that error codes are within expected range
        assert_eq!(PrintError::InvalidParams.as_i32(), 1);
        assert_eq!(PrintError::InvalidPrinterName.as_i32(), 2);
        assert_eq!(PrintError::InvalidFilePath.as_i32(), 3);
        assert_eq!(PrintError::InvalidJson.as_i32(), 4);
        assert_eq!(PrintError::InvalidJsonEncoding.as_i32(), 5);
        assert_eq!(PrintError::PrinterNotFound.as_i32(), 6);
        assert_eq!(PrintError::FileNotFound.as_i32(), 7);
    }

    #[test]
    fn test_should_simulate_printing() {
        // Test simulation mode detection
        let original = std::env::var("DENO_PRINTERS_SIMULATE").unwrap_or_default();

        // Test with simulation enabled
        std::env::set_var("DENO_PRINTERS_SIMULATE", "true");
        assert!(should_simulate_printing());

        // Test with simulation disabled
        std::env::set_var("DENO_PRINTERS_SIMULATE", "false");
        assert!(!should_simulate_printing());

        // Test with no environment variable
        std::env::remove_var("DENO_PRINTERS_SIMULATE");
        assert!(!should_simulate_printing());

        // Restore original value
        if !original.is_empty() {
            std::env::set_var("DENO_PRINTERS_SIMULATE", original);
        }
    }

    #[test]
    fn test_generate_job_id() {
        // Test that job IDs are sequential and start from 1000
        let id1 = generate_job_id();
        let id2 = generate_job_id();

        assert!(id1 >= 1000);
        assert_eq!(id2, id1 + 1);
    }

    #[test]
    fn test_c_str_to_string_with_null() {
        let result = unsafe { c_str_to_string(std::ptr::null(), PrintError::InvalidParams) };
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), PrintError::InvalidParams.as_i32());
    }

    #[test]
    fn test_c_str_to_string_with_valid_string() {
        let test_str = CString::new("test string").unwrap();
        let result = unsafe { c_str_to_string(test_str.as_ptr(), PrintError::InvalidParams) };
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "test string");
    }

    #[test]
    fn test_create_status_json() {
        let job_status = JobStatus {
            printer_name: "Test Printer".to_string(),
            file_path: "test.txt".to_string(),
            status: "completed".to_string(),
            error_message: None,
            created_at: std::time::Instant::now(),
            real_job_id: Some(123),
            printer: None,
        };

        let json = create_status_json(1001, &job_status);
        assert!(json.is_some());

        let json_str = json.unwrap();
        assert!(json_str.contains("\"id\":1001"));
        assert!(json_str.contains("\"printer_name\":\"Test Printer\""));
        assert!(json_str.contains("\"status\":\"completed\""));
    }
}
