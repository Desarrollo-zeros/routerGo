#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IGNORED_FILES = new Set([".env.example", "pnpm-lock.yaml"]);
const TEXT_EXTENSIONS = new Set([
  ".cjs", ".css", ".env", ".html", ".js", ".json", ".mjs", ".md", ".sql",
  ".ts", ".tsx", ".yml", ".yaml",
]);
const PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const ASSIGNMENT = /\b(?:api[_-]?key|secret|token|password|master[_-]?key|private[_-]?key)\b\s*[:=]\s*["']?([A-Za-z0-9_./+=:-]{12,})/gi;
const KNOWN_PLACEHOLDER = /^(?:dummy|test|example|changeme|local|dev|routergo-dev)(?:[-_]|$)/i;

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
}

function isScannable(file) {
  return TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()) && !IGNORED_FILES.has(path.basename(file));
}

function suspiciousLines(file, content) {
  return content.split("\n").flatMap((line, index) => {
    if (PRIVATE_KEY.test(line)) return [`${file}:${index + 1}`];
    ASSIGNMENT.lastIndex = 0;
    const matches = [...line.matchAll(ASSIGNMENT)];
    const realValue = matches.some((match) => !KNOWN_PLACEHOLDER.test(match[1]));
    return realValue ? [`${file}:${index + 1}`] : [];
  });
}

const findings = trackedFiles().flatMap((file) => {
  if (!isScannable(file)) return [];
  return suspiciousLines(file, fs.readFileSync(path.join(ROOT, file), "utf8"));
});

if (findings.length > 0) {
  console.error(`check-secrets: possible plaintext secret(s):\n${findings.join("\n")}`);
  process.exit(1);
}

console.log(`check-secrets: OK — scanned ${trackedFiles().length} tracked files`);
