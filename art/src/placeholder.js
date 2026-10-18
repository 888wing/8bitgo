// 佔位美術：全部用程式逐點畫，只用 32 色。目的是試手感，不是定稿。
// 量產時照 art/style-frame/frame.js 逐張換掉；名字和尺寸見下面的 TEXTURES。
import * as P from './pixels.js';
import * as L from './layout.js';
import { PAL } from './palette.js';
import { EXHIBITS } from '../../prototype/case.js';

const T = (str, opts) => P.text(str, opts).canvas;

// —— 法庭 ——

function court() {
  const { c, ctx } = P.canvas(L.COURT.w, L.COURT.h);
  P.rect(ctx, 0, 0, 480, 96, PAL.wall);
  P.dither(ctx, 0, 0, 480, 4, PAL.wallDark);
  for (const x of [96, 304]) {
    P.rect(ctx, x, 2, 80, 2, PAL.white);
    P.dither(ctx, x - 6, 4, 92, 2, PAL.wallLight);
  }
  // 牆上的鐘：上午十時
  P.ellipse(ctx, 40, 22, 9, 9, PAL.ink);
  P.ellipse(ctx, 40, 22, 8, 8, PAL.white);
  P.line(ctx, 40, 22, 40, 16, PAL.ink);
  P.line(ctx, 40, 22, 35, 20, PAL.ink);
  // 法官席上方的徽章
  P.ellipse(ctx, 240, 9, 6, 6, PAL.brassDark);
  P.ellipse(ctx, 240, 9, 5, 5, PAL.brass);
  P.rect(ctx, 239, 5, 2, 8, PAL.brassLight);
  // 柚木牆板
  P.rect(ctx, 0, 44, 480, 52, PAL.wood);
  P.rect(ctx, 0, 44, 480, 2, PAL.woodLight);
  for (let x = 12; x < 480; x += 24) P.rect(ctx, x, 48, 1, 48, PAL.woodDark);
  // 法官
  P.rect(ctx, 230, 26, 20, 10, PAL.judgeRed);
  P.rect(ctx, 239, 27, 2, 5, PAL.white);
  P.ellipse(ctx, 240, 19, 6, 7, PAL.white);
  P.dither(ctx, 234, 13, 13, 12, PAL.paperShade);
  P.ellipse(ctx, 240, 21, 3, 4, PAL.skin);
  P.px(ctx, 239, 20, PAL.ink);
  P.px(ctx, 241, 20, PAL.ink);
  // 法官席
  P.rect(ctx, 184, 34, 112, 3, PAL.woodLight);
  P.rect(ctx, 186, 37, 108, 27, PAL.woodDark);
  for (let x = 196; x < 294; x += 20) P.frame(ctx, x, 41, 16, 19, PAL.wood);
  // 證人台
  P.rect(ctx, 64, 46, 52, 2, PAL.woodLight);
  P.rect(ctx, 66, 48, 48, 30, PAL.woodDark);
  P.frame(ctx, 70, 52, 40, 22, PAL.wood);
  // 庭警
  P.rect(ctx, 126, 44, 10, 3, PAL.suit);
  P.ellipse(ctx, 131, 50, 3, 3, PAL.skin);
  P.rect(ctx, 126, 54, 11, 22, PAL.suit);
  P.px(ctx, 131, 58, PAL.brass);
  P.px(ctx, 131, 63, PAL.brass);
  P.rect(ctx, 127, 76, 4, 10, PAL.robe);
  P.rect(ctx, 132, 76, 4, 10, PAL.robe);
  // 控辯雙方（背影）
  for (const x of [184, 296]) {
    P.rect(ctx, x - 7, 60, 15, 14, PAL.robe);
    P.ellipse(ctx, x, 57, 4, 4, PAL.white);
    P.dither(ctx, x - 4, 54, 9, 7, PAL.paperShade);
  }
  P.rect(ctx, 146, 72, 78, 2, PAL.woodLight);
  P.rect(ctx, 148, 74, 74, 16, PAL.woodDark);
  P.rect(ctx, 256, 72, 78, 2, PAL.woodLight);
  P.rect(ctx, 258, 74, 74, 16, PAL.woodDark);
  // 犯人欄和被告
  P.ellipse(ctx, 396, 50, 4, 5, PAL.skin);
  P.rect(ctx, 392, 44, 9, 3, PAL.hair);
  P.rect(ctx, 389, 56, 15, 10, PAL.paperShade);
  P.rect(ctx, 358, 64, 76, 2, PAL.woodLight);
  P.rect(ctx, 360, 66, 72, 20, PAL.woodDark);
  for (let x = 362; x < 432; x += 6) P.dither(ctx, x, 40, 1, 24, PAL.wallLight);
  P.rect(ctx, 358, 38, 76, 2, PAL.woodLight);
  return c;
}

