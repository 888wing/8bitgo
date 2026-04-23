#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function walk(dir, files = []) {
  if (!existsSync(dir)) {
    return files;
  }

  for (const entry of readdirSync(dir)) {
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

if (!existsSync(join(root, "src/assets/manifest.ts"))) {
  failures.push("src/assets/manifest.ts is missing.");
}

const createGame = read("src/8bitgo/core/createGame.ts");
if (!createGame.includes("pixelArt: true")) {
  failures.push("Phaser config must keep pixelArt: true.");
}

if (!createGame.includes("roundPixels: true")) {
  failures.push("Phaser config must keep roundPixels: true.");
}

const pixelScale = read("src/8bitgo/core/pixelScale.ts");
if (!pixelScale.includes("pixelated")) {
  failures.push("Canvas image rendering must stay pixelated.");
}

const rasterAssets = walk(join(root, "src/assets")).filter((file) =>
  /\.(png|jpe?g|webp)$/i.test(file)
);

for (const asset of rasterAssets) {
  const sizeKb = statSync(asset).size / 1024;
  if (sizeKb > 256) {
    warnings.push(`${relative(root, asset)} is ${sizeKb.toFixed(1)}KB. Verify it is intentionally pixel art.`);
  }
}

for (const warning of warnings) {
  console.warn(`[assets:warn] ${warning}`);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`[assets:error] ${failure}`);
  }
  process.exit(1);
}

console.log(`[assets:ok] checked ${rasterAssets.length} raster assets and pixel renderer defaults.`);
