#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(["node_modules", "dist", ".pnpm-store", "coverage", ".git", ".devin", ".agents", "img"]);
const CODE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".sql"]);
const MAX = 200;

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (CODE_EXTS.has(path.extname(e.name))) out.push(p);
  }
}

const files = [];
walk(ROOT, files);
let failed = false;
for (const f of files) {
  const txt = fs.readFileSync(f, "utf8");
  const lines = txt.split("\n").length;
  if (lines > MAX) {
    console.error(`FAIL ${f} -> ${lines} lines > ${MAX}`);
    failed = true;
  }
}
if (failed) {
  console.error("check-file-lines: error — algún archivo supera 200 líneas");
  process.exit(1);
}
console.log(`check-file-lines: OK — ${files.length} archivos verificados (<${MAX})`);
