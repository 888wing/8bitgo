#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(root, "sprite-forge.config.json"), "utf8"));
const boolFlags = new Set([
  "install-deps",
  "shared-scale",
  "reject-edge-touch",
  "refresh-manifest"
]);
const passThroughFlags = [
  "threshold",
  "edge-threshold",
  "cell-size",
  "rows",
  "cols",
  "label-prefix",
  "fit-scale",
  "trim-border",
  "edge-clean-depth",
  "align",
  "shared-scale",
  "component-mode",
  "component-padding",
  "min-component-area",
  "edge-touch-margin",
  "reject-edge-touch",
  "single-size",
  "duration"
];

function usage() {
  return `Usage:
  node scripts/sprite-forge.mjs setup [--install-deps]
  node scripts/sprite-forge.mjs options
  node scripts/sprite-forge.mjs prompt --target <target> --mode <mode> --prompt <text> [--name <slug>]
  node scripts/sprite-forge.mjs process --input <png> --target <target> --mode <mode> --name <slug> [processor flags]
  node scripts/sprite-forge.mjs manifest`;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const withoutPrefix = token.slice(2);
    const equalsIndex = withoutPrefix.indexOf("=");
    if (equalsIndex !== -1) {
      const key = withoutPrefix.slice(0, equalsIndex);
      options[key] = withoutPrefix.slice(equalsIndex + 1);
      continue;
    }

    if (boolFlags.has(withoutPrefix)) {
      options[withoutPrefix] = true;
      continue;
    }

    const value = rest[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${withoutPrefix}`);
    }

    options[withoutPrefix] = value;
    index += 1;
  }

  return { command, options };
}

function sanitizeSlug(value) {
  return (
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sprite"
  );
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    stdio: options.stdio ?? "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? 1}`);
  }

  return result;
}

function runCapture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `${command} ${args.join(" ")} failed`);
  }

  return result.stdout.trim();
}

function toolDir() {
  return join(root, config.toolDir);
}

function processorPath() {
  return join(toolDir(), config.processorPath);
}

function venvPython() {
  return process.platform === "win32"
    ? join(root, config.venvDir, "Scripts", "python.exe")
    : join(root, config.venvDir, "bin", "python");
}

function pythonCommand() {
  return existsSync(venvPython()) ? venvPython() : "python3";
}

function ensureToolCheckout() {
  const destination = toolDir();
  if (!existsSync(destination)) {
    mkdirSync(dirname(destination), { recursive: true });
    run("git", ["clone", "--depth", "1", config.repository, destination]);
  }

  const currentRef = runCapture("git", ["-C", destination, "rev-parse", "HEAD"]);
  if (currentRef !== config.ref) {
    run("git", ["-C", destination, "fetch", "--depth", "1", "origin", config.ref]);
    run("git", ["-C", destination, "checkout", "--detach", config.ref]);
  }

  if (!existsSync(processorPath())) {
    throw new Error(`agent-sprite-forge processor not found: ${processorPath()}`);
  }
}

function installDeps() {
  ensureToolCheckout();
  if (!existsSync(venvPython())) {
    mkdirSync(dirname(venvPython()), { recursive: true });
    run("python3", ["-m", "venv", join(root, config.venvDir)]);
  }

  run(venvPython(), ["-m", "pip", "install", "--upgrade", "pip"]);
  run(venvPython(), ["-m", "pip", "install", "-r", join(toolDir(), "requirements.txt")]);
}

function assertReadyForPython() {
  ensureToolCheckout();
  if (!existsSync(venvPython())) {
    throw new Error("Sprite forge Python venv is missing. Run `npm run sprite:setup` first.");
  }
}

