#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const projectPath = "ios/App/App.xcodeproj";

if (existsSync(projectPath)) {
  console.log(`[ios:ok] ${projectPath} already exists.`);
  process.exit(0);
}

console.log("[ios] Capacitor iOS platform missing. Running npx cap add ios...");

const result = spawnSync("npx", ["cap", "add", "ios"], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

process.exit(result.status ?? 1);
