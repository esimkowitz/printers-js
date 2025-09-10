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

# Install Task runner
echo "📋 Installing Task runner..."
sudo sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# Build all runtimes
echo "🔨 Building all runtimes..."
deno run --allow-run --allow-read --allow-env scripts/build-all.ts || echo "⚠️  Build failed - this is expected in CI environment"

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
chmod +x scripts/*.ts scripts/*.sh || echo "⚠️  Some scripts may not need execute permissions"

echo "✅ Development environment setup complete!"
echo ""
echo "🧪 Available commands:"
echo "  task test:all                     - Run all tests across runtimes"
echo "  task build:all                    - Build all runtime libraries"
echo "  task ci:local                     - Run CI workflows locally with act"
echo "  task test                         - Run Deno tests (shared.test.ts)"
echo "  task test:node                    - Run Node.js tests with coverage"
echo "  task test:bun                     - Run Bun tests"
echo ""
echo "🔧 Linting commands:"
echo "  task lint                         - Lint all code"
echo "  task lint:fix                     - Fix linting issues in all code"
echo "  deno lint                         - Lint Deno-managed files (deno.ts, scripts/, tests/shared.test.ts)"
echo "  task lint:node                    - Lint non-Deno files (index.ts, node.ts, bun.ts, tests/node-test-runner.ts)"
echo "  cargo clippy                      - Lint Rust code"
echo ""
echo "🔧 Development workflow:"
echo "  1. Make your changes"
echo "  2. Run linters: task lint && cargo clippy"
echo "  3. Run cross-platform test script to test all runtimes"
echo "  4. Run local CI script to test CI workflows locally"
echo "  5. Commit and push"
echo ""
echo "⚠️  Note: Set PRINTERS_JS_SIMULATE=false to test real printing (USE WITH CAUTION)"