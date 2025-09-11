//! Cross-runtime printer library
//!
//! This library provides printer functionality for multiple JavaScript runtimes:
//! - Deno and Bun via FFI
//! - Node.js via N-API

pub mod core;
pub mod ffi;

#[cfg(feature = "napi")]
pub mod napi;

#[cfg(feature = "napi")]
pub mod node;

// Re-export core functionality
pub use core::*;
