import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PAL } from '../src/palette.js';
import { EVIDENCE, EVIDENCE_TEXT } from '../src/evidence.js';
import { EXHIBITS } from '../../prototype/case.js';

test('調色盤剛好有 32 種不同的顏色', () => {
  const colors = Object.values(PAL).map((c) => c.toLowerCase());
  assert.ok(colors.every((c) => /^#[0-9a-f]{6}$/.test(c)), '每個顏色都要寫成 #rrggbb');
  assert.equal(new Set(colors).size, 32);
});

test('證物上畫的每一句字都在字表裡', () => {
  const src = readFileSync(new URL('../src/evidence.js', import.meta.url), 'utf8');
  const drawn = [...src.matchAll(/\b[pP]\.text\('([^']+)'/g)].map((m) => m[1]);
  assert.ok(drawn.length >= 10, '找不到證物上的字');
  for (const str of drawn) assert.ok(EVIDENCE_TEXT.includes(str), `字表漏了：${str}`);
});

test('每件證物的每個細節都標了位置，而且在證物範圍之內', () => {
  for (const [id, doc] of Object.entries(EVIDENCE)) {
    for (const detail of EXHIBITS[id].details) {
      const spot = doc.hotspots[detail.id];
      assert.ok(spot, `${detail.id} 沒有位置`);
      const [x, y, w, h] = spot;
      assert.ok(x >= 0 && y >= 0 && x + w <= doc.w && y + h <= doc.h, `${detail.id} 超出 ${id} 的範圍`);
    }
  }
});
