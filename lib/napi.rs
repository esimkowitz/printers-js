//! N-API bindings for Node.js
use crate::core::{PrintError, PrinterCore, PrinterJobOptions};
use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::collections::HashMap;

/// Async task for printing files
pub struct PrintTask {
    pub printer_name: String,
    pub file_path: String,
    pub job_options: Option<PrinterJobOptions>,
    pub wait_for_completion: bool,
}

/// Async task for printing bytes
pub struct PrintBytesTask {
    pub printer_name: String,
    pub data: Vec<u8>,
    pub job_options: Option<PrinterJobOptions>,
    pub wait_for_completion: bool,
}

impl Task for PrintTask {
    type Output = u64;
    type JsValue = f64;

    fn compute(&mut self) -> Result<Self::Output> {
        let result = match PrinterCore::print_file(
            &self.printer_name,
            &self.file_path,
            self.job_options.clone(),
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
        };

        // If print job was successfully submitted and waitForCompletion is true,
        // add delay to keep printer instance alive during data transfer
        if result.is_ok() && self.wait_for_completion {
            let delay_ms = calculate_file_print_delay(&self.file_path);
            std::thread::sleep(std::time::Duration::from_millis(delay_ms));
        }

        result
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output as f64)
    }
}

impl Task for PrintBytesTask {
    type Output = u64;
    type JsValue = f64;

    fn compute(&mut self) -> Result<Self::Output> {
        let result = match PrinterCore::print_bytes(
            &self.printer_name,
            &self.data,
            self.job_options.clone(),
        ) {
            Ok(job_id) => Ok(job_id),
            Err(e) => match e {
                PrintError::PrinterNotFound => {
                    Err(Error::new(Status::InvalidArg, "Printer not found"))
                }
                PrintError::InvalidFilePath => Err(Error::new(Status::InvalidArg, "Invalid data")),
                _ => Err(Error::new(
                    Status::GenericFailure,
                    format!("Print failed with error code: {}", e.as_i32()),
                )),
            },
        };

        // If print job was successfully submitted and waitForCompletion is true,
        // add delay to keep printer instance alive during data transfer
        if result.is_ok() && self.wait_for_completion {
            let delay_ms = calculate_bytes_print_delay(self.data.len());
            std::thread::sleep(std::time::Duration::from_millis(delay_ms));
        }

        result
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output as f64)
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

/// Print job interface matching upstream printers crate
#[napi(object)]
pub struct PrinterJob {
    pub id: f64,
    pub name: String,
    pub state: String,
    #[napi(js_name = "mediaType")]
    pub media_type: String,
    #[napi(js_name = "createdAt")]
    pub created_at: f64,
    #[napi(js_name = "processedAt")]
    pub processed_at: Option<f64>,
    #[napi(js_name = "completedAt")]
    pub completed_at: Option<f64>,
    #[napi(js_name = "printerName")]
    pub printer_name: String,
    #[napi(js_name = "errorMessage")]
    pub error_message: Option<String>,
    #[napi(js_name = "ageSeconds")]
    pub age_seconds: f64,
}

/// Legacy job status interface for backward compatibility
#[napi(object)]
pub struct JobStatus {
    pub id: u32,
    pub printer_name: String,
    pub file_path: String,
    pub job_name: Option<String>,
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
                uri: printer.uri.clone(),
                port_name: printer.port_name.clone(),
                processor: printer.processor.clone(),
                data_type: printer.data_type.clone(),
                description: printer.description.clone(),
                location: printer.location.clone(),
                is_default: printer.is_default,
                is_shared: printer.is_shared,
                state: PrinterCore::get_printer_state(&printer),
                state_reasons: printer.state_reasons.clone(),
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
        wait_for_completion: Option<bool>,
    ) -> AsyncTask<PrintTask> {
        let job_options = job_properties.map(PrinterJobOptions::from_map);
        AsyncTask::new(PrintTask {
            printer_name: self.name.clone(),
            file_path,
            job_options,
            wait_for_completion: wait_for_completion.unwrap_or(true), // Default to true
        })
    }