// 證人台上的小人：衣服顏色、頭髮顏色，加一樣記認（領帶、徽章）。
const WITNESS_LOOK = {
  cheng: { cloth: PAL.suit, hair: PAL.hair, tie: true },
  chung: { cloth: PAL.khaki, hair: PAL.grey, badge: true },
  wat: { cloth: PAL.suit, hair: PAL.hair, tie: true },
  chan: { cloth: PAL.khaki, hair: PAL.grey },
  man: { cloth: PAL.paper, hair: PAL.hair },
  au: { cloth: PAL.suit, hair: PAL.hair, badge: true },
  lee: { cloth: PAL.wallDark, hair: PAL.hair },
  ho: { cloth: PAL.paperShade, hair: PAL.hair },
};

function witness(kind) {
  const { c, ctx } = P.canvas(24, 22);
  const look = WITNESS_LOOK[kind];
  P.rect(ctx, 4, 12, 16, 10, look.cloth);
  if (look.tie) {
    P.rect(ctx, 11, 12, 3, 6, PAL.white);
    P.rect(ctx, 12, 13, 1, 6, PAL.red);
  } else if (look.badge) {
    P.px(ctx, 8, 15, PAL.brass);
  }
  P.ellipse(ctx, 12, 7, 4, 5, PAL.skin);
  P.rect(ctx, 8, 2, 9, 3, look.hair);
  P.px(ctx, 10, 7, PAL.ink);
  P.px(ctx, 14, 7, PAL.ink);
  return c;
}

// —— 證人特寫 ——

const PEOPLE = {
  judge: { hair: 'wig', clothes: 'judge', skin: PAL.skin, old: true },
  prosecutor: { hair: 'wig', clothes: 'robe', skin: PAL.skin },
  defense: { hair: 'wig', clothes: 'robe', skin: PAL.skin, young: true },
  cheng: { hair: 'short', clothes: 'suit', skin: PAL.skin, stern: true, moustache: true },
  usher: { hair: 'cap', clothes: 'uniform', skin: PAL.skin },
  chung: { hair: 'thin', clothes: 'khaki', skin: PAL.skin, droopy: true, sweat: true, old: true },
  // greybox：第二至五天的證人
  wat: { hair: 'short', clothes: 'suit', skin: PAL.skin },
  chan: { hair: 'thin', clothes: 'khaki', skin: PAL.skin, old: true },
  man: { hair: 'long', clothes: 'plain', cloth: PAL.paper, skin: PAL.skinLight },
  au: { hair: 'cap', clothes: 'uniform', skin: PAL.skin, stern: true },
  lee: { hair: 'short', clothes: 'plain', cloth: PAL.wallDark, skin: PAL.skin, young: true },
  ho: { hair: 'short', clothes: 'plain', cloth: PAL.paperShade, skin: PAL.skin, young: true, droopy: true },
};

