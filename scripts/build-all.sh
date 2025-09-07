#!/usr/bin/env bash

# Build script for all runtimes
set -e

echo "Building cross-runtime printer library..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build for Deno/Bun (FFI)
echo -e "${YELLOW}Building FFI library for Deno/Bun...${NC}"
cargo build --release
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ FFI library built successfully${NC}"
else
    echo -e "${RED}✗ FFI library build failed${NC}"
    exit 1
fi

# Build for Node.js (N-API) - requires npm/napi-cli
if command -v npx &> /dev/null && [ -f "package.json" ]; then
    echo -e "${YELLOW}Building N-API library for Node.js...${NC}"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing Node.js dependencies..."
        npm install
    fi
    
    # Build with napi-rs CLI
    npm run build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ N-API library built successfully${NC}"
    else
        echo -e "${RED}✗ N-API library build failed${NC}"
        echo "Note: N-API build requires Node.js and @napi-rs/cli"
    fi
else
    echo -e "${YELLOW}Skipping N-API build (Node.js/npm not available or package.json missing)${NC}"
fi

echo -e "${GREEN}Build complete!${NC}"
echo ""
echo "Available libraries:"
echo "  - target/release/libdeno_printers.dylib (macOS FFI)"
echo "  - target/release/libdeno_printers.so (Linux FFI)"  
echo "  - target/release/deno_printers.dll (Windows FFI)"
echo "  - napi/*.node (Node.js N-API, if built)"