    /// Print raw bytes (async)
    #[napi]
    pub fn print_bytes(
        &self,
        data: Buffer,
        job_properties: Option<HashMap<String, String>>,
        wait_for_completion: Option<bool>,
    ) -> AsyncTask<PrintBytesTask> {
        let job_options = job_properties.map(PrinterJobOptions::from_map);
        AsyncTask::new(PrintBytesTask {
            printer_name: self.name.clone(),
            data: data.to_vec(),
            job_options,
            wait_for_completion: wait_for_completion.unwrap_or(true), // Default to true
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
pub fn get_all_printers() -> Vec<PrinterInfo> {
    let printer_names = PrinterCore::get_all_printer_names();

    printer_names
        .into_iter()
        .filter_map(|name| {
            // Find the actual printer from the core
            if let Some(printer) = PrinterCore::find_printer_by_name(&name) {
                let printer_info = PrinterInfo {
                    name: printer.name.clone(),
                    system_name: printer.system_name.clone(),
                    driver_name: printer.driver_name.clone(),
                    uri: printer.uri.clone(),
                    port_name: printer.port_name.clone(),
                    processor: printer.processor.clone(),
                    data_type: printer.data_type.clone(),
                    description: printer.description.clone(),
                    location: printer.location.clone(),
                    is_default: printer.is_default,
                    is_shared: printer.is_shared,
                    state: PrinterCore::get_printer_state(&printer),
                    state_reasons: printer.state_reasons.clone(),
                };

                Some(printer_info)
            } else {
                None
            }
        })
        .collect()
}

/// Print a file using printer name (async)
#[napi]
pub fn print_file(
    printer_name: String,
    file_path: String,
    job_properties: Option<HashMap<String, String>>,
    wait_for_completion: Option<bool>,
) -> AsyncTask<PrintTask> {
    let job_options = job_properties.map(PrinterJobOptions::from_map);
    AsyncTask::new(PrintTask {
        printer_name,
        file_path,
        job_options,
        wait_for_completion: wait_for_completion.unwrap_or(true), // Default to true
    })
}

/// Print raw bytes using printer name (async)
#[napi]
pub fn print_bytes(
    printer_name: String,
    data: Buffer,
    job_properties: Option<HashMap<String, String>>,
    wait_for_completion: Option<bool>,
) -> AsyncTask<PrintBytesTask> {
    let job_options = job_properties.map(PrinterJobOptions::from_map);
    AsyncTask::new(PrintBytesTask {
        printer_name,
        data: data.to_vec(),
        job_options,
        wait_for_completion: wait_for_completion.unwrap_or(true), // Default to true
    })
}

/// Get the status of a print job (new format)
#[napi]
pub fn get_printer_job(job_id: f64) -> Option<PrinterJob> {
    PrinterCore::get_job_status(job_id as u64).map(convert_printer_job)
}

/// Get the status of a print job (legacy format for backward compatibility)
#[napi]
pub fn get_job_status(job_id: u32) -> Option<JobStatus> {
    if let Some(job) = PrinterCore::get_job_status(job_id as u64) {
        // Convert new format back to legacy format
        let legacy_status = match job.state {
            crate::core::PrinterJobState::PENDING => "queued",
            crate::core::PrinterJobState::PROCESSING => "printing",
            crate::core::PrinterJobState::COMPLETED => "completed",
            crate::core::PrinterJobState::CANCELLED => "failed",
            _ => "unknown",
        };

        Some(JobStatus {
            id: job.id as u32,
            printer_name: job.printer_name,
            file_path: format!("Job: {}", job.name), // Approximate file_path from job name
            job_name: Some(job.name),
            status: legacy_status.to_string(),
            error_message: job.error_message,
            age_seconds: job
                .created_at
                .elapsed()
                .unwrap_or(std::time::Duration::from_secs(0))
                .as_secs() as u32,
        })
    } else {
        None
    }
}

/// Convert core PrinterJob to N-API PrinterJob
fn convert_printer_job(job: crate::core::PrinterJob) -> PrinterJob {
    PrinterJob {
        id: job.id as f64,
        name: job.name,
        state: job.state.as_string(),
        media_type: job.media_type,
        created_at: job
            .created_at
            .duration_since(std::time::SystemTime::UNIX_EPOCH)
            .unwrap_or(std::time::Duration::from_secs(0))
            .as_secs() as f64,
        processed_at: job.processed_at.map(|t| {
            t.duration_since(std::time::SystemTime::UNIX_EPOCH)
                .unwrap_or(std::time::Duration::from_secs(0))
                .as_secs() as f64
        }),
        completed_at: job.completed_at.map(|t| {
            t.duration_since(std::time::SystemTime::UNIX_EPOCH)
                .unwrap_or(std::time::Duration::from_secs(0))
                .as_secs() as f64
        }),
        printer_name: job.printer_name,
        error_message: job.error_message,
        age_seconds: job
            .created_at
            .elapsed()
            .unwrap_or(std::time::Duration::from_secs(0))
            .as_secs() as f64,
    }
}

/// Get all active jobs (pending or processing)
#[napi]
pub fn get_active_jobs() -> Vec<PrinterJob> {
    PrinterCore::get_active_jobs()
        .into_iter()
        .map(convert_printer_job)
        .collect()
}

/// Get active jobs for a specific printer
#[napi]
pub fn get_active_jobs_for_printer(printer_name: String) -> Vec<PrinterJob> {
    PrinterCore::get_active_jobs_for_printer(&printer_name)
        .into_iter()
        .map(convert_printer_job)
        .collect()
}

/// Get job history (completed or cancelled jobs)
#[napi]
pub fn get_job_history() -> Vec<PrinterJob> {
    PrinterCore::get_job_history()
        .into_iter()
        .map(convert_printer_job)
        .collect()
}

/// Get job history for a specific printer
#[napi]
pub fn get_job_history_for_printer(printer_name: String) -> Vec<PrinterJob> {
    PrinterCore::get_job_history_for_printer(&printer_name)
        .into_iter()
        .map(convert_printer_job)
        .collect()
}

/// Get all jobs for a specific printer
#[napi]
pub fn get_all_jobs_for_printer(printer_name: String) -> Vec<PrinterJob> {
    PrinterCore::get_all_jobs_for_printer(&printer_name)
        .into_iter()
        .map(convert_printer_job)
        .collect()
}

/// Clean up old completed/failed jobs
#[napi]
pub fn cleanup_old_jobs(max_age_seconds: u32) -> u32 {
    PrinterCore::cleanup_old_jobs(max_age_seconds as u64)
}

/// Get active jobs for a specific printer (for printer object methods)
#[napi]
pub fn printer_get_active_jobs(printer_name: String) -> Vec<PrinterJob> {
    PrinterCore::get_active_jobs_for_printer(&printer_name)
        .into_iter()
        .map(convert_printer_job)
        .collect()
}

/// Get job history for a specific printer (for printer object methods)
#[napi]
pub fn printer_get_job_history(printer_name: String, limit: Option<u32>) -> Vec<PrinterJob> {
    let mut jobs = PrinterCore::get_job_history_for_printer(&printer_name);

    // Apply limit if specified
    if let Some(limit) = limit {
        jobs.truncate(limit as usize);
    }

    jobs.into_iter().map(convert_printer_job).collect()
}

/// Get a specific job for a printer (for printer object methods)
#[napi]
pub fn printer_get_job(printer_name: String, job_id: f64) -> Option<PrinterJob> {
    if let Some(job) = PrinterCore::get_job_status(job_id as u64) {
        if job.printer_name == printer_name {
            Some(convert_printer_job(job))
        } else {
            None
        }
    } else {
        None
    }
}

/// Get all jobs for a specific printer (for printer object methods)
#[napi]
pub fn printer_get_all_jobs(printer_name: String) -> Vec<PrinterJob> {
    PrinterCore::get_all_jobs_for_printer(&printer_name)
        .into_iter()
        .map(convert_printer_job)
        .collect()
}

/// Clean up old jobs for a specific printer (for printer object methods)
#[napi]
pub fn printer_cleanup_old_jobs(_printer_name: String, max_age_seconds: u32) -> u32 {
    // For now, just call the global cleanup and filter by printer
    // TODO: Implement printer-specific cleanup in core
    PrinterCore::cleanup_old_jobs(max_age_seconds as u64)
}

/// Shutdown the library and cleanup all background threads
#[napi]
pub fn shutdown() -> Result<()> {
    PrinterCore::shutdown_library();
    Ok(())
}

/// Calculate appropriate delay to keep printer instance alive based on file characteristics
fn calculate_file_print_delay(file_path: &str) -> u64 {
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