function portrait(spec, frame) {
  const { c, ctx } = P.canvas(56, 60);
  // 身體
  const clothes = { suit: PAL.suit, robe: PAL.robe, judge: PAL.judgeRed, uniform: PAL.suit, khaki: PAL.khaki, plain: spec.cloth }[spec.clothes];
  P.rect(ctx, 6, 46, 44, 14, clothes);
  P.rect(ctx, 4, 50, 48, 10, clothes);
  if (spec.clothes === 'suit') {
    P.rect(ctx, 24, 46, 8, 10, PAL.white);
    P.rect(ctx, 27, 47, 2, 13, PAL.red);
  }
  if (spec.clothes === 'robe' || spec.clothes === 'judge') {
    P.rect(ctx, 25, 46, 2, 8, PAL.white);
    P.rect(ctx, 29, 46, 2, 8, PAL.white);
    if (spec.clothes === 'judge') P.rect(ctx, 6, 46, 6, 14, PAL.robe);
  }
  if (spec.clothes === 'uniform') [50, 55].forEach((y) => P.rect(ctx, 27, y, 2, 2, PAL.brass));
  if (spec.clothes === 'khaki') {
    P.rect(ctx, 36, 50, 5, 4, PAL.brass);
    P.rect(ctx, 22, 46, 12, 3, PAL.paperShade);
  }
  // 頸和頭
  P.rect(ctx, 23, 38, 10, 9, spec.skin);
  P.rect(ctx, 30, 38, 3, 9, PAL.skinShade);
  P.ellipse(ctx, 28, 26, 11, 13, spec.skin);
  for (let y = 16; y < 37; y += 1) P.px(ctx, 37 + (y > 30 ? -1 : 0), y, PAL.skinShade);
  P.ellipse(ctx, 17, 27, 2, 3, spec.skin);
  P.ellipse(ctx, 39, 27, 2, 3, PAL.skinShade);
  // 頭髮、假髮、帽
  if (spec.hair === 'wig') {
    P.ellipse(ctx, 28, 18, 14, 9, PAL.white);
    P.rect(ctx, 14, 18, 4, 18, PAL.white);
    P.rect(ctx, 38, 18, 4, 18, PAL.white);
    for (let y = 12; y < 36; y += 3) {
      P.dither(ctx, 14, y, 4, 1, PAL.paperShade, y);
      P.dither(ctx, 38, y, 4, 1, PAL.paperShade, y + 1);
    }
    P.dither(ctx, 18, 11, 20, 4, PAL.paperShade);
  } else if (spec.hair === 'short') {
    P.ellipse(ctx, 28, 15, 12, 6, PAL.hair);
    P.rect(ctx, 16, 15, 3, 8, PAL.hair);
    P.rect(ctx, 37, 15, 3, 8, PAL.hair);
    P.rect(ctx, 22, 13, 2, 3, PAL.skin);
  } else if (spec.hair === 'thin') {
    P.dither(ctx, 18, 12, 20, 5, PAL.grey);
    P.rect(ctx, 16, 17, 3, 9, PAL.grey);
    P.rect(ctx, 37, 17, 3, 9, PAL.grey);
  } else if (spec.hair === 'long') {
    P.ellipse(ctx, 28, 16, 13, 7, PAL.hair);
    P.rect(ctx, 15, 16, 4, 22, PAL.hair);
    P.rect(ctx, 37, 16, 4, 22, PAL.hair);
  } else if (spec.hair === 'cap') {
    P.rect(ctx, 15, 10, 26, 7, PAL.suit);
    P.rect(ctx, 13, 16, 30, 2, PAL.ink);
    P.rect(ctx, 26, 11, 4, 3, PAL.brass);
  }
  // 眉、眼
  const brow = spec.stern ? 2 : 1;
  P.rect(ctx, 20, 21, 5, brow, PAL.hair);
  P.rect(ctx, 31, 21, 5, brow, PAL.hair);
  if (frame === 2) {
    P.rect(ctx, 21, 25, 4, 1, PAL.ink);
    P.rect(ctx, 31, 25, 4, 1, PAL.ink);
  } else {
    P.rect(ctx, 22, spec.droopy ? 25 : 24, 2, spec.droopy ? 1 : 2, PAL.ink);
    P.rect(ctx, 32, spec.droopy ? 25 : 24, 2, spec.droopy ? 1 : 2, PAL.ink);
    if (spec.droopy) {
      P.rect(ctx, 21, 24, 4, 1, PAL.skinShade);
      P.rect(ctx, 31, 24, 4, 1, PAL.skinShade);
    }
  }
  if (spec.old) {
    P.px(ctx, 19, 27, PAL.skinShade);
    P.px(ctx, 36, 27, PAL.skinShade);
    P.rect(ctx, 22, 33, 1, 2, PAL.skinShade);
    P.rect(ctx, 34, 33, 1, 2, PAL.skinShade);
  }
  // 鼻、嘴
  P.rect(ctx, 28, 26, 1, 4, PAL.skinShade);
  P.px(ctx, 27, 30, PAL.skinShade);
  if (spec.moustache) P.rect(ctx, 24, 31, 9, 1, PAL.hair);
  if (frame === 1) {
    P.rect(ctx, 26, 33, 5, 3, PAL.hair);
    P.rect(ctx, 27, 33, 3, 1, PAL.white);
  } else {
    P.rect(ctx, 25, 34, 7, 1, PAL.skinShade);
  }
  if (spec.sweat) P.rect(ctx, 39, 20, 1, 3, PAL.paperLine);
  return c;
}

