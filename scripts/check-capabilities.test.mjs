import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(repo, "scripts/check-capabilities.mjs");

function table(status, key, description, where) {
  return (
    "| Status | Key | Description | Where |\n" +
    "| --- | --- | --- | --- |\n" +
    `| ${status} | ${key} | ${description} | ${where} |\n`
  );
}

function run(args, cwd = repo, scriptPath = script) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    encoding: "utf8",
    timeout: 30_000,
  });
}

test("existing path passes", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-ok-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(path, table("Done", "—", "Home page", "index.html"));
  const result = run([path]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr.includes("Error:"), false);
});

test("missing path names path and entry", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-miss-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(path, table("Done", "#4", "Missing widget", "no-such-widget.txt"));
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no-such-widget\.txt/);
  assert.match(result.stderr, /#4/);
  assert.match(result.stderr, /Missing widget/);
  assert.equal(result.stderr.includes("Error:"), false);
  assert.equal(result.stdout.includes("Error:"), false);
});

test("two missing paths are both named", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-two-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(path, table("Planned", "—", "Two holes", "missing-a.txt, missing-b.txt"));
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing-a\.txt/);
  assert.match(result.stderr, /missing-b\.txt/);
  assert.match(result.stderr, /Two holes/);
});

test("absolute path rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-abs-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(path, table("Planned", "—", "Abs entry", "/etc/passwd"));
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /\/etc\/passwd/);
  assert.match(result.stderr, /Abs entry/);
  assert.match(result.stderr, /absolute/);
});

test("home absolute path rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-home-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(path, table("Done", "#2", "Home path", "~/secrets"));
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /~\/secrets/);
  assert.match(result.stderr, /absolute/);
  assert.match(result.stderr, /#2/);
});

test("dotdot path rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-dot-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(path, table("In progress", "#9", "Escape hatch", "docs/../../etc/passwd"));
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /docs\/\.\.\/\.\.\/etc\/passwd/);
  assert.match(result.stderr, /Escape hatch/);
  assert.match(result.stderr, /\.\./);
});

test("dotdot existing path is still rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-dot-ok-"));
  const path = join(dir, "CAPABILITIES.md");
  const where = "docs/../README.md";
  writeFileSync(path, table("Done", "—", "Parent hop", where));
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /contains \.\./);
  assert.match(result.stderr, /docs\/\.\.\/README\.md/);
  assert.match(result.stderr, /Parent hop/);
});

test("tilde path that exists on disk is still absolute", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-tilde-"));
  const root = join(dir, "repo");
  const scripts = join(root, "scripts");
  mkdirSync(scripts, { recursive: true });
  const copy = join(scripts, "check-capabilities.mjs");
  writeFileSync(copy, readFileSync(script));
  mkdirSync(join(root, "~"));
  writeFileSync(join(root, "~", "kept.txt"), "kept\n");
  const path = join(dir, "CAPABILITIES.md");
  const where = "~/kept.txt";
  writeFileSync(path, table("Done", "—", "Tilde path", where));
  const result = run([path], root, copy);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /\(absolute\)/);
  assert.match(result.stderr, /~\/kept\.txt/);
  assert.match(result.stderr, /Tilde path/);
  rmSync(dir, { recursive: true, force: true });
});

test("drive-letter path rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-drive-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(path, table("Done", "—", "Drive path", "C:/Windows"));
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /C:\/Windows/);
  assert.match(result.stderr, /absolute/);
});

test("empty file is clear", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-empty-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(path, "");
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /empty/i);
  assert.match(result.stderr, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("whitespace file is empty", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-ws-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(path, " \n\t\n");
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /empty/i);
});

test("missing file is clear", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-absent-"));
  const path = join(dir, "absent-capabilities.md");
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing/i);
  assert.match(result.stderr, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("bad status is clear", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-status-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(path, table("Finished", "—", "Bad status", "index.html"));
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Finished/);
  assert.match(result.stderr, /Bad status/);
});

test("bad key is clear", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-key-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(path, table("Done", "none", "Bad key", "index.html"));
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /none/);
  assert.match(result.stderr, /Bad key/);
});

test("key with extra text is a bad Key", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-key-loose-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(path, table("Done", "x#12y", "Loose key", "index.html"));
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /bad Key/);
  assert.match(result.stderr, /x#12y/);
  assert.match(result.stderr, /Loose key/);
});

test("empty Description is clear", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-desc-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(path, table("Done", "#12", "", "index.html"));
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /empty Description/);
  assert.match(result.stderr, /#12/);
});

test("wrong column count is clear", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-cols-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(
    path,
    "| Status | Key | Description | Where |\n| --- | --- | --- | --- |\n| Done | — | only three |\n"
  );
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /malformed/i);
  assert.match(result.stderr, /only three/);
});

test("no table is clear", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-notable-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(path, "# Notes\n\nNo table here.\n");
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /table/i);
});

test("empty Where is clear", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-where-"));
  const path = join(dir, "CAPABILITIES.md");
  writeFileSync(path, table("Planned", "#3", "No location", " "));
  const result = run([path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /empty Where/);
  assert.match(result.stderr, /#3/);
  assert.match(result.stderr, /No location/);
});

test("repo capabilities file passes", () => {
  const result = run([]);
  assert.equal(result.status, 0, result.stderr);
});

test("default path ignores cwd", () => {
  const dir = mkdtempSync(join(tmpdir(), "cap-cwd-"));
  const result = run([], dir);
  assert.equal(result.status, 0, result.stderr);
});
