import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXHIBITS, REASONS, THOUGHTS } from '../case.js';
import { DOCS } from '../desk/art.js';

// 筆記本一行是 134 像素，手寫字 12 像素一個字。
test('每句頁邊批註都寫得進筆記本的一行', () => {
  for (const [id, entry] of [...Object.entries(REASONS), ...THOUGHTS.map((t) => [t.pair.join('×'), t])]) {
    assert.ok(entry.jot, `${id} 沒有 jot`);
    assert.ok([...entry.jot].length <= 11, `${id} 的 jot 太長：${entry.jot}`);
  }
});

test('桌面版的證物，每個細節都標了位置，而且在證物範圍之內', () => {
  for (const [id, doc] of Object.entries(DOCS)) {
    for (const detail of EXHIBITS[id].details) {
      const spot = doc.hotspots[detail.id];
      assert.ok(spot, `${detail.id} 沒有位置`);
      const [x, y, w, h] = spot;
      assert.ok(x >= 0 && y >= 0 && x + w <= doc.w && y + h <= doc.h, `${detail.id} 超出 ${id} 的範圍`);
    }
  }
});
