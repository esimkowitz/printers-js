#!/usr/bin/env node
/**
 * run-ci-local.js - Run CI workflows locally using nektos/act
 * This script allows you to test GitHub Actions workflows locally before pushing
 */

import { colorize, runCommand } from "./utils.js";

async function checkActInstalled() {
  const result = await runCommand(["act", "--version"], { showOutput: false });
  return result.success;
}

async function runWorkflow(workflowName, workflowFile, event, verbose = false) {
  console.log(colorize("blue", `🔄 Running ${workflowName} workflow...`));
  console.log(`Workflow file: ${workflowFile}`);
  console.log(`Event: ${event}`);
  console.log("----------------------------------------");

  const args = [event, "--workflows", `.github/workflows/${workflowFile}`];
  if (verbose) {
    args.push("--verbose");
  }

  const result = await runCommand(["act", ...args]);

  if (result.success) {
    console.log(
      colorize("green", `✅ ${workflowName} workflow completed successfully`)
    );
    return true;
  } else {
    console.log(colorize("red", `❌ ${workflowName} workflow failed`));
    console.log(result.output);
    return false;
  }
}

function printUsage(scriptName) {
  console.log(`Usage: ${scriptName} [OPTIONS]`);
  console.log();
  console.log("Options:");
  console.log("  --build, --ci    Run the build/CI workflow only");
  console.log("  --all           Run all workflows");
  console.log("  --dry-run       Show what would be run without executing");
  console.log("  --verbose, -v   Enable verbose output");
  console.log("  --help, -h      Show this help message");
  console.log();
  console.log("Examples:");
  console.log(`  ${scriptName} --build      # Run just the build workflow`);
  console.log(`  ${scriptName} --all        # Run all workflows`);
  console.log(`  ${scriptName} --dry-run    # Preview what would run`);
}

async function main() {
  console.log(
    colorize(
      "blue",
      "   Running GitHub Actions workflows locally with nektos/act"
    )
  );
  console.log(
    "=================================================================="
  );

  // Parse command line arguments
  const args = process.argv.slice(2);
  let workflow = "build"; // default
  let dryRun = false;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--build":
      case "--ci":
        workflow = "build";
        break;
      case "--all":
        workflow = "all";
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--verbose":
      case "-v":
        verbose = true;
        break;
      case "--help":
      case "-h":
        printUsage("node scripts/run-ci-local.js");
        process.exit(0);
        break;
      default:
        console.log(colorize("red", `Unknown option: ${arg}`));
        console.log("Use --help for usage information");
        process.exit(1);
    }
  }

  console.log("Configuration:");
  console.log(`  Workflow: ${workflow}`);
  console.log(`  Dry run: ${dryRun}`);
  console.log(`  Verbose: ${verbose}`);
  console.log();

  // Check if act is installed
  const actInstalled = await checkActInstalled();
  if (!actInstalled) {
    console.log(colorize("red", "❌ Error: nektos/act is not installed"));
    console.log();
    console.log("Please install act first:");
    console.log();
    console.log("# macOS (using Homebrew):");
    console.log("brew install act");
    console.log();
    console.log("# Linux (using curl):");
    console.log(
      "curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash"
    );
    console.log();
    console.log("# Or download from: https://github.com/nektos/act/releases");
    console.log();
    process.exit(1);
  }

  const versionResult = await runCommand(["act", "--version"], {
    showOutput: false,
  });
  console.log(colorize("green", "   nektos/act is installed"));
  console.log(`Act version: ${versionResult.output.trim()}`);
  console.log();

  // Dry run mode - just show what would be executed
  if (dryRun) {
    console.log(
      colorize("yellow", "   DRY RUN MODE - showing what would be executed:")
    );
    console.log();

    if (workflow === "all") {
      console.log("Would run:");
      console.log("  1. Build workflow (push event): .github/workflows/ci.yml");
      console.log(
        "  2. Build workflow (pull_request_target event): .github/workflows/ci.yml"
      );
    } else {
      console.log("Would run:");
      console.log("  1. Build workflow (push event): .github/workflows/ci.yml");
    }

    console.log();
    console.log("To actually run the workflows, remove the --dry-run flag");
    return;
  }

  // Run the specified workflows
  let success = true;

  if (workflow === "all") {
    console.log(colorize("blue", "Running all workflows..."));
    console.log();

    // Run build workflow for push event
    if (!(await runWorkflow("Build (push)", "ci.yml", "push", verbose))) {
      success = false;
    }

    console.log();

    // Run build workflow for pull_request_target event
    if (
      !(await runWorkflow(
        "Build (pull_request_target)",
        "ci.yml",
        "pull_request_target",
        verbose
      ))
    ) {
      success = false;
    }
  } else if (workflow === "build") {
    // Run just the build workflow
    if (!(await runWorkflow("Build", "ci.yml", "push", verbose))) {
      success = false;
    }
  }

  console.log();
  console.log(
    "=================================================================="
  );

  if (success) {
    console.log(colorize("green", "🎉 All workflows completed successfully!"));
    console.log();
    console.log(colorize("blue", "💡 Tips:"));
    console.log("  • Use --verbose for more detailed output");
    console.log("  • Use --dry-run to preview without execution");
    console.log("  • Check .act/ directory for cached images and data");
    console.log(
      "  • Workflows run in Docker containers matching Ubuntu runner"
    );
  } else {
    console.log(colorize("red", "❌ Some workflows failed"));
    console.log();
    console.log(colorize("yellow", "🔧 Troubleshooting:"));
    console.log("  • Check Docker is running and has sufficient resources");
    console.log("  • Review error messages above for specific issues");
    console.log("  • Consider running individual steps manually first");
    console.log("  • Some GitHub Actions features may not work locally");
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
