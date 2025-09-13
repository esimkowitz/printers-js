//! Cross-runtime printer library via N-API
//!
//! This library provides printer functionality for JavaScript runtimes
//! through Node-API bindings, compatible with Node.js, Deno, and Bun.

pub mod core;

#[cfg(feature = "napi")]
pub mod napi;

#[cfg(feature = "napi")]
pub mod node;

// Re-export core functionality
pub use core::*;
