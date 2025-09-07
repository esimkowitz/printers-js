//! Build script for cross-runtime support

fn main() {
    // Only run napi-build when building for Node.js
    #[cfg(feature = "napi")]
    {
        napi_build::setup();
    }

    println!("cargo:rerun-if-changed=src/");
    println!("cargo:rerun-if-changed=Cargo.toml");
}
