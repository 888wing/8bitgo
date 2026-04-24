#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const strict = process.argv.includes("--strict");
const envFiles = [".env", ".env.local", ".env.production"];

function parseEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  const entries = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "")
      .replaceAll("\\$", "$");
    entries[key] = value;
  }
  return entries;
}

function loadEnv() {
  return envFiles.reduce(
    (merged, file) => ({
      ...merged,
      ...parseEnvFile(resolve(process.cwd(), file))
    }),
    { ...process.env }
  );
}

function isPlaceholder(value) {
  return !value || /replace_me|your_|xxx|todo/i.test(value);
}

function assertReverseDns(productId) {
  return /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+){2,}$/.test(productId);
}

const env = loadEnv();
const config = {
  appleApiKey: env.VITE_REVENUECAT_APPLE_API_KEY ?? "",
  entitlementId: env.VITE_8BITGO_ENTITLEMENT_ID ?? "pixel_courier_premium",
  offeringId: env.VITE_8BITGO_OFFERING_ID ?? "launch",
  packageId: env.VITE_8BITGO_PACKAGE_ID ?? "$rc_lifetime",
  productId:
    env.VITE_8BITGO_FULL_UNLOCK_PRODUCT_ID ?? "com.eightbitgo.pixelcourier.full_unlock"
};

const warnings = [];
const failures = [];

if (isPlaceholder(config.appleApiKey)) {
  const message = "VITE_REVENUECAT_APPLE_API_KEY is missing or still a placeholder.";
  (strict ? failures : warnings).push(message);
}

if (!config.entitlementId) {
  failures.push("VITE_8BITGO_ENTITLEMENT_ID is empty.");
}

if (!config.offeringId) {
  failures.push("VITE_8BITGO_OFFERING_ID is empty.");
}

if (!config.packageId) {
  failures.push("VITE_8BITGO_PACKAGE_ID is empty.");
}

if (!assertReverseDns(config.productId)) {
  failures.push(
    `VITE_8BITGO_FULL_UNLOCK_PRODUCT_ID should be reverse-DNS shaped. Received: ${config.productId}`
  );
}

if (strict && config.productId === "com.eightbitgo.pixelcourier.full_unlock") {
  warnings.push("Using default Pixel Courier product ID. Confirm it exists in App Store Connect.");
}

for (const warning of warnings) {
  console.warn(`[billing:warn] ${warning}`);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`[billing:error] ${failure}`);
  }
  process.exit(1);
}

console.log(
  `[billing:ok] entitlement=${config.entitlementId} offering=${config.offeringId} package=${config.packageId} product=${config.productId}`
);
