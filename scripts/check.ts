#!/usr/bin/env bun
import { spawn } from "bun";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Ensure frontend/dist exists for Go's //go:embed directive
const distDir = join(process.cwd(), "frontend", "dist");
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
  writeFileSync(join(distDir, "index.html"), "<!doctype html><title>placeholder</title>");
}

// ANSI styling
const isTTY = process.stdout.isTTY && !process.env.CI;
const colors = {
  reset: isTTY ? "\x1b[0m" : "",
  bold: isTTY ? "\x1b[1m" : "",
  dim: isTTY ? "\x1b[2m" : "",
  green: isTTY ? "\x1b[32m" : "",
  red: isTTY ? "\x1b[31m" : "",
  yellow: isTTY ? "\x1b[33m" : "",
  cyan: isTTY ? "\x1b[36m" : "",
  magenta: isTTY ? "\x1b[35m" : "",
};

const args = process.argv.slice(2);
const isFix = args.includes("--fix");
const isFeOnly = args.includes("--fe") || args.includes("--frontend");
const isBeOnly = args.includes("--be") || args.includes("--backend");
const isCI = args.includes("--ci") || !!process.env.CI;

interface CheckTask {
  id: string;
  name: string;
  category: "frontend" | "backend";
  cmd: string[];
  cwd?: string;
}

// Check if gotestsum is installed for pretty backend test output
const hasGotestsum = Bun.which("gotestsum") !== null;

const allTasks: CheckTask[] = [
  // Frontend
  {
    id: "fe:format",
    name: isFix ? "Format (Prettier --write)" : "Format (Prettier)",
    category: "frontend",
    cmd: isFix
      ? ["bun", "run", "format"]
      : ["bun", "run", "format:check"],
    cwd: "frontend",
  },
  {
    id: "fe:lint",
    name: isFix ? "Lint (ESLint --fix)" : "Lint (ESLint)",
    category: "frontend",
    cmd: isFix
      ? ["bun", "run", "lint"]
      : ["bun", "run", "lint:check"],
    cwd: "frontend",
  },
  {
    id: "fe:typecheck",
    name: "Typecheck (TSGO)",
    category: "frontend",
    cmd: ["bun", "run", "tsgo"],
    cwd: "frontend",
  },
  {
    id: "fe:deadcode",
    name: "Dead Code (Knip)",
    category: "frontend",
    cmd: isCI
      ? ["bun", "run", "knip:ci"]
      : ["bun", "run", "knip"],
    cwd: "frontend",
  },
  {
    id: "fe:test",
    name: "Unit Tests (Bun Test)",
    category: "frontend",
    cmd: ["bun", "run", "test:unit"],
    cwd: "frontend",
  },
  // Backend
  {
    id: "be:deadcode",
    name: "Dead Code (Go deadcode)",
    category: "backend",
    cmd: ["deadcode", "./..."],
  },
  {
    id: "be:vet",
    name: "Vet (Go vet)",
    category: "backend",
    cmd: ["go", "vet", "./..."],
  },
  {
    id: "be:test",
    name: "Unit Tests (Go)",
    category: "backend",
    cmd: hasGotestsum
      ? ["gotestsum", "--format=pkgname", "./internal/..."]
      : ["go", "test", "./internal/..."],
  },
];

// Filter tasks based on flags
const activeTasks = allTasks.filter((task) => {
  if (isFeOnly) return task.category === "frontend";
  if (isBeOnly) return task.category === "backend";
  return true;
});

interface TaskResult {
  task: CheckTask;
  success: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  exitCode: number;
}

console.log(
  `\n${colors.bold}${colors.cyan}⚡ Running ${activeTasks.length} checks in parallel...${colors.reset}\n`
);

const startTime = performance.now();

async function runTask(task: CheckTask): Promise<TaskResult> {
  const taskStart = performance.now();
  try {
    const proc = spawn({
      cmd: task.cmd,
      cwd: task.cwd ?? process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdoutBuf, stderrBuf, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    const durationMs = performance.now() - taskStart;
    const success = exitCode === 0;

    const symbol = success
      ? `${colors.green}✓${colors.reset}`
      : `${colors.red}✗${colors.reset}`;
    const timeStr = `${colors.dim}(${(durationMs / 1000).toFixed(2)}s)${colors.reset}`;
    const tag = `[${task.category === "frontend" ? colors.magenta + "FE" : colors.yellow + "BE"}${colors.reset}]`;

    console.log(`  ${symbol} ${tag} ${colors.bold}${task.name}${colors.reset} ${timeStr}`);

    return {
      task,
      success,
      durationMs,
      stdout: stdoutBuf,
      stderr: stderrBuf,
      exitCode: exitCode ?? 1,
    };
  } catch (err: unknown) {
    const durationMs = performance.now() - taskStart;
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.log(
      `  ${colors.red}✗${colors.reset} [${task.category.toUpperCase()}] ${colors.bold}${task.name}${colors.reset} ${colors.red}(failed to start: ${errorMsg})${colors.reset}`
    );
    return {
      task,
      success: false,
      durationMs,
      stdout: "",
      stderr: errorMsg,
      exitCode: 1,
    };
  }
}

// Execute all tasks in parallel
const results = await Promise.all(activeTasks.map(runTask));
const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);

const failures = results.filter((r) => !r.success);

// Print failure details
if (failures.length > 0) {
  console.log(`\n${colors.bold}${colors.red}── Failures (${failures.length}) ──────────────────────────────────${colors.reset}\n`);
  for (const failure of failures) {
    console.log(
      `${colors.bold}${colors.red}▶ ${failure.task.name}${colors.reset} ${colors.dim}(${failure.task.cmd.join(" ")})${colors.reset}`
    );
    const output = (failure.stdout + failure.stderr).trim();
    if (output) {
      console.log(
        output
          .split("\n")
          .map((line) => `  ${colors.dim}│${colors.reset} ${line}`)
          .join("\n")
      );
    } else {
      console.log(`  ${colors.dim}│ (No output, exited with code ${failure.exitCode})${colors.reset}`);
    }
    console.log("");
  }
}

// Write to GitHub Step Summary if running in GitHub Actions
if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    let summaryMd = `### Quality Checks Summary (${totalDuration}s)\n\n`;
    summaryMd += `| Status | Scope | Check | Duration |\n`;
    summaryMd += `| :---: | :--- | :--- | :---: |\n`;
    for (const r of results) {
      const statusIcon = r.success ? "✅" : "❌";
      summaryMd += `| ${statusIcon} | ${r.task.category.toUpperCase()} | ${r.task.name} | ${(r.durationMs / 1000).toFixed(2)}s |\n`;
    }
    if (failures.length > 0) {
      summaryMd += `\n<details><summary><b>Failed Check Details</b></summary>\n\n`;
      for (const f of failures) {
        summaryMd += `#### ${f.task.name}\n\`\`\`\n${(f.stdout + f.stderr).trim()}\n\`\`\`\n`;
      }
      summaryMd += `</details>\n`;
    }
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMd);
  } catch (summaryErr) {
    console.error("Failed to write to GITHUB_STEP_SUMMARY:", summaryErr);
  }
}

console.log(
  `\n${colors.bold}${failures.length === 0 ? colors.green + "✨ All checks passed!" : colors.red + "💥 Checks failed."}${colors.reset} ${colors.dim}Finished in ${totalDuration}s${colors.reset}\n`
);

process.exit(failures.length === 0 ? 0 : 1);
