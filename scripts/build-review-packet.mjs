#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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

    entries[line.slice(0, separator).trim()] = line
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "")
      .replaceAll("\\$", "$");
  }
  return entries;
}

const env = {
  ...process.env,
  ...parseEnvFile(join(process.cwd(), ".env")),
  ...parseEnvFile(join(process.cwd(), ".env.local"))
};

const productId =
  env.VITE_8BITGO_FULL_UNLOCK_PRODUCT_ID || "com.eightbitgo.starter.full_unlock";
const entitlementId = env.VITE_8BITGO_ENTITLEMENT_ID || "8bitgo_starter_full";
const offeringId = env.VITE_8BITGO_OFFERING_ID || "launch";
const outputDir = join(process.cwd(), "tmp/review-packet");

mkdirSync(outputDir, { recursive: true });

const notes = `# App Review Notes

This app is a small 8bit-style game built with Phaser and packaged through Capacitor.

In-app purchase:
- Type: non-consumable full game unlock
- Product ID: ${productId}
- RevenueCat entitlement: ${entitlementId}
- RevenueCat offering: ${offeringId}

How to test:
1. Launch the app.
2. Tap Start Free Sector to confirm the free game loop works.
3. Return to the main menu.
4. Tap Unlock Full Game to open the paywall.
5. Purchase the full unlock using the sandbox account.
6. Confirm Premium Sector becomes available.
7. Use Restore Purchases on a fresh install to verify restore behavior.

No login is required for this MVP.
`;

writeFileSync(join(outputDir, "app-review-notes.md"), notes);
writeFileSync(join(outputDir, "app-review-notes.txt"), notes.replace(/^# /gm, ""));

console.log(`[review:ok] wrote review notes to ${outputDir}`);
