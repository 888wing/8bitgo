// 佔位美術：全部用程式逐點畫，只用下面 32 色。目的是試手感，不是定稿。
import * as P from './pixels.js';
import * as L from './layout.js';

export const PAL = {
  ink: '#1d2733', black: '#141716', panel: '#1f2b25', wallDark: '#55625a',
  wall: '#7d8a7e', wallLight: '#a3aea2', white: '#eef1e8', wood: '#6b4a2f',
  woodDark: '#45301e', woodLight: '#8f6845', leather: '#2f4a3c', leatherDark: '#233a2e',
  paper: '#e2e4d8', paperShade: '#c3c6b8', paperLine: '#aab6bb', brass: '#b08d4a',
  brassDark: '#7a5f30', brassLight: '#dbbd78', red: '#b3261e', trust: '#24466f',
  doubt: '#7a4d14', skin: '#d8a982', skinShade: '#ad7c5a', hair: '#2a2626',
  grey: '#8d928e', robe: '#1b1d22', judgeRed: '#8a2a24', khaki: '#8a7a52',
  suit: '#33404d', metal: '#b3b9bb', skinLight: '#eec7a1', photo: '#2c302e',
};

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

function witness(kind) {
  const { c, ctx } = P.canvas(24, 22);
  const cloth = kind === 'chung' ? PAL.khaki : PAL.suit;
  P.rect(ctx, 4, 12, 16, 10, cloth);
  if (kind === 'cheng') {
    P.rect(ctx, 11, 12, 3, 6, PAL.white);
    P.rect(ctx, 12, 13, 1, 6, PAL.red);
  } else {
    P.px(ctx, 8, 15, PAL.brass);
  }
  P.ellipse(ctx, 12, 7, 4, 5, PAL.skin);
  P.rect(ctx, 8, 2, 9, 3, kind === 'chung' ? PAL.grey : PAL.hair);
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
};

function portrait(spec, frame) {
  const { c, ctx } = P.canvas(56, 60);
  // 身體
  const clothes = { suit: PAL.suit, robe: PAL.robe, judge: PAL.judgeRed, uniform: PAL.suit, khaki: PAL.khaki }[spec.clothes];
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

function stamp(kind) {
  const { c, ctx } = P.canvas(26, 34);
  const ink = kind === 'trust' ? PAL.trust : PAL.doubt;
  P.ellipse(ctx, 13, 8, 9, 7, PAL.woodDark);
  P.ellipse(ctx, 13, 7, 8, 6, PAL.woodLight);
  const t = P.text(kind === 'trust' ? '信' : '疑', { size: 12, weight: 700, color: PAL.white, threshold: 120 });
  ctx.drawImage(t.canvas, 13 - Math.floor(t.width / 2), 1);
  P.rect(ctx, 10, 14, 6, 7, PAL.woodDark);
  P.rect(ctx, 2, 21, 22, 8, PAL.wood);
  P.rect(ctx, 2, 21, 22, 1, PAL.woodLight);
  P.rect(ctx, 3, 29, 20, 4, ink);
  return c;
}

// 每一下蓋出來的印都不一樣：邊框和字有隨機的缺墨。
export function imprint(kind) {
  const { c, ctx } = P.canvas(22, 22);
  const ink = kind === 'trust' ? PAL.trust : PAL.doubt;
  P.frame(ctx, 0, 0, 22, 22, ink);
  P.frame(ctx, 1, 1, 20, 20, ink);
  const t = P.text(kind === 'trust' ? '信' : '疑', { size: 13, weight: 700, color: ink, threshold: 110 });
  ctx.drawImage(t.canvas, 11 - Math.floor(t.width / 2), 3);
  const img = ctx.getImageData(0, 0, 22, 22);
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] && Math.random() < 0.09) img.data[i] = 0;
  ctx.putImageData(img, 0, 0);
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

// —— 證物：托盤上的小圖、桌上的原大、放大鏡下的兩倍 ——

