//! N-API bindings for Node.js
use crate::core::{PrintError, PrinterCore};
use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::collections::HashMap;

/// Async task for printing
pub struct PrintTask {
    pub printer_name: String,
    pub file_path: String,
    pub job_properties: Option<HashMap<String, String>>,
}

impl Task for PrintTask {
    type Output = u32;
    type JsValue = u32;

    fn compute(&mut self) -> Result<Self::Output> {
        match PrinterCore::print_file(
            &self.printer_name,
            &self.file_path,
            self.job_properties.clone(),
        ) {
            Ok(job_id) => Ok(job_id),
            Err(e) => match e {
                PrintError::PrinterNotFound => {
                    Err(Error::new(Status::InvalidArg, "Printer not found"))
                }
                PrintError::FileNotFound => Err(Error::new(Status::InvalidArg, "File not found")),
                PrintError::InvalidFilePath => {
                    Err(Error::new(Status::InvalidArg, "Invalid file path"))
                }
                _ => Err(Error::new(
                    Status::GenericFailure,
                    format!("Print failed with error code: {}", e.as_i32()),
                )),
            },
        }
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

/// Error codes for printing operations
#[napi]
pub enum PrintErrorCode {
    InvalidParams = 1,
    InvalidPrinterName = 2,
    InvalidFilePath = 3,
    InvalidJson = 4,
    InvalidJsonEncoding = 5,
    PrinterNotFound = 6,
    FileNotFound = 7,
}

/// Job status interface
#[napi(object)]
pub struct JobStatus {
    pub id: u32,
    pub printer_name: String,
    pub file_path: String,
    pub status: String,
    pub error_message: Option<String>,
    pub age_seconds: u32,
}

/// Printer information
#[napi(object)]
pub struct PrinterInfo {
    pub name: String,
    pub system_name: String,
    pub driver_name: String,
    pub uri: String,
    pub port_name: String,
    pub processor: String,
    pub data_type: String,
    pub description: String,
    pub location: String,
    pub is_default: bool,
    pub is_shared: bool,
    pub state: String,
    pub state_reasons: Vec<String>,
}

/// Printer class for Node.js
#[napi]
pub struct Printer {
    name: String,
}

#[napi]
impl Printer {
    /// Create a new printer instance
    #[napi(constructor)]
    pub fn new(name: String) -> Result<Self> {
        if PrinterCore::printer_exists(&name) {
            Ok(Printer { name })
        } else {
            Err(Error::new(
                Status::InvalidArg,
                format!("Printer '{}' not found", name),
            ))
        }
    }

    /// Get printer name
    #[napi(getter)]
    pub fn name(&self) -> String {
        self.name.clone()
    }

    /// Get printer information
    #[napi]
    pub fn get_info(&self) -> Result<PrinterInfo> {
        if let Some(printer) = PrinterCore::find_printer_by_name(&self.name) {
            Ok(PrinterInfo {
                name: printer.name.clone(),
                system_name: printer.system_name.clone(),
                driver_name: printer.driver_name.clone(),
                uri: String::new(),         // Field may not exist
                port_name: String::new(),   // Platform-specific
                processor: String::new(),   // Platform-specific
                data_type: String::new(),   // Platform-specific
                description: String::new(), // Field may not exist
                location: String::new(),    // Field may not exist
                is_default: printer.is_default,
                is_shared: printer.is_shared,
                state: PrinterCore::get_printer_state(&printer),
                state_reasons: vec![], // Simplified for now
            })
        } else {
            Err(Error::new(
                Status::InvalidArg,
                format!("Printer '{}' not found", self.name),
            ))
        }
    }

    /// Check if printer exists
    #[napi]
    pub fn exists(&self) -> bool {
        PrinterCore::printer_exists(&self.name)
    }

    /// Print a file (async)
    #[napi]
    pub fn print_file(
        &self,
        file_path: String,
        job_properties: Option<HashMap<String, String>>,
    ) -> AsyncTask<PrintTask> {
        AsyncTask::new(PrintTask {
            printer_name: self.name.clone(),
            file_path,
            job_properties,
        })
    }
}

/// Find a printer by name
#[napi]
pub fn find_printer_by_name(name: String) -> Option<Printer> {
    if PrinterCore::printer_exists(&name) {
        Some(Printer { name })
    } else {
        None
    }
}

/// Check if a printer exists by name
#[napi]
pub fn printer_exists(name: String) -> bool {
    PrinterCore::printer_exists(&name)
}

/// Get all available printer names
#[napi]
pub fn get_all_printer_names() -> Vec<String> {
    PrinterCore::get_all_printer_names()
}

/// Get all available printers
#[napi]
pub fn get_all_printers() -> Vec<Printer> {
    PrinterCore::get_all_printer_names()
        .into_iter()
        .map(|name| Printer { name })
        .collect()
}

/// Print a file using printer name (async)
#[napi]
pub fn print_file(
    printer_name: String,
    file_path: String,
    job_properties: Option<HashMap<String, String>>,
) -> AsyncTask<PrintTask> {
    AsyncTask::new(PrintTask {
        printer_name,
        file_path,
        job_properties,
    })
}

/// Get the status of a print job
#[napi]
pub fn get_job_status(job_id: u32) -> Option<JobStatus> {
    if let Some(job) = PrinterCore::get_job_status(job_id) {
        Some(JobStatus {
            id: job_id,
            printer_name: job.printer_name,
            file_path: job.file_path,
            status: job.status,
            error_message: job.error_message,
            age_seconds: job.created_at.elapsed().as_secs() as u32,
        })
    } else {
        None
    }
}

/// Clean up old completed/failed jobs
#[napi]
pub fn cleanup_old_jobs(max_age_seconds: u32) -> u32 {
    PrinterCore::cleanup_old_jobs(max_age_seconds as u64)
}

/// Shutdown the library and cleanup all background threads
#[napi]
pub fn shutdown() -> Result<()> {
    PrinterCore::shutdown_library();
    Ok(())
}
