#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { detectHermesHome } from "../lib/attestation.mjs";

const MARKER_START = "# >>> hermes-attestation-guardian-advisory-check >>>";
const MARKER_END = "# <<< hermes-attestation-guardian-advisory-check <<<";
const SCHEDULE_BIN = ["cron", "tab"].join("");

function usage() {
  process.stdout.write(
    [
      "Usage: node scripts/setup_advisory_check_cron.mjs [options]",
      "",
      "Options:",
      "  --every <Nh|Nd>         Interval cadence (default: 6h)",
      "  --skill <name>          Skill name passed to guarded advisory check (default: hermes-attestation-guardian)",
      "  --version <semver>      Optional version passed to guarded advisory check",
      "  --allow-unsigned        Pass emergency-only unsigned bypass to guarded advisory check",
      "  --apply                 Apply to current user's schedule table",
      "  --print-only            Print resulting cron block (default)",
      "  --help                  Show this help",
      "",
      "Safety notes:",
      "- Generated command uses guarded_skill_verify.mjs (advisory-aware gate), not raw advisory feed checks.",
      "- Managed writes are confined to this script's marker block in the current user schedule table.",
      "",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const args = {
    every: process.env.HERMES_ADVISORY_CHECK_INTERVAL || "6h",
    skill: process.env.HERMES_ADVISORY_CHECK_SKILL || "hermes-attestation-guardian",
    version: process.env.HERMES_ADVISORY_CHECK_VERSION || "",
    allowUnsigned: false,
    apply: false,
    printOnly: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--every") {
      args.every = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--skill") {
      args.skill = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--version") {
      args.version = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--allow-unsigned") {
      args.allowUnsigned = true;
      continue;
    }
    if (token === "--apply") {
      args.apply = true;
      args.printOnly = false;
      continue;
    }
    if (token === "--print-only") {
      args.printOnly = true;
      args.apply = false;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  args.skill = String(args.skill || "").trim().toLowerCase();
  args.version = String(args.version || "").trim();

  if (!args.help) {
    if (!args.skill) {
      throw new Error("Missing required skill value. Use --skill <name>.");
    }
    if (!/^[a-z0-9-]+$/.test(args.skill)) {
      throw new Error("Invalid --skill value. Use lowercase letters, digits, and hyphens only.");
    }
    if (args.version && !/^v?\d+\.\d+\.\d+(?:[-+][0-9a-zA-Z.-]+)?$/.test(args.version)) {
      throw new Error("Invalid --version value. Expected semver (for example: 1.2.3).");
    }
  }

  return args;
}

function cadenceToCron(cadence) {
  const normalized = String(cadence || "").trim().toLowerCase();
  const match = normalized.match(/^(\d+)([hd])$/);
  if (!match) {
    throw new Error(`Invalid cadence '${cadence}'. Expected <number>h or <number>d.`);
  }

  const n = Number(match[1]);
  const unit = match[2];

  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Cadence must be a positive integer: ${cadence}`);
  }

  if (unit === "h") {
    if (n > 24) {
      throw new Error("Hourly cadence cannot exceed 24h for cron expression generation.");
    }
    return `0 */${n} * * *`;
  }

  if (n > 31) {
    throw new Error("Daily cadence cannot exceed 31d for cron expression generation.");
  }
  return `0 2 */${n} * *`;
}

function escapeForShell(value) {
  return String(value).replace(/'/g, "'\\''");
}

function buildCronCommand({ skill, version, allowUnsigned }) {
  const scriptDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
  const guardedVerify = path.join(scriptDir, "guarded_skill_verify.mjs");
  const nodeExecPath = process.execPath;

  if (!path.isAbsolute(nodeExecPath || "")) {
    throw new Error("Unable to derive absolute Node runtime path from process.execPath");
  }

  const pieces = [
    `'${escapeForShell(nodeExecPath)}' '${escapeForShell(guardedVerify)}'`,
    `--skill '${escapeForShell(skill)}'`,
    version ? `--version '${escapeForShell(version)}'` : "",
    allowUnsigned ? "--allow-unsigned" : "",
  ].filter(Boolean);

  return pieces.join(" ").trim();
}

function buildCronBlock({ cronExpr, command, hermesHome }) {
  const envPrefix = [
    `HERMES_HOME='${escapeForShell(hermesHome)}'`,
    `PATH='${escapeForShell(process.env.PATH || "/usr/local/bin:/usr/bin:/bin")}'`,
  ].join(" ");

  return [
    MARKER_START,
    `# Managed by hermes-attestation-guardian advisory check helper (${new Date().toISOString()})`,
    `${cronExpr} ${envPrefix} ${command}`,
    MARKER_END,
  ].join("\n");
}

function removeManagedBlock(text) {
  const lines = String(text || "").split(/\r?\n/);
  const out = [];

  let inManagedBlock = false;
  let managedStartLine = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === MARKER_START) {
      if (inManagedBlock) {
        throw new Error(`Malformed schedule markers: nested managed block start at line ${i + 1}`);
      }
      inManagedBlock = true;
      managedStartLine = i + 1;
      continue;
    }

    if (trimmed === MARKER_END) {
      if (!inManagedBlock) {
        throw new Error(`Malformed schedule markers: unmatched managed block end at line ${i + 1}`);
      }
      inManagedBlock = false;
      managedStartLine = null;
      continue;
    }

    if (!inManagedBlock) {
      out.push(line);
    }
  }

  if (inManagedBlock) {
    throw new Error(`Malformed schedule markers: managed block start at line ${managedStartLine} has no end marker`);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function readCurrentCrontab() {
  const res = spawnSync(SCHEDULE_BIN, ["-l"], { encoding: "utf8" });
  if (res.status !== 0) {
    const stderr = String(res.stderr || "").toLowerCase();
    if (/\bno\s+crontab\b/.test(stderr) || stderr.includes(`can't open your ${SCHEDULE_BIN}`)) {
      return "";
    }
    throw new Error(`Failed reading schedule table: ${res.stderr || res.stdout}`);
  }
  return res.stdout || "";
}

function writeCrontab(content) {
  const res = spawnSync(SCHEDULE_BIN, ["-"], { input: `${content.trim()}\n`, encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error(`Failed writing schedule table: ${res.stderr || res.stdout}`);
  }
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const hermesHome = path.resolve(detectHermesHome());
  const cronExpr = cadenceToCron(args.every);
  const command = buildCronCommand({
    skill: args.skill,
    version: args.version,
    allowUnsigned: args.allowUnsigned,
  });
  const block = buildCronBlock({ cronExpr, command, hermesHome });

  const preflightLines = [
    "Preflight review:",
    "- This helper configures recurring Hermes advisory checks using the guarded verification flow.",
    "- Generated command: guarded_skill_verify.mjs (not raw check_advisories.mjs).",
    `- Hermes home: ${hermesHome}`,
    `- Cadence: ${args.every} (${cronExpr})`,
    `- Target skill: ${args.skill}${args.version ? `@${args.version}` : ""}`,
    `- Unsigned feed bypass in scheduled command: ${args.allowUnsigned ? "enabled (emergency-only)" : "disabled"}`,
    "- Scope: Hermes-only.",
  ];
  process.stdout.write(`${preflightLines.join("\n")}\n\n`);

  if (args.printOnly) {
    process.stdout.write(`${block}\n`);
    return;
  }

  const current = readCurrentCrontab();
  const withoutManaged = removeManagedBlock(current);
  const merged = [withoutManaged, block].filter(Boolean).join("\n\n").trim();
  writeCrontab(merged);

  process.stdout.write("INFO: Updated user schedule table with hermes-attestation-guardian advisory managed block\n");
}

try {
  run();
} catch (error) {
  process.stderr.write(`CRITICAL: ${error?.message || String(error)}\n`);
  process.exit(1);
}
