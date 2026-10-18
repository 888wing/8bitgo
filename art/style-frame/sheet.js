// 證物樣板：每件證物上面是原大（放在桌上的樣子），下面是放大鏡看到的兩倍。
import * as P from '../src/pixels.js';
import { PAL as C } from '../src/palette.js';
import { EVIDENCE, EVIDENCE_TEXT } from '../src/evidence.js';

export const SHEET_W = 640;
export const SHEET_H = 432;

// 樣板上要先載入字型的字。
export const SHEET_TEXT = [...EVIDENCE_TEXT, ...Object.entries(EVIDENCE).map(([id, e]) => `${id} ${e.name}`), '原大', '放大鏡下（兩倍）'].join('');

export function drawSheet(canvas) {
  canvas.width = SHEET_W;
  canvas.height = SHEET_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  P.rect(ctx, 0, 0, SHEET_W, SHEET_H, C.leather);
  for (let y = 0; y < SHEET_H; y += 1) for (let x = 0; x < SHEET_W; x += 1) if (((x * 7 + y * 13) ^ (x * y)) % 9 === 0) P.px(ctx, x, y, C.leatherDark);

  const label = (str, x, y, color = C.wallLight) => ctx.drawImage(P.text(str, { size: 12, weight: 500, lineHeight: 14, color, threshold: 110 }).canvas, x, y);
  const place = (img, x, y) => {
    P.dither(ctx, x + 2, y + 2, img.width, img.height, C.black);
    ctx.drawImage(img, x, y);
  };
  let x = 16;
  for (const [id, e] of Object.entries(EVIDENCE)) {
    label(`${id} ${e.name}`, x, 8, C.white);
    label('原大', x, 28);
    place(e.draw(1), x, 44);
    const y2 = 44 + e.h + 10;
    label('放大鏡下（兩倍）', x, y2);
    place(e.draw(2), x, y2 + 16);
    x += e.w * 2 + 16;
  }
  return canvas;
}