function requireOption(options, key) {
  const value = options[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required --${key}`);
  }

  return value;
}

function commandOptions() {
  assertReadyForPython();
  run(pythonCommand(), [processorPath(), "list-options"]);
}

function commandPrompt(options) {
  assertReadyForPython();
  const target = requireOption(options, "target");
  const mode = requireOption(options, "mode");
  const prompt = requireOption(options, "prompt");
  const name = sanitizeSlug(options.name ?? `${target}-${mode}`);
  const outputDir = resolve(root, options["output-dir"] ?? join("tmp/sprite-forge", name));
  const promptPath = join(outputDir, "prompt-used.txt");
  const promptJsonPath = join(outputDir, "prompt-meta.json");

  mkdirSync(outputDir, { recursive: true });

  const args = [
    processorPath(),
    "build-prompt",
    "--target",
    target,
    "--mode",
    mode,
    "--prompt",
    prompt,
    "--write",
    promptPath,
    "--write-json",
    promptJsonPath
  ];

  if (options.role) {
    args.push("--role", options.role);
  }

  if (options.seed) {
    args.push("--seed", options.seed);
  }

  run(pythonCommand(), args);
  console.log(`[sprite-forge:prompt] ${relative(root, promptPath)}`);
}

function commandProcess(options) {
  assertReadyForPython();
  const input = resolve(root, requireOption(options, "input"));
  const target = requireOption(options, "target");
  const mode = requireOption(options, "mode");
  const name = sanitizeSlug(requireOption(options, "name"));
  const outputDir = resolve(root, options["output-dir"] ?? join(config.outputRoot, name));
  const promptFile = options["prompt-file"]
    ? resolve(root, options["prompt-file"])
    : defaultPromptFile(name);

  if (!existsSync(input)) {
    throw new Error(`Input image not found: ${input}`);
  }

  mkdirSync(outputDir, { recursive: true });

  const args = [
    processorPath(),
    "process",
    "--input",
    input,
    "--target",
    target,
    "--mode",
    mode,
    "--output-dir",
    outputDir
  ];

  if (options.prompt) {
    args.push("--prompt", options.prompt);
  }

  if (existsSync(promptFile)) {
    args.push("--prompt-file", promptFile);
  }

  if (options.role) {
    args.push("--role", options.role);
  }

  for (const key of passThroughFlags) {
    if (options[key] === undefined) {
      continue;
    }

    args.push(`--${key}`);
    if (options[key] !== true) {
      args.push(String(options[key]));
    }
  }

  run(pythonCommand(), args);
  writeSpriteEntry(outputDir, name);

  if (options["refresh-manifest"] !== false) {
    refreshManifest();
  }

  console.log(`[sprite-forge:process] ${relative(root, outputDir)}`);
}

function defaultPromptFile(name) {
  return join(root, "tmp/sprite-forge", name, "prompt-used.txt");
}

function publicUrlFor(filePath) {
  const outputRoot = resolve(root, config.outputRoot);
  const relativePath = relative(join(root, "public"), filePath).replaceAll("\\", "/");

  if (relativePath.startsWith("..")) {
    throw new Error(`Generated asset must live under public/: ${filePath}`);
  }

  if (!filePath.startsWith(outputRoot)) {
    throw new Error(`Generated asset must live under ${config.outputRoot}: ${filePath}`);
  }

  return `/${relativePath}`;
}

function animationFrameRate(duration) {
  const safeDuration = Number(duration) > 0 ? Number(duration) : 200;
  return Math.max(1, Math.round(1000 / safeDuration));
}

function buildAnimations(name, metadata) {
  const key = `forge.${name}`;
  const count = Number(metadata.rows ?? 1) * Number(metadata.cols ?? 1);
  const frameRate = animationFrameRate(metadata.duration);

  if (metadata.mode === "player_sheet" && Number(metadata.rows) === 4 && Number(metadata.cols) === 4) {
    return ["down", "left", "right", "up"].map((direction, row) => ({
      key: `${key}.${direction}`,
      spritesheetKey: key,
      frames: [0, 1, 2, 3].map((frame) => row * 4 + frame),
      frameRate,
      repeat: -1
    }));
  }

  return [
    {
      key: `${key}.${metadata.mode ?? "animation"}`,
      spritesheetKey: key,
      frames: Array.from({ length: count }, (_, index) => index),
      frameRate,
      repeat: -1
    }
  ];
}

function writeSpriteEntry(outputDir, name) {
  const metadataPath = join(outputDir, "pipeline-meta.json");
  if (!existsSync(metadataPath)) {
    throw new Error(`pipeline-meta.json not found in ${outputDir}`);
  }

  const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  const sheetPath = join(outputDir, "sheet-transparent.png");
  const cleanPath = join(outputDir, "clean.png");
  const key = `forge.${name}`;
  const entry = {
    source: "agent-sprite-forge",
    sourceRepository: config.repository,
    sourceRef: config.ref,
    key,
    name,
    target: metadata.target,
    mode: metadata.mode,
    frameWidth: metadata.cell_size ?? metadata.single_size,
    frameHeight: metadata.cell_size ?? metadata.single_size,
    sheetUrl: existsSync(sheetPath) ? publicUrlFor(sheetPath) : null,
    imageUrl: existsSync(cleanPath) ? publicUrlFor(cleanPath) : null,
    animations: existsSync(sheetPath) ? buildAnimations(name, metadata) : []
  };

  writeFileSync(join(outputDir, "8bitgo-sprite.json"), `${JSON.stringify(entry, null, 2)}\n`);
}

function scanSpriteEntries() {
  const outputRoot = join(root, config.outputRoot);
  if (!existsSync(outputRoot)) {
    return [];
  }

  return readdirSync(outputRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(outputRoot, entry.name, "8bitgo-sprite.json"))
    .filter((path) => existsSync(path))
    .map((path) => JSON.parse(readFileSync(path, "utf8")))
    .sort((a, b) => String(a.key).localeCompare(String(b.key)));
}

function refreshManifest() {
  const entries = scanSpriteEntries();
  const assets = [];
  const animations = [];

  for (const entry of entries) {
    if (entry.sheetUrl) {
      assets.push({
        kind: "spritesheet",
        key: entry.key,
        path: entry.sheetUrl,
        frameWidth: entry.frameWidth,
        frameHeight: entry.frameHeight
      });
      animations.push(...entry.animations);
      continue;
    }

    if (entry.imageUrl) {
      assets.push({
        kind: "image",
        key: entry.key,
        path: entry.imageUrl
      });
    }
  }

  const manifestPath = join(root, config.manifestPath);
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(
    manifestPath,
    `import type { AssetManifest } from "../8bitgo/core/assetManifest";\n\n` +
      `export const spriteForgeManifest: AssetManifest = ${JSON.stringify({ assets, animations }, null, 2)};\n`
  );
  console.log(`[sprite-forge:manifest] wrote ${relative(root, manifestPath)} (${assets.length} assets)`);
}

function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (!command || command === "help" || command === "--help") {
    console.log(usage());
    return;
  }

  if (command === "setup") {
    ensureToolCheckout();
    if (options["install-deps"] !== false) {
      installDeps();
    }
    console.log(`[sprite-forge:setup] ${config.repository}#${config.ref}`);
    return;
  }

  if (command === "options") {
    commandOptions();
    return;
  }

  if (command === "prompt") {
    commandPrompt(options);
    return;
  }

  if (command === "process") {
    commandProcess(options);
    return;
  }

  if (command === "manifest") {
    refreshManifest();
    return;
  }

  throw new Error(`Unknown command: ${command}\n${usage()}`);
}

try {
  main();
} catch (error) {
  console.error(`[sprite-forge:error] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
