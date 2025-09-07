#!/bin/bash

# run-ci-local.sh - Run CI workflows locally using nektos/act
# This script allows you to test GitHub Actions workflows locally before pushing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏃 Running GitHub Actions workflows locally with nektos/act${NC}"
echo "=================================================================="

# Check if act is installed
if ! command -v act &> /dev/null; then
    echo -e "${RED}❌ Error: nektos/act is not installed${NC}"
    echo ""
    echo "Please install act first:"
    echo ""
    echo "# macOS (using Homebrew):"
    echo "brew install act"
    echo ""
    echo "# Linux (using curl):"
    echo "curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash"
    echo ""
    echo "# Or download from: https://github.com/nektos/act/releases"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ nektos/act is installed${NC}"
echo "Act version: $(act --version)"
echo ""

# Function to run a specific workflow
run_workflow() {
    local workflow_name="$1"
    local workflow_file="$2"
    local event="$3"
    
    echo -e "${BLUE}🔄 Running $workflow_name workflow...${NC}"
    echo "Workflow file: $workflow_file"
    echo "Event: $event"
    echo "----------------------------------------"
    
    if act "$event" --workflows ".github/workflows/$workflow_file" --verbose; then
        echo -e "${GREEN}✅ $workflow_name workflow completed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ $workflow_name workflow failed${NC}"
        return 1
    fi
}

# Parse command line arguments
WORKFLOW=""
DRY_RUN=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build|--ci)
            WORKFLOW="build"
            shift
            ;;
        --all)
            WORKFLOW="all"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --build, --ci    Run the build/CI workflow only"
            echo "  --all           Run all workflows"
            echo "  --dry-run       Show what would be run without executing"
            echo "  --verbose, -v   Enable verbose output"
            echo "  --help, -h      Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --build      # Run just the build workflow"
            echo "  $0 --all        # Run all workflows"
            echo "  $0 --dry-run    # Preview what would run"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Default to build workflow if no option specified
if [[ -z "$WORKFLOW" ]]; then
    WORKFLOW="build"
fi

echo "Configuration:"
echo "  Workflow: $WORKFLOW"
echo "  Dry run: $DRY_RUN"
echo "  Verbose: $VERBOSE"
echo ""

# Dry run mode - just show what would be executed
if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}🔍 DRY RUN MODE - showing what would be executed:${NC}"
    echo ""
    
    if [[ "$WORKFLOW" == "all" ]]; then
        echo "Would run:"
        echo "  1. Build workflow (push event): .github/workflows/ci.yml"
        echo "  2. Build workflow (pull_request_target event): .github/workflows/ci.yml"
    else
        echo "Would run:"
        echo "  1. Build workflow (push event): .github/workflows/ci.yml"
    fi
    
    echo ""
    echo "To actually run the workflows, remove the --dry-run flag"
    exit 0
fi

# Set act options
ACT_OPTS=""
if [[ "$VERBOSE" == true ]]; then
    ACT_OPTS="$ACT_OPTS --verbose"
fi

# Run the specified workflows
SUCCESS=true

if [[ "$WORKFLOW" == "all" ]]; then
    echo -e "${BLUE}Running all workflows...${NC}"
    echo ""
    
    # Run build workflow for push event
    if ! run_workflow "Build (push)" "ci.yml" "push"; then
        SUCCESS=false
    fi
    
    echo ""
    
    # Run build workflow for pull_request_target event  
    if ! run_workflow "Build (pull_request_target)" "ci.yml" "pull_request_target"; then
        SUCCESS=false
    fi
    
elif [[ "$WORKFLOW" == "build" ]]; then
    # Run just the build workflow
    if ! run_workflow "Build" "ci.yml" "push"; then
        SUCCESS=false
    fi
fi

echo ""
echo "=================================================================="

if [[ "$SUCCESS" == true ]]; then
    echo -e "${GREEN}🎉 All workflows completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}💡 Tips:${NC}"
    echo "  • Use --verbose for more detailed output"
    echo "  • Use --dry-run to preview without execution"  
    echo "  • Check .act/ directory for cached images and data"
    echo "  • Workflows run in Docker containers matching Ubuntu runner"
    exit 0
else
    echo -e "${RED}❌ Some workflows failed${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Troubleshooting:${NC}"
    echo "  • Check Docker is running and has sufficient resources"
    echo "  • Review error messages above for specific issues"
    echo "  • Consider running individual steps manually first"
    echo "  • Some GitHub Actions features may not work locally"
    exit 1
fi