// 美術輸出：npm run bake（要連網載入字型，用本機的 Chrome）。
// 把 art/src 的畫法畫成 game/art/ 的 PNG 和點陣字表，並重畫 art/style-frame 的定稿圖來對照。
// 跟現有檔案逐點相同的圖不會重寫；有不同的會列出來。
// 定稿圖已經確認，預設只對照、不覆蓋；要覆蓋，加 --frame：npm run bake -- --frame
// 注意：網頁字型壓成點陣的結果，不同系統的 Chrome 會有少數點不同（只在字上）。
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const writeFrame = process.argv.includes('--frame');
const { server, url } = await serve(root);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${url}/art/bake/`);
  await page.waitForFunction(() => window.bakeReady, null, { timeout: 30000 });
  const out = await page.evaluate(() => window.bake());
  if (errors.length) throw new Error(errors.join('\n'));

  let written = 0;
  const changed = [];
  const offPalette = [];
  for (const f of out.files) {
    if (f.offPalette) offPalette.push(`${f.path}：${f.offPalette} 點`);
    if (f.png === null) continue;
    if (f.path.startsWith('art/style-frame/') && !writeFrame) {
      changed.push(`${f.path}（${f.diff < 0 ? '尺寸不同' : `${f.diff} 點不同`}，沒有覆蓋）`);
      continue;
    }
    const file = join(root, f.path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(f.png.split(',')[1], 'base64'));
    written += 1;
    if (f.diff !== null) changed.push(`${f.path}（${f.diff < 0 ? '尺寸不同' : `${f.diff} 點不同`}）`);
  }
  for (const [path, data] of Object.entries(out.json)) {
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(data, null, path.includes('/fonts/') ? 0 : 1)}\n`);
  }
  console.log(`圖 ${out.files.length} 張：寫了 ${written} 張，其餘逐點相同。點陣字每款 ${out.chars} 個字。`);
  if (changed.length) console.log(`和之前不同：\n  ${changed.join('\n  ')}`);
  if (offPalette.length) {
    console.log(`用了 32 色以外的顏色或半透明：\n  ${offPalette.join('\n  ')}`);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  server.close();
}