function emptyPortrait() {
  const { c, ctx } = P.canvas(56, 60);
  P.ellipse(ctx, 28, 28, 10, 10, PAL.brassDark);
  P.ellipse(ctx, 28, 28, 9, 9, PAL.panel);
  P.rect(ctx, 27, 20, 2, 16, PAL.brassDark);
  P.rect(ctx, 21, 24, 14, 2, PAL.brassDark);
  return c;
}

// —— 左下：特寫框、名牌、對白框 ——

function booth() {
  const { c, ctx } = P.canvas(L.BOOTH.w, L.BOOTH.h);
  P.rect(ctx, 0, 0, 150, 174, PAL.wallDark);
  P.dither(ctx, 0, 0, 150, 174, PAL.panel);
  const fx = L.PORTRAIT.x - L.BOOTH.x;
  const fy = L.PORTRAIT.y - L.BOOTH.y;
  P.rect(ctx, fx, fy, L.PORTRAIT.w, L.PORTRAIT.h, PAL.woodDark);
  P.frame(ctx, fx, fy, L.PORTRAIT.w, L.PORTRAIT.h, PAL.woodLight);
  P.rect(ctx, fx + 4, fy + 3, 56, 60, PAL.photo);
  const nx = L.NAME.x - L.BOOTH.x;
  const ny = L.NAME.y - L.BOOTH.y;
  P.rect(ctx, nx, ny, L.NAME.w, L.NAME.h, PAL.brass);
  P.frame(ctx, nx, ny, L.NAME.w, L.NAME.h, PAL.brassDark);
  P.rect(ctx, nx + 1, ny + 1, L.NAME.w - 2, 1, PAL.brassLight);
  const dx = L.DIALOGUE.x - L.BOOTH.x;
  const dy = L.DIALOGUE.y - L.BOOTH.y;
  P.rect(ctx, dx, dy, L.DIALOGUE.w, L.DIALOGUE.h, PAL.panel);
  P.frame(ctx, dx, dy, L.DIALOGUE.w, L.DIALOGUE.h, PAL.wall);
  P.frame(ctx, dx + 1, dy + 1, L.DIALOGUE.w - 2, L.DIALOGUE.h - 2, PAL.black);
  return c;
}

// —— 右下：陪審桌 ——

