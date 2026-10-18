// 把 prototype/case.js 的案件資料寫成 game/data/case.json，給 Godot 版讀。
// 內容仍然只改 case.js；改完執行 `npm run case`。prototype 的測試會檢查兩邊一致。
// morning() 和 ending() 是函數，只有文字原型用到，不寫進 JSON。
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from '../prototype/case.js';

export const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'game', 'data', 'case.json');

const KEYS = [
  'SEATS', 'AI_IDS', 'LINKS', 'CLAIMS', 'EXHIBITS', 'REASONS', 'CARD_NAMES', 'THOUGHTS', 'JURORS', 'REACTIONS',
  'LEAN_IN', 'ROOMS', 'CALLOUT', 'RULEBOOK', 'PROLOGUE', 'WITNESSES', 'DAYS', 'NIGHT', 'SCHEDULE', 'PLAYTEST',
];

export function caseJson() {
  return `${JSON.stringify(Object.fromEntries(KEYS.map((k) => [k, C[k]])), null, 1)}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(OUT, caseJson());
  console.log(`寫好 ${OUT}`);
}
