//! FFI bindings for Deno/Bun access
use crate::core::{create_status_json, PrintError, PrinterCore};
use printers::common::base::printer::Printer;
use std::ffi::{CStr, CString};
use std::os::raw::c_char;

/// Convert a C string pointer to a Rust String, returning an error code on failure
///
/// # Safety
/// The caller must ensure that `ptr` is a valid C string pointer.
unsafe fn c_str_to_string(ptr: *const c_char, error_code: PrintError) -> Result<String, i32> {
    if ptr.is_null() {
        return Err(PrintError::InvalidParams.as_i32());
    }

    match CStr::from_ptr(ptr).to_str() {
        Ok(s) => Ok(s.to_string()),
        Err(_) => Err(error_code.as_i32()),
    }
}

/// Convert a Rust string to a C string pointer
/// The caller must free the returned pointer using free_string
fn string_to_c_string(s: String) -> *mut c_char {
    match CString::new(s) {
        Ok(c_str) => c_str.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Free a C string created by this library
///
/// # Safety
/// The caller must ensure that `s` is a pointer returned by this library's functions.
#[no_mangle]
pub unsafe extern "C" fn free_string(s: *mut c_char) {
    if !s.is_null() {
        let _ = CString::from_raw(s);
    }
}

/// Find a printer by name and return its JSON representation
///
/// # Safety
/// The caller must ensure that `name` is a valid C string pointer.
#[no_mangle]
pub unsafe extern "C" fn find_printer_by_name(name: *const c_char) -> *mut c_char {
    match c_str_to_string(name, PrintError::InvalidPrinterName) {
        Ok(printer_name) => {
            if let Some(printer) = PrinterCore::find_printer_by_name(&printer_name) {
                if let Some(json) = PrinterCore::printer_to_json(&printer) {
                    return string_to_c_string(json);
                }
            }
            std::ptr::null_mut()
        }
        Err(_) => std::ptr::null_mut(),
    }
}

/// Check if a printer exists by name
///
/// # Safety
/// The caller must ensure that `name` is a valid C string pointer.
#[no_mangle]
pub unsafe extern "C" fn printer_exists(name: *const c_char) -> i32 {
    match c_str_to_string(name, PrintError::InvalidPrinterName) {
        Ok(printer_name) => {
            if PrinterCore::printer_exists(&printer_name) {
                1
            } else {
                0
            }
        }
        Err(_) => 0,
    }
}

/// Get all printer names as a JSON array
///
/// # Safety
/// This function is safe to call but returns a pointer that must be freed with free_string.
#[no_mangle]
pub unsafe extern "C" fn get_all_printer_names() -> *mut c_char {
    let names = PrinterCore::get_all_printer_names();

    match serde_json::to_string(&names) {
        Ok(json) => string_to_c_string(json),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Print a file with optional job properties
///
/// # Safety
/// The caller must ensure that `printer_name`, `file_path`, and `job_properties` are valid C string pointers.
#[no_mangle]
pub unsafe extern "C" fn print_file(
    printer_name: *const c_char,
    file_path: *const c_char,
    job_properties: *const c_char,
) -> i32 {
    // Parse printer name
    let printer_name_str = match c_str_to_string(printer_name, PrintError::InvalidPrinterName) {
        Ok(s) => s,
        Err(code) => return code,
    };

    // Parse file path
    let file_path_str = match c_str_to_string(file_path, PrintError::InvalidFilePath) {
        Ok(s) => s,
        Err(code) => return code,
    };

    // Parse optional job properties
    let properties = if !job_properties.is_null() {
        match c_str_to_string(job_properties, PrintError::InvalidJsonEncoding) {
            Ok(json_str) => match serde_json::from_str(&json_str) {
                Ok(props) => Some(props),
                Err(_) => return PrintError::InvalidJson.as_i32(),
            },
            Err(code) => return code,
        }
    } else {
        None
    };

    // Submit print job
    match PrinterCore::print_file(&printer_name_str, &file_path_str, properties) {
        Ok(job_id) => job_id as i32,
        Err(e) => e.as_i32(),
    }
}

/// Get the status of a print job as JSON
///
/// # Safety
/// This function is safe to call but returns a pointer that must be freed with free_string.
#[no_mangle]
pub unsafe extern "C" fn get_job_status(job_id: u32) -> *mut c_char {
    if let Some(job) = PrinterCore::get_job_status(job_id) {
        if let Some(json) = create_status_json(job_id, &job) {
            return string_to_c_string(json);
        }
    }
    std::ptr::null_mut()
}

/// Clean up old completed/failed jobs
///
/// # Safety
/// This function is safe to call.
#[no_mangle]
pub unsafe extern "C" fn cleanup_old_jobs(max_age_seconds: u64) -> u32 {
    PrinterCore::cleanup_old_jobs(max_age_seconds)
}

/// Shutdown the library and cleanup all background threads
///
/// # Safety
/// This function is safe to call.
#[no_mangle]
pub unsafe extern "C" fn shutdown_library() {
    PrinterCore::shutdown_library();
}

// Printer handle for object-oriented API

/// Opaque printer handle
pub struct PrinterHandle {
    printer: Printer,
}

/// Create a printer instance by name
///
/// # Safety
/// The caller must ensure that `name` is a valid C string pointer.
#[no_mangle]
pub unsafe extern "C" fn printer_create(name: *const c_char) -> *mut PrinterHandle {
    match c_str_to_string(name, PrintError::InvalidPrinterName) {
        Ok(printer_name) => {
            if let Some(printer) = PrinterCore::find_printer_by_name(&printer_name) {
                let handle = Box::new(PrinterHandle { printer });
                Box::into_raw(handle)
            } else {
                std::ptr::null_mut()
            }
        }
        Err(_) => std::ptr::null_mut(),
    }
}

/// Free a printer instance
///
/// # Safety
/// The caller must ensure that `handle` is a valid pointer returned by printer_create.
#[no_mangle]
pub unsafe extern "C" fn printer_free(handle: *mut PrinterHandle) {
    if !handle.is_null() {
        let _ = Box::from_raw(handle);
    }
}

/// Get printer name
///
/// # Safety
/// The caller must ensure that `handle` is a valid pointer returned by printer_create.
#[no_mangle]
pub unsafe extern "C" fn printer_get_name(handle: *mut PrinterHandle) -> *mut c_char {
    if handle.is_null() {
        return std::ptr::null_mut();
    }
    let printer_handle = &*handle;
    string_to_c_string(printer_handle.printer.name.clone())
}

/// Get printer system name
///
/// # Safety
/// The caller must ensure that `handle` is a valid pointer returned by printer_create.
#[no_mangle]
pub unsafe extern "C" fn printer_get_system_name(handle: *mut PrinterHandle) -> *mut c_char {
    if handle.is_null() {
        return std::ptr::null_mut();
    }
    let printer_handle = &*handle;
    string_to_c_string(printer_handle.printer.system_name.clone())
}

/// Get printer driver name
///
/// # Safety
/// The caller must ensure that `handle` is a valid pointer returned by printer_create.
#[no_mangle]
pub unsafe extern "C" fn printer_get_driver_name(handle: *mut PrinterHandle) -> *mut c_char {
    if handle.is_null() {
        return std::ptr::null_mut();
    }
    let printer_handle = &*handle;
    string_to_c_string(printer_handle.printer.driver_name.clone())
}

/// Get printer URI
///
/// # Safety
/// The caller must ensure that `handle` is a valid pointer returned by printer_create.
#[no_mangle]
pub unsafe extern "C" fn printer_get_uri(handle: *mut PrinterHandle) -> *mut c_char {
    if handle.is_null() {
        return std::ptr::null_mut();
    }
    // URI field may not exist, return empty string
    string_to_c_string(String::new())
}

/// Get printer port name (Windows-specific, returns empty string on other platforms)
///
/// # Safety
/// The caller must ensure that `handle` is a valid pointer returned by printer_create.
#[no_mangle]
pub unsafe extern "C" fn printer_get_port_name(handle: *mut PrinterHandle) -> *mut c_char {
    if handle.is_null() {
        return std::ptr::null_mut();
    }
    // Port name is Windows-specific and may not be available
    string_to_c_string(String::new())
}

/// Get printer processor (Windows-specific, returns empty string on other platforms)
///
/// # Safety
/// The caller must ensure that `handle` is a valid pointer returned by printer_create.
#[no_mangle]
pub unsafe extern "C" fn printer_get_processor(handle: *mut PrinterHandle) -> *mut c_char {
    if handle.is_null() {
        return std::ptr::null_mut();
    }
    // Processor is Windows-specific
    string_to_c_string(String::new())
}

/// Get printer data type (Windows-specific, returns empty string on other platforms)
///
/// # Safety
/// The caller must ensure that `handle` is a valid pointer returned by printer_create.
#[no_mangle]
pub unsafe extern "C" fn printer_get_data_type(handle: *mut PrinterHandle) -> *mut c_char {
    if handle.is_null() {
        return std::ptr::null_mut();
    }
    // Data type is Windows-specific
    string_to_c_string(String::new())
}

/// Get printer description
///
/// # Safety
/// The caller must ensure that `handle` is a valid pointer returned by printer_create.
#[no_mangle]
pub unsafe extern "C" fn printer_get_description(handle: *mut PrinterHandle) -> *mut c_char {
    if handle.is_null() {
        return std::ptr::null_mut();
    }
    // Description field may not exist, return empty string
    string_to_c_string(String::new())
}

/// Get printer location
///
/// # Safety
/// The caller must ensure that `handle` is a valid pointer returned by printer_create.
#[no_mangle]
pub unsafe extern "C" fn printer_get_location(handle: *mut PrinterHandle) -> *mut c_char {
    if handle.is_null() {
        return std::ptr::null_mut();
    }
    // Location field may not exist, return empty string
    string_to_c_string(String::new())
}

/// Check if printer is default
///
/// # Safety
/// The caller must ensure that `handle` is a valid pointer returned by printer_create.
#[no_mangle]
pub unsafe extern "C" fn printer_get_is_default(handle: *mut PrinterHandle) -> i32 {
    if handle.is_null() {
        return 0;
    }
    let printer_handle = &*handle;
    if printer_handle.printer.is_default {
        1
    } else {
        0
    }
}

/// Check if printer is shared
///
/// # Safety
/// The caller must ensure that `handle` is a valid pointer returned by printer_create.
#[no_mangle]
pub unsafe extern "C" fn printer_get_is_shared(handle: *mut PrinterHandle) -> i32 {
    if handle.is_null() {
        return 0;
    }
    let printer_handle = &*handle;
    if printer_handle.printer.is_shared {
        1
    } else {
        0
    }
}

/// Get printer state as string
///
/// # Safety
/// The caller must ensure that `handle` is a valid pointer returned by printer_create.
#[no_mangle]
pub unsafe extern "C" fn printer_get_state(handle: *mut PrinterHandle) -> *mut c_char {
    if handle.is_null() {
        return std::ptr::null_mut();
    }
    let printer_handle = &*handle;
    let state = PrinterCore::get_printer_state(&printer_handle.printer);
    string_to_c_string(state)
}

/// Get printer state reasons as JSON array
///
/// # Safety
/// The caller must ensure that `handle` is a valid pointer returned by printer_create.
#[no_mangle]
pub unsafe extern "C" fn printer_get_state_reasons(handle: *mut PrinterHandle) -> *mut c_char {
    if handle.is_null() {
        return std::ptr::null_mut();
    }
    let printer_handle = &*handle;
    let reasons = PrinterCore::get_printer_state_reasons(&printer_handle.printer);
    string_to_c_string(reasons)
}

/// Print a file using a printer handle
///
/// # Safety
/// The caller must ensure that `handle` is a valid pointer, and `file_path` and `job_properties` are valid C string pointers.
#[no_mangle]
pub unsafe extern "C" fn printer_print_file(
    handle: *mut PrinterHandle,
    file_path: *const c_char,
    job_properties: *const c_char,
) -> i32 {
    if handle.is_null() {
        return PrintError::InvalidParams.as_i32();
    }

    let printer_handle = &*handle;
    let printer_name = printer_handle.printer.name.clone();

    // Parse file path
    let file_path_str = match c_str_to_string(file_path, PrintError::InvalidFilePath) {
        Ok(s) => s,
        Err(code) => return code,
    };

    // Parse optional job properties
    let properties = if !job_properties.is_null() {
        match c_str_to_string(job_properties, PrintError::InvalidJsonEncoding) {
            Ok(json_str) => match serde_json::from_str(&json_str) {
                Ok(props) => Some(props),
                Err(_) => return PrintError::InvalidJson.as_i32(),
            },
            Err(code) => return code,
        }
    } else {
        None
    };

    // Submit print job
    match PrinterCore::print_file(&printer_name, &file_path_str, properties) {
        Ok(job_id) => job_id as i32,
        Err(e) => e.as_i32(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;
    use std::env;
    use std::ffi::{CStr, CString};

    #[test]
    fn test_string_to_c_string_and_back() {
        let original = "Test String".to_string();
        let c_string_ptr = string_to_c_string(original.clone());

        assert!(!c_string_ptr.is_null());

        unsafe {
            let recovered = CStr::from_ptr(c_string_ptr).to_str().unwrap();
            assert_eq!(recovered, original);

            // Clean up
            free_string(c_string_ptr);
        }
    }

    #[test]
    #[serial]
    fn test_get_all_printer_names_ffi() {
        env::set_var("PRINTERS_JS_SIMULATE", "true");

        unsafe {
            let result_ptr = get_all_printer_names();
            assert!(!result_ptr.is_null());

            let json_str = CStr::from_ptr(result_ptr).to_str().unwrap();
            let names: Vec<String> = serde_json::from_str(json_str).unwrap();
            assert_eq!(names, vec!["Mock Printer", "Test Printer"]);

            // Clean up
            free_string(result_ptr);
        }
    }

    #[test]
    #[serial]
    fn test_printer_exists_ffi() {
        env::set_var("PRINTERS_JS_SIMULATE", "true");

        unsafe {
            let printer_name = CString::new("Mock Printer").unwrap();
            let result = printer_exists(printer_name.as_ptr());
            assert_eq!(result, 1); // Should return 1 for true

            let nonexistent_name = CString::new("NonExistent Printer").unwrap();
            let result = printer_exists(nonexistent_name.as_ptr());
            assert_eq!(result, 0); // Should return 0 for false
        }
    }

    #[test]
    #[serial]
    fn test_find_printer_by_name_ffi() {
        env::set_var("PRINTERS_JS_SIMULATE", "true");

        unsafe {
            let printer_name = CString::new("Mock Printer").unwrap();
            let result_ptr = find_printer_by_name(printer_name.as_ptr());

            if !result_ptr.is_null() {
                let json_str = CStr::from_ptr(result_ptr).to_str().unwrap();
                assert!(json_str.contains("Mock Printer"));

                // Clean up
                free_string(result_ptr);
            }
        }
    }

    #[test]
    #[serial]
    fn test_print_file_ffi() {
        env::set_var("PRINTERS_JS_SIMULATE", "true");

        unsafe {
            let printer_name = CString::new("Mock Printer").unwrap();
            let file_path = CString::new("/path/to/test.pdf").unwrap();
            let job_properties = CString::new("{}").unwrap();

            let result = print_file(
                printer_name.as_ptr(),
                file_path.as_ptr(),
                job_properties.as_ptr(),
            );

            // Should return a valid job ID (positive number)
            assert!(result > 0);
        }
    }

    #[test]
    #[serial]
    fn test_print_file_ffi_with_simulated_error() {
        env::set_var("PRINTERS_JS_SIMULATE", "true");

        unsafe {
            let printer_name = CString::new("Mock Printer").unwrap();
            let file_path = CString::new("/path/that/does_not_exist/file.pdf").unwrap();
            let job_properties = CString::new("{}").unwrap();

            let result = print_file(
                printer_name.as_ptr(),
                file_path.as_ptr(),
                job_properties.as_ptr(),
            );

            // Should return FileNotFound error code
            assert_eq!(result, PrintError::FileNotFound.as_i32());
        }
    }

    #[test]
    fn test_get_job_status_ffi() {
        unsafe {
            let result_ptr = get_job_status(99999999);
            // Invalid job ID should return null pointer
            assert!(result_ptr.is_null());
        }
    }

    #[test]
    fn test_cleanup_old_jobs_ffi() {
        unsafe {
            let result = cleanup_old_jobs(3600); // 1 hour
                                                 // Function should return a valid u32 (no need to test bounds since u32 is bounded by definition)
                                                 // Just verify it executes without panic
            let _ = result;
        }
    }
}