function desk() {
  const { c, ctx } = P.canvas(L.DESK.w, L.DESK.h);
  P.rect(ctx, 0, 0, 330, 174, PAL.wood);
  for (let y = 3; y < 154; y += 7) {
    for (let x = (y * 13) % 40; x < 330; x += 47) P.rect(ctx, x, y, 18 + ((x + y) % 11), 1, PAL.woodDark);
  }
  // 綠色皮革面：證物放這裡
  P.rect(ctx, 180, 36, 146, 116, PAL.leather);
  P.dither(ctx, 180, 36, 146, 116, PAL.leatherDark);
  P.frame(ctx, 182, 38, 142, 112, PAL.brassDark);
  // 桌邊和工具槽
  P.rect(ctx, 0, 154, 330, 20, PAL.woodDark);
  P.rect(ctx, 0, 154, 330, 1, PAL.woodLight);
  P.rect(ctx, 0, 0, 1, 174, PAL.black);
  return c;
}

function notebookBase() {
  const { c, ctx } = P.canvas(L.NOTEBOOK.w, L.NOTEBOOK.h);
  P.dither(ctx, 3, 3, 169, 145, PAL.black);
  P.rect(ctx, 0, 0, 168, 144, PAL.paper);
  P.rect(ctx, 166, 0, 2, 144, PAL.paperShade);
  P.rect(ctx, 0, 142, 168, 2, PAL.paperShade);
  for (let x = 8; x < 164; x += 10) {
    P.rect(ctx, x, 1, 3, 5, PAL.ink);
    P.px(ctx, x + 1, 2, PAL.paperShade);
  }
  // 頁邊線：線左邊蓋印，線右邊寫字。紅色留給矛盾和「不予採納」，所以這條線用灰藍。
  P.rect(ctx, L.PAGE.x - L.NOTEBOOK.x + 24, 8, 1, 132, PAL.paperLine);
  return c;
}

function tray() {
  const { c, ctx } = P.canvas(L.TRAY.w, L.TRAY.h);
  P.rect(ctx, 0, 0, L.TRAY.w, L.TRAY.h, PAL.woodLight);
  P.rect(ctx, 2, 2, L.TRAY.w - 4, L.TRAY.h - 4, PAL.leatherDark);
  P.rect(ctx, 2, 2, L.TRAY.w - 4, 2, PAL.black);
  ctx.drawImage(T('證物', { size: 12, weight: 500, color: PAL.brassLight, threshold: 110 }), 5, 7);
  return c;
}

function plaque(label, active = false) {
  const { c, ctx } = P.canvas(44, 15);
  P.rect(ctx, 0, 0, 44, 15, active ? PAL.red : PAL.brass);
  P.frame(ctx, 0, 0, 44, 15, active ? PAL.black : PAL.brassDark);
  P.rect(ctx, 1, 1, 42, 1, active ? PAL.judgeRed : PAL.brassLight);
  const t = P.text(label, { size: 12, weight: 700, color: active ? PAL.white : PAL.ink, threshold: 120 });
  ctx.drawImage(t.canvas, Math.floor((44 - t.width) / 2) + 1, 0);
  return c;
}

function arrow(dir) {
  const { c, ctx } = P.canvas(18, 15);
  P.rect(ctx, 0, 0, 18, 15, PAL.brass);
  P.frame(ctx, 0, 0, 18, 15, PAL.brassDark);
  for (let i = 0; i < 4; i += 1) {
    const x = dir < 0 ? 7 + i : 10 - i;
    P.rect(ctx, x, 7 - i, 1, i * 2 + 1, PAL.ink);
  }
  return c;
}

function rack() {
  const { c, ctx } = P.canvas(L.RACK.w, L.RACK.h);
  P.rect(ctx, 0, 0, 52, 104, PAL.woodDark);
  P.frame(ctx, 0, 0, 52, 104, PAL.woodLight);
  for (const y of [6, 46]) {
    P.rect(ctx, 6, y + 34, 40, 3, PAL.woodLight);
    P.rect(ctx, 8, y, 36, 34, PAL.black);
  }
  ctx.drawImage(plaque('退庭'), 4, 85);
  return c;
}

