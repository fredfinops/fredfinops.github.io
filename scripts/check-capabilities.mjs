#!/usr/bin/env node
/** Exit 0 when the capability table is valid, else 1. */

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const STATUSES = new Set(["Planned", "In progress", "Done"]);
const HEADER = ["Status", "Key", "Description", "Where"];
const KEY = /^#\d+$/;
const DASHES = /^:?-{3,}:?$/;
const EM = "—";

function repoRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

function cells(line) {
  const stripped = line.trim();
  if (!stripped.startsWith("|")) return null;
  return stripped
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function separator(row) {
  return row.length > 0 && row.every((cell) => DASHES.test(cell));
}

function rows(text, path) {
  const lines = text.split(/\r?\n/);
  let headerAt = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const parsed = cells(lines[index]);
    if (
      parsed &&
      parsed.length === HEADER.length &&
      parsed.every((cell, i) => cell === HEADER[i])
    ) {
      headerAt = index;
      break;
    }
  }
  if (headerAt < 0) return { error: `no capability table in ${path}` };
  const parsedRows = [];
  for (const line of lines.slice(headerAt + 1)) {
    if (!line.trim()) break;
    const parsed = cells(line);
    if (!parsed) break;
    if (separator(parsed)) continue;
    if (parsed.length !== 4) {
      return { error: `malformed row (expected 4 columns) in ${path}: ${line.trim()}` };
    }
    parsedRows.push(parsed);
  }
  return { rows: parsedRows };
}

function wherePaths(where) {
  return where
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function absolute(rel) {
  if (rel.startsWith("/") || rel.startsWith("~")) return true;
  return rel.length >= 2 && rel[1] === ":";
}

function pathErrors(rel, label, root) {
  if (rel.includes("..")) return [`rejected path: ${rel} (contains ..) (${label})`];
  if (absolute(rel)) return [`rejected path: ${rel} (absolute) (${label})`];
  if (!existsSync(join(root, rel))) return [`missing path: ${rel} (${label})`];
  return [];
}

function rowErrors(row, root) {
  const [status, key, description, where] = row;
  const label = `Key ${key}, Description ${description}`;
  const errors = [];
  if (!STATUSES.has(status)) errors.push(`bad Status ${JSON.stringify(status)} (${label})`);
  if (!(KEY.test(key) || key === EM)) errors.push(`bad Key ${JSON.stringify(key)} (${label})`);
  if (!description) errors.push(`empty Description (${label})`);
  const paths = wherePaths(where);
  if (paths.length === 0) {
    errors.push(`empty Where (${label})`);
    return errors;
  }
  for (const rel of paths) errors.push(...pathErrors(rel, label, root));
  return errors;
}

function readText(path) {
  if (!existsSync(path)) return { error: `CAPABILITIES.md is missing: ${path}` };
  let stat;
  try {
    stat = statSync(path);
  } catch (error) {
    const detail = error instanceof Error && "code" in error ? error.code : "read failed";
    return { error: `cannot read ${path}: ${detail}` };
  }
  if (!stat.isFile()) return { error: `CAPABILITIES.md is missing: ${path}` };
  let bytes;
  try {
    bytes = readFileSync(path);
  } catch (error) {
    const detail = error instanceof Error && "code" in error ? error.code : "read failed";
    return { error: `cannot read ${path}: ${detail}` };
  }
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { error: `CAPABILITIES.md is not utf-8: ${path}` };
  }
}

function check(path, root) {
  const loaded = readText(path);
  if (loaded.error) return [loaded.error];
  if (!loaded.text.trim()) return [`CAPABILITIES.md is empty: ${path}`];
  const table = rows(loaded.text, path);
  if (table.error) return [table.error];
  return table.rows.flatMap((row) => rowErrors(row, root));
}

function main(argv = process.argv.slice(2)) {
  if (argv.length > 1) {
    console.error("usage: scripts/check-capabilities.mjs [CAPABILITIES.md]");
    return 1;
  }
  const root = repoRoot();
  const path = argv.length === 1 ? argv[0] : join(root, "docs", "CAPABILITIES.md");
  const errors = check(path, root);
  for (const error of errors) console.error(error);
  return errors.length === 0 ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
