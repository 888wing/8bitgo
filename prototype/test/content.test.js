import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REASONS, THOUGHTS } from '../case.js';
import { OUT, caseJson } from '../../tools/case-json.js';

// 筆記本一行是 134 像素，手寫字 12 像素一個字。
test('每句頁邊批註都寫得進筆記本的一行', () => {
  for (const [id, entry] of [...Object.entries(REASONS), ...THOUGHTS.map((t) => [t.pair.join('×'), t])]) {
    assert.ok(entry.jot, `${id} 沒有 jot`);
    assert.ok([...entry.jot].length <= 11, `${id} 的 jot 太長：${entry.jot}`);
  }
});

// Godot 版讀 game/data/case.json。改了 case.js，要執行 `npm run case`（在 repo 根目錄）。
test('Godot 版的案件資料和 case.js 一致', () => {
  assert.equal(readFileSync(OUT, 'utf8'), caseJson(), 'game/data/case.json 過時了：在 repo 根目錄執行 npm run case');
});

// 法庭的對白框每行 9 個字、最多 4 行：一句不超過 36 字（docs/06-art.md §4）。
test('法庭上的每一句對白都放得進對白框', async () => {
  const C = await import('../case.js');
  const beats = [
    ...Object.values(C.WITNESSES).flatMap((w) => w.script),
    ...C.DAYS.flatMap((d) => [...(d.open ?? []), ...(d.closing ?? []), ...d.adjourn]),
    ...C.SLIPS.flatMap((s) => s.answer),
  ];
  for (const b of beats) assert.ok([...b.text].length <= 36, `太長（${[...b.text].length} 字）：${b.text}`);
});