const INK = { trust: PAL.trust, doubt: PAL.doubt, struck: PAL.red };
const FACE = { trust: '信', doubt: '疑', struck: '刪' };

function stamp(kind) {
  const { c, ctx } = P.canvas(26, 34);
  const ink = INK[kind];
  P.ellipse(ctx, 13, 8, 9, 7, PAL.woodDark);
  P.ellipse(ctx, 13, 7, 8, 6, PAL.woodLight);
  const t = P.text(FACE[kind], { size: 12, weight: 700, color: PAL.white, threshold: 120 });
  ctx.drawImage(t.canvas, 13 - Math.floor(t.width / 2), 1);
  P.rect(ctx, 10, 14, 6, 7, PAL.woodDark);
  P.rect(ctx, 2, 21, 22, 8, PAL.wood);
  P.rect(ctx, 2, 21, 22, 1, PAL.woodLight);
  P.rect(ctx, 3, 29, 20, 4, ink);
  return c;
}

// 蓋出來的印：邊框和字。遊戲每蓋一下，再隨機去掉一些點，所以每個印都不一樣。
export function imprint(kind, dropout = 0) {
  const { c, ctx } = P.canvas(22, 22);
  const ink = INK[kind];
  P.frame(ctx, 0, 0, 22, 22, ink);
  P.frame(ctx, 1, 1, 20, 20, ink);
  if (kind === 'struck') {
    // 「不予採納」：四個字排成兩行
    ctx.drawImage(P.text('不予\n採納', { size: 9, weight: 700, color: ink, lineHeight: 9, threshold: 100 }).canvas, 2, 2);
  } else {
    const t = P.text(FACE[kind], { size: 13, weight: 700, color: ink, threshold: 110 });
    ctx.drawImage(t.canvas, 11 - Math.floor(t.width / 2), 3);
  }
  if (dropout) {
    const img = ctx.getImageData(0, 0, 22, 22);
    for (let i = 3; i < img.data.length; i += 4) if (img.data[i] && Math.random() < dropout) img.data[i] = 0;
    ctx.putImageData(img, 0, 0);
  }
  return c;
}

function loupe() {
  const { c, ctx } = P.canvas(64, 64);
  P.line(ctx, 36, 36, 58, 58, PAL.woodDark);
  for (let i = 0; i < 4; i += 1) P.line(ctx, 37 + i, 36, 59, 58 - i, i < 2 ? PAL.wood : PAL.woodDark);
  P.rect(ctx, 35, 35, 4, 4, PAL.brassDark);
  P.ring(ctx, 22, 22, L.LOUPE_R + 1, PAL.brassDark, 3);
  P.ring(ctx, 22, 22, L.LOUPE_R, PAL.brass, 2);
  for (let i = 0; i < 6; i += 1) P.px(ctx, 10 + i, 12 - Math.floor(i / 2), PAL.brassLight);
  P.px(ctx, 14, 16, PAL.white);
  P.px(ctx, 15, 15, PAL.white);
  P.px(ctx, 13, 17, PAL.white);
  return c;
}

function tri(w, h, color, down = true) {
  const { c, ctx } = P.canvas(w, h);
  for (let i = 0; i < h; i += 1) {
    const half = down ? (w - 1) / 2 - i : i;
    P.rect(ctx, Math.round((w - 1) / 2 - half), i, Math.round(half * 2) + 1, 1, color);
  }
  return c;
}

function speaker(on) {
  const { c, ctx } = P.canvas(14, 12);
  P.rect(ctx, 1, 4, 3, 4, PAL.white);
  for (let i = 0; i < 4; i += 1) P.rect(ctx, 4 + i, 3 - i, 1, 6 + i * 2, PAL.white);
  if (on) {
    P.rect(ctx, 10, 4, 1, 4, PAL.white);
    P.rect(ctx, 12, 2, 1, 8, PAL.white);
  } else {
    P.line(ctx, 9, 3, 13, 8, PAL.red);
    P.line(ctx, 13, 3, 9, 8, PAL.red);
  }
  return c;
}

