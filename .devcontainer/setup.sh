#!/bin/bash

# Post-create setup script for devcontainer
set -e

echo "🚀 Setting up cross-runtime development environment..."

# Update PATH for current session
export PATH="$HOME/.deno/bin:$HOME/.bun/bin:$HOME/.cargo/bin:$PATH"

# Install Rust if not already installed by features
if ! command -v cargo &> /dev/null; then
    echo "📦 Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
fi

# Install cargo tools
echo "🔧 Installing Rust development tools..."
cargo install cargo-llvm-cov cargo2junit

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# Build all runtimes
echo "🔨 Building all runtimes..."
./scripts/build-all.sh || echo "⚠️  Build failed - this is expected in CI environment"

# Set up git (if not configured)
if [ -z "$(git config --global user.name)" ]; then
    echo "⚙️  Setting up git configuration..."
    git config --global user.name "devcontainer"
    git config --global user.email "devcontainer@localhost"
    git config --global init.defaultBranch main
fi

# Create test results and coverage directories
mkdir -p test-results/coverage/{deno,node,bun,rust}

# Set up CUPS service (if running as root)
if [ "$EUID" -eq 0 ]; then
    echo "🖨️  Starting CUPS service..."
    service cups start || echo "⚠️  CUPS service start failed - printer access may be limited"
fi

# Make scripts executable
chmod +x scripts/*.sh

echo "✅ Development environment setup complete!"
echo ""
echo "🧪 Available commands:"
echo "  ./scripts/test-all.sh       - Run all tests across runtimes"
echo "  ./scripts/build-all.sh      - Build all runtime libraries"
echo "  ./scripts/run-ci-local.sh   - Run CI workflows locally with act"
echo "  deno task test              - Run Deno tests"
echo "  npm run test:jest           - Run Node.js Jest tests"  
echo "  bun test                    - Run Bun tests"
echo ""
echo "🔧 Development workflow:"
echo "  1. Make your changes"
echo "  2. Run ./scripts/test-all.sh to test all runtimes"
echo "  3. Run ./scripts/run-ci-local.sh --build to test CI locally"
echo "  4. Commit and push"
echo ""
echo "⚠️  Note: Set PRINTERS_JS_SIMULATE=false to test real printing (USE WITH CAUTION)"