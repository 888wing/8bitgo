#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outputDir = join(process.cwd(), "tmp/screenshots");
mkdirSync(outputDir, { recursive: true });

const content = `# 8bitgo Screenshot Capture Plan

Capture these screens for App Store Connect:

1. Main menu with the free and premium sector buttons.
2. Free sector gameplay showing the pixel canvas and DOM HUD.
3. Paywall with product price loaded from RevenueCat.
4. Restore or already-unlocked state.
5. Premium sector gameplay.

Suggested flow:

\`\`\`sh
npm run ios:open
\`\`\`

Run on an iPhone simulator, then use Xcode or:

\`\`\`sh
xcrun simctl io booted screenshot tmp/screenshots/menu.png
\`\`\`
`;

writeFileSync(join(outputDir, "README.md"), content);
console.log(`[screenshots:ok] wrote ${join(outputDir, "README.md")}`);