// 同一件證物畫兩次：原大一次，放大鏡用的兩倍一次。兩倍時字按兩倍大小重新排過，
// 所以細字放大後看得清；有些細節（zoomed 為真）只在兩倍時才畫得出來。
function painter(w, h, s) {
  const { c, ctx } = P.canvas(w * s, h * s);
  const dot = (x, y, color) => P.rect(ctx, x * s, y * s, s, s, color);
  return {
    c,
    ctx,
    zoomed: s > 1,
    rect: (x, y, ww, hh, color) => P.rect(ctx, x * s, y * s, ww * s, hh * s, color),
    frame(x, y, ww, hh, color) {
      this.rect(x, y, ww, 1, color);
      this.rect(x, y + hh - 1, ww, 1, color);
      this.rect(x, y, 1, hh, color);
      this.rect(x + ww - 1, y, 1, hh, color);
    },
    line: (x0, y0, x1, y1, color) => P.linePoints(x0, y0, x1, y1).forEach(([x, y]) => dot(x, y, color)),
    dither(x, y, ww, hh, color, phase = 0) {
      for (let j = 0; j < hh; j += 1) {
        for (let i = 0; i < ww; i += 1) if ((i + j + phase) % 2 === 0) dot(x + i, y + j, color);
      }
    },
    text(str, x, y, opts, zoomOpts = {}) {
      const o = s > 1 ? { ...opts, ...zoomOpts } : opts;
      const t = P.text(str, { ...o, size: o.size * s, width: (o.width ?? 0) * s, lineHeight: (o.lineHeight ?? 0) * s });
      ctx.drawImage(t.canvas, x * s, y * s);
    },
  };
}

function photo(s) {
  const p = painter(104, 72, s);
  p.rect(0, 0, 104, 72, PAL.white);
  p.frame(0, 0, 104, 72, PAL.paperShade);
  p.rect(4, 4, 96, 60, PAL.photo);
  // 三樓樓梯的牆，燒得最黑
  p.rect(6, 6, 42, 24, PAL.black);
  p.dither(48, 6, 14, 24, PAL.black);
  // 樓梯和扶手
  for (let i = 0; i < 7; i += 1) p.rect(6 + i * 10, 58 - i * 7, 14, 2, PAL.grey);
  p.line(6, 50, 72, 10, PAL.metal);
  // 右下角：地下寫字樓的門
  p.rect(80, 34, 14, 28, PAL.brassDark);
  p.frame(80, 34, 14, 28, PAL.grey);
  p.rect(82, 60, 9, 1, PAL.black);
  if (p.zoomed) {
    // 門腳的黑痕，放大才看得出是燒過
    P.dither(p.ctx, 160, 106, 28, 12, PAL.black);
    P.rect(p.ctx, 162, 116, 24, 6, PAL.black);
    P.dither(p.ctx, 166, 96, 14, 10, PAL.black, 1);
  }
  p.text('P1', 88, 63, { size: 8, color: PAL.grey, threshold: 90 });
  return p.c;
}

function bag(s) {
  const p = painter(84, 62, s);
  p.rect(0, 0, 84, 62, PAL.metal);
  p.frame(0, 0, 84, 62, PAL.paperShade);
  p.rect(0, 0, 84, 9, PAL.suit);
  p.text('證物 P2', 4, 0, { size: 8, weight: 700, color: PAL.white, threshold: 90 });
  p.rect(4, 46, 36, 12, PAL.white);
  p.text('三樓樓梯', 6, 48, { size: 8, color: PAL.grey, threshold: 90 });
  // 火水打火機：火石輪、防風罩、機身
  p.rect(41, 9, 4, 3, PAL.grey);
  p.rect(36, 12, 14, 7, PAL.metal);
  for (let x = 38; x < 49; x += 3) p.rect(x, 14, 1, 2, PAL.grey);
  p.rect(34, 19, 18, 30, PAL.metal);
  p.rect(49, 19, 3, 30, PAL.grey);
  p.rect(34, 26, 18, 1, PAL.grey);
  p.dither(39, 33, 7, 7, PAL.grey);
  if (p.zoomed) {
    // 火石輪磨得光滑；棉芯又乾又散
    P.rect(p.ctx, 82, 18, 8, 6, PAL.metal);
    P.rect(p.ctx, 82, 18, 8, 1, PAL.white);
    P.rect(p.ctx, 76, 26, 3, 10, PAL.paperShade);
    for (const [x, y] of [[75, 24], [79, 23], [77, 22], [74, 26], [80, 25]]) P.px(p.ctx, x, y, PAL.paperShade);
    // 機身刻的字
    P.rect(p.ctx, 78, 66, 14, 14, PAL.metal);
    p.ctx.drawImage(P.text('樂', { size: 13, weight: 700, color: PAL.grey, threshold: 110 }).canvas, 78, 66);
  }
  return p.c;
}