// 發現細節時，放大鏡旁邊冒出的感嘆號。
function bang() {
  const { c, ctx } = P.canvas(11, 13);
  P.rect(ctx, 1, 0, 9, 10, PAL.brassLight);
  P.rect(ctx, 0, 1, 11, 8, PAL.brassLight);
  P.rect(ctx, 5, 2, 2, 4, PAL.ink);
  P.rect(ctx, 5, 7, 2, 1, PAL.ink);
  P.rect(ctx, 2, 10, 2, 2, PAL.brassLight);
  P.px(ctx, 1, 12, PAL.brassLight);
  return c;
}

// —— greybox 證物：第二至五天 ——
// 一張紙或一個袋，上面一格一格寫著細節。原大時字只有 8 點，看不清；放大鏡下的兩倍圖用 16 點重新排。
// 要用放大鏡才發現的細節（zoom），原大時只是一片灰。格子的位置就是細節的位置（hotspots）。
const GREYBOX = {
  D1: { w: 88, h: 100, kind: 'paper', head: PAL.ink },
  P3: { w: 64, h: 72, kind: 'paper', head: PAL.brassDark },
  P5: { w: 92, h: 116, kind: 'paper', head: PAL.ink },
  P6: { w: 104, h: 72, kind: 'photo', head: PAL.photo },
  V1: { w: 92, h: 100, kind: 'paper', head: PAL.trust },
  P7: { w: 84, h: 72, kind: 'bag', head: PAL.suit },
};

function greyboxDoc(id, s) {
  const spec = GREYBOX[id];
  const ex = EXHIBITS[id];
  const { c, ctx } = P.canvas(spec.w * s, spec.h * s);
  const R = (x, y, w, h, color) => P.rect(ctx, x * s, y * s, w * s, h * s, color);
  const face = spec.kind === 'photo' ? PAL.photo : spec.kind === 'bag' ? PAL.wallLight : PAL.paper;
  const ink = spec.kind === 'photo' ? PAL.white : PAL.ink;
  R(0, 0, spec.w, spec.h, spec.kind === 'photo' ? PAL.white : face);
  if (spec.kind === 'photo') R(3, 3, spec.w - 6, spec.h - 14, PAL.photo);
  P.frame(ctx, 0, 0, spec.w * s, spec.h * s, PAL.paperShade);
  R(0, 0, spec.w, 11, spec.head);
  const head = P.text(`${ex.code} ${ex.name}`, { size: 8 * s, weight: 700, color: PAL.white, threshold: s > 1 ? 110 : 90 });
  ctx.drawImage(head.canvas, 3 * s, s);
  const hotspots = {};
  let y = 14;
  for (const d of ex.details) {
    const width = spec.w - 8;
    const t1 = P.text(d.text, { size: 8, width: width - 4, lineHeight: 9, threshold: 90 });
    const h = t1.lines.length * 9 + 4;
    hotspots[d.id] = [4, y, width, h];
    P.dither(ctx, 4 * s, y * s, width * s, s, spec.kind === 'photo' ? PAL.grey : PAL.paperLine);
    if (d.zoom && s === 1) {
      P.dither(ctx, 6, y + 3, width - 6, h - 5, PAL.grey);
    } else {
      const color = spec.kind === 'photo' ? PAL.white : d.zoom ? PAL.trust : ink;
      const t = P.text(d.text, { size: 8 * s, width: (width - 4) * s + (s > 1 ? 2 : 0), lineHeight: 9 * s, color, threshold: s > 1 ? 110 : 90 });
      ctx.drawImage(t.canvas, 6 * s, (y + 2) * s);
    }
    y += h + 3;
  }
  return { canvas: c, hotspots };
}

