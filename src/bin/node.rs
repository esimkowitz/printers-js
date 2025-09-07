//! Node.js binary entry point for N-API
//! This file is only used when building specifically for Node.js

fn main() {
    // This binary is only used for N-API builds,
    // the actual N-API exports are in src/napi.rs
    println!("This binary should not be executed directly. Use the N-API module instead.");
}
