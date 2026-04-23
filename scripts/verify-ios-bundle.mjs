#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const distRoot = join(root, "dist");
const iosRoot = join(root, "ios/App/App/public");

function fail(message) {
  console.error(`[ios-bundle:error] ${message}`);
  process.exit(1);
}

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === ".DS_Store") {
      continue;
    }

    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

if (!existsSync(join(distRoot, "index.html"))) {
  fail("dist/index.html is missing. Run npm run build:web first.");
}

if (!existsSync(join(iosRoot, "index.html"))) {
  fail("ios/App/App/public/index.html is missing. Run npx cap sync ios first.");
}

const distFiles = walk(distRoot).map((file) => relative(distRoot, file)).sort();
const iosFiles = walk(iosRoot).map((file) => relative(iosRoot, file)).sort();

const missingInIos = distFiles.filter((file) => !iosFiles.includes(file));
if (missingInIos.length > 0) {
  fail(`iOS bundle is missing files from dist: ${missingInIos.join(", ")}`);
}

for (const file of distFiles) {
  const distHash = hashFile(join(distRoot, file));
  const iosHash = hashFile(join(iosRoot, file));
  if (distHash !== iosHash) {
    fail(`iOS bundle file differs from dist: ${file}`);
  }
}

console.log(`[ios-bundle:ok] ${distFiles.length} dist files are synced into Capacitor iOS.`);
