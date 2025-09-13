#!/usr/bin/env -S deno run --allow-run --allow-env --allow-read
/**
 * run-ci-local.ts - Run CI workflows locally using nektos/act
 * This script allows you to test GitHub Actions workflows locally before pushing
 */

// Colors for output
const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  blue: "\x1b[0;34m",
  reset: "\x1b[0m", // No Color
};

function colorize(color: keyof typeof colors, text: string): string {
  return `${colors[color]}${text}${colors.reset}`;
}

async function runCommand(
  command: string[],
  options: { env?: Record<string, string> } = {}
): Promise<{ success: boolean; output: string }> {
  try {
    const cmd = new Deno.Command(command[0], {
      args: command.slice(1),
      env: {
        ...Deno.env.toObject(),
        ...options.env,
      },
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await cmd.output();
    const output =
      new TextDecoder().decode(stdout) + new TextDecoder().decode(stderr);

    return {
      success: code === 0,
      output,
    };
  } catch (error) {
    return {
      success: false,
      output: `Command failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

async function checkActInstalled(): Promise<boolean> {
  const result = await runCommand(["act", "--version"]);
  return result.success;
}

async function runWorkflow(
  workflowName: string,
  workflowFile: string,
  event: string,
  verbose = false
): Promise<boolean> {
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

function printUsage(scriptName: string): void {
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

async function main(): Promise<void> {
  console.log(
    colorize(
      "blue",
      "🏃 Running GitHub Actions workflows locally with nektos/act"
    )
  );
  console.log(
    "=================================================================="
  );

  // Parse command line arguments
  const args = Deno.args;
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
        printUsage("deno run scripts/run-ci-local.ts");
        Deno.exit(0);
        break;
      default:
        console.log(colorize("red", `Unknown option: ${arg}`));
        console.log("Use --help for usage information");
        Deno.exit(1);
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
    Deno.exit(1);
  }

  const versionResult = await runCommand(["act", "--version"]);
  console.log(colorize("green", "✅ nektos/act is installed"));
  console.log(`Act version: ${versionResult.output.trim()}`);
  console.log();

  // Dry run mode - just show what would be executed
  if (dryRun) {
    console.log(
      colorize("yellow", "🔍 DRY RUN MODE - showing what would be executed:")
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
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