function greyboxIcon(id) {
  const spec = GREYBOX[id];
  const { c, ctx } = P.canvas(24, 18);
  if (spec.kind === 'photo') {
    P.rect(ctx, 0, 0, 24, 18, PAL.white);
    P.rect(ctx, 2, 2, 20, 12, PAL.photo);
  } else if (spec.kind === 'bag') {
    P.rect(ctx, 0, 0, 24, 18, PAL.wallLight);
    P.rect(ctx, 0, 0, 24, 3, spec.head);
    P.rect(ctx, 7, 6, 10, 9, PAL.wallDark);
  } else {
    P.rect(ctx, 3, 0, 18, 18, PAL.paper);
    P.rect(ctx, 5, 2, 14, 2, spec.head);
    for (let y = 6; y < 16; y += 3) P.rect(ctx, 5, y, 14, 1, PAL.grey);
  }
  P.frame(ctx, spec.kind === 'paper' ? 3 : 0, 0, spec.kind === 'paper' ? 18 : 24, 18, PAL.black);
  return c;
}

// 跟 evidence.js 的 EVIDENCE 同一個格式：bake 把兩張表一起輸出。
export const GREYBOX_EVIDENCE = Object.fromEntries(Object.keys(GREYBOX).map((id) => [id, {
  name: EXHIBITS[id].name, w: GREYBOX[id].w, h: GREYBOX[id].h, greybox: true,
  draw: (s) => greyboxDoc(id, s).canvas, icon: () => greyboxIcon(id),
  // 要畫一次才知道格子多高，所以用到時才算
  get hotspots() { return greyboxDoc(id, 1).hotspots; },
}]));

// 每張佔位圖：輸出到 game/art/ 的路徑和畫法；圖的尺寸就是版面上的位置（game/tests/test_art.gd 會檢查）。
// 人像是一排三格：閉嘴、開口、眨眼。換成手畫的 PNG 之後，把它從這張表刪掉，免得被蓋過。
function sheet(spec) {
  const { c, ctx } = P.canvas(56 * 3, 60);
  for (const f of [0, 1, 2]) ctx.drawImage(portrait(spec, f), 56 * f, 0);
  return c;
}

export const TEXTURES = [
  ['court/court.png', court],
  ...Object.keys(WITNESS_LOOK).map((id) => [`court/witness-${id}.png`, () => witness(id)]),
  ['court/tick.png', () => tri(5, 3, PAL.white)],
  ['booth/booth.png', booth],
  ['booth/more.png', () => tri(7, 4, PAL.white)],
  ['booth/portrait-empty.png', emptyPortrait],
  ...Object.entries(PEOPLE).map(([id, spec]) => [`booth/portrait-${id}.png`, () => sheet(spec)]),
  ['desk/desk.png', desk],
  ['desk/notebook.png', notebookBase],
  ['desk/tray.png', tray],
  ['desk/plaque-inspect.png', () => plaque('對照')],
  ['desk/plaque-inspect-on.png', () => plaque('對照', true)],
  ['desk/plaque-booklet.png', () => plaque('須知')],
  ['desk/plaque-slip.png', () => plaque('紙條')],
  ['desk/arrow-left.png', () => arrow(-1)],
  ['desk/arrow-right.png', () => arrow(1)],
  ['desk/loupe.png', loupe],
  ['desk/bang.png', bang],
  ['rack/rack.png', rack],
  ['rack/stamp-trust.png', () => stamp('trust')],
  ['rack/stamp-doubt.png', () => stamp('doubt')],
  ['rack/stamp-struck.png', () => stamp('struck')],
  ['rack/imprint-trust.png', () => imprint('trust')],
  ['rack/imprint-doubt.png', () => imprint('doubt')],
  ['rack/imprint-struck.png', () => imprint('struck')],
  ['ui/sound-on.png', () => speaker(true)],
  ['ui/sound-off.png', () => speaker(false)],
];