function confession(s) {
  const p = painter(92, 116, s);
  p.rect(0, 0, 92, 116, PAL.paper);
  p.frame(0, 0, 92, 116, PAL.paperShade);
  p.text('警署口供紙', 6, 3, { size: 12, weight: 700, color: PAL.ink, threshold: 120 });
  p.rect(6, 19, 80, 1, PAL.ink);
  p.text('本人何嘉樂，二十二歲，外賣員，住福安樓四樓。', 6, 22,
    { size: 8, width: 80, lineHeight: 9, color: PAL.grey, threshold: 90 }, { color: PAL.ink, threshold: 110 });
  p.text('本人承認於福安樓放火。', 6, 52, { size: 12, weight: 500, width: 80, lineHeight: 14, color: PAL.ink, threshold: 110 });
  p.text('簽署：', 6, 86, { size: 8, color: PAL.grey, threshold: 90 }, { color: PAL.ink });
  p.line(30, 92, 40, 84, PAL.ink);
  p.line(40, 84, 44, 92, PAL.ink);
  p.line(44, 92, 56, 86, PAL.ink);
  p.line(56, 86, 70, 90, PAL.ink);
  // 頁底歪斜的一行手寫字：原大時只是一條墨跡
  p.text('我只係喺地下點過張紙', 4, 103,
    { font: 'hand', size: 8, width: 86, color: PAL.trust, threshold: 80 }, { weight: 700, threshold: 110 });
  return p.c;
}

function icon(kind) {
  const { c, ctx } = P.canvas(24, 18);
  if (kind === 'photo') {
    P.rect(ctx, 0, 0, 24, 18, PAL.white);
    P.rect(ctx, 2, 2, 20, 13, PAL.photo);
    P.line(ctx, 3, 13, 20, 4, PAL.grey);
  } else if (kind === 'bag') {
    P.rect(ctx, 0, 0, 24, 18, PAL.metal);
    P.rect(ctx, 0, 0, 24, 3, PAL.suit);
    P.rect(ctx, 10, 6, 5, 9, PAL.metal);
  } else {
    P.rect(ctx, 3, 0, 18, 18, PAL.paper);
    for (let y = 3; y < 16; y += 3) P.rect(ctx, 5, y, 14, 1, PAL.grey);
  }
  P.frame(ctx, kind === 'paper' ? 3 : 0, 0, kind === 'paper' ? 18 : 24, 18, PAL.black);
  return c;
}

// 陰影是半格網點，拿起來時離紙遠一點。
function shadow(w, h) {
  const { c, ctx } = P.canvas(w, h);
  P.dither(ctx, 0, 0, w, h, PAL.black);
  return c;
}

// 放大鏡的鏡片形狀：圓內不透明，邊緣沒有半透明的點。
export function disc(r) {
  const { c, ctx } = P.canvas(r * 2 + 1, r * 2 + 1);
  for (let y = -r; y <= r; y += 1) {
    for (let x = -r; x <= r; x += 1) if (x * x + y * y <= (r - 0.5) ** 2) P.px(ctx, x + r, y + r, '#000');
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

// hotspots：證物上各個細節的位置（原大的座標）。
export const DOCS = {
  P1: { w: 104, h: 72, icon: 'photo', draw: photo, hotspots: { P1a: [6, 6, 50, 24], P1b: [78, 52, 18, 12] } },
  P2: { w: 84, h: 62, icon: 'bag', draw: bag, hotspots: { P2a: [34, 28, 18, 14], P2b: [34, 7, 18, 13] } },
  P4: { w: 92, h: 116, icon: 'paper', draw: confession, hotspots: { P4a: [4, 50, 84, 32], P4b: [2, 100, 88, 15] } },
};

export function registerAll(scene) {
  const add = (key, make) => {
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, make());
  };
  add('court', court);
  add('witness-cheng', () => witness('cheng'));
  add('witness-chung', () => witness('chung'));
  add('booth', booth);
  add('desk', desk);
  add('nb-base', notebookBase);
  add('tray', tray);
  add('plaque-inspect', () => plaque('對照'));
  add('plaque-inspect-on', () => plaque('對照', true));
  add('plaque-booklet', () => plaque('須知'));
  add('arrow-left', () => arrow(-1));
  add('arrow-right', () => arrow(1));
  add('rack', rack);
  add('stamp-trust', () => stamp('trust'));
  add('stamp-doubt', () => stamp('doubt'));
  add('loupe', loupe);
  add('more', () => tri(7, 4, PAL.white));
  add('tick', () => tri(5, 3, PAL.white));
  add('sound-on', () => speaker(true));
  add('sound-off', () => speaker(false));
  add('pt-empty', emptyPortrait);
  for (const [id, spec] of Object.entries(PEOPLE)) {
    for (const f of [0, 1, 2]) add(`pt-${id}-${f}`, () => portrait(spec, f));
  }
  for (const [id, d] of Object.entries(DOCS)) {
    add(`doc-${id}-icon`, () => icon(d.icon));
    add(`doc-${id}-full`, () => d.draw(1));
    add(`doc-${id}-zoom`, () => d.draw(2));
    add(`shadow-${id}`, () => shadow(d.w, d.h));
  }
  add('shadow-icon', () => shadow(24, 18));
  add('shadow-stamp', () => shadow(26, 34));
  add('bang', bang);
}
