// 證物：每件畫兩次。s = 1 是放在桌上的原大；s = 2 是放大鏡裡看到的樣子。
// 兩倍時字按兩倍大小重新排，所以原大時糊成一片的細字，放大後讀得出；
// 另外有些細節（zoomed 為真）只在兩倍時才畫：要用放大鏡才發現。
// 尺寸和細節的位置跟遊戲的 prototype/desk/art.js 一樣，可以直接換過去。
import * as P from '../../prototype/desk/pixels.js';
import { PAL as C } from '../../prototype/desk/art.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function painter(w, h, s) {
  const { c, ctx } = P.canvas(w * s, h * s);
  const dot = (x, y, color) => P.rect(ctx, x * s, y * s, s, s, color);
  return {
    c, ctx, s, zoomed: s > 1,
    px: dot,
    rect: (x, y, ww, hh, color) => P.rect(ctx, x * s, y * s, ww * s, hh * s, color),
    hline: (x, y, ww, color) => P.rect(ctx, x * s, y * s, ww * s, s, color),
    vline: (x, y, hh, color) => P.rect(ctx, x * s, y * s, s, hh * s, color),
    frame(x, y, ww, hh, color) {
      this.hline(x, y, ww, color);
      this.hline(x, y + hh - 1, ww, color);
      this.vline(x, y, hh, color);
      this.vline(x + ww - 1, y, hh, color);
    },
    line: (x0, y0, x1, y1, color) => P.linePoints(x0, y0, x1, y1).forEach(([x, y]) => dot(x, y, color)),
    dither(x, y, ww, hh, color, phase = 0) {
      for (let j = 0; j < hh; j += 1) for (let i = 0; i < ww; i += 1) if ((i + j + phase) % 2 === 0) dot(x + i, y + j, color);
    },
    speckle(x, y, ww, hh, color, density, seed) {
      const r = rng(seed);
      for (let j = 0; j < hh; j += 1) for (let i = 0; i < ww; i += 1) if (r() < density) dot(x + i, y + j, color);
    },
    text(str, x, y, opts, zoomOpts = {}) {
      const o = s > 1 ? { ...opts, ...zoomOpts } : opts;
      // 兩倍時斷行的寬度多留兩點：字寬的小數誤差會令放大後提早斷行
      const t = P.text(str, { ...o, size: o.size * s, width: o.width ? o.width * s + (s > 1 ? 2 : 0) : 0, lineHeight: (o.lineHeight ?? 0) * s });
      ctx.drawImage(t.canvas, x * s, y * s);
    },
    // 只在放大時畫的細節，用兩倍圖本身的座標
    fine(fn) {
      if (s > 1) fn(ctx);
    },
  };
}

// —— P1 樓梯現場相片：黑白照片，閃光燈打亮近處 ——
// 細節位置：P1a 三樓燒得最黑的牆 (6, 6, 50, 24)；P1b 右下角地下寫字樓的門腳 (78, 52, 18, 12)。
export function photoP1(s) {
  const p = painter(104, 72, s);
  // 相紙：白邊，下面留位寫字
  p.rect(0, 0, 104, 72, C.white);
  p.hline(0, 71, 104, C.paperShade);
  p.vline(103, 0, 72, C.paperShade);
  const X = 4;
  const Y = 4;
  const W = 96;
  const H = 58;
  p.rect(X, Y, W, H, C.wallDark);

  // 樓梯井：右邊向下望，暗
  p.rect(X + 60, Y, 36, H, C.photo);
  p.dither(X + 60, Y, 36, H, C.black);
  // 三樓的牆：燒得最黑，煙由下向上薰
  p.rect(X, Y, 58, 28, C.black);
  p.dither(X, Y + 24, 58, 6, C.black, 1);
  p.dither(X + 40, Y, 20, 28, C.photo);
  for (let i = 0; i < 9; i += 1) {
    const x = X + 4 + i * 6;
    p.vline(x, Y + 10 + (i % 3) * 3, 14 - (i % 3) * 3, C.photo);
  }
  // 煙薰的紋：短短的橫向灰痕，不用亮點（亮點看起來像星）
  const soot = [[6, 6], [14, 9], [28, 5], [36, 12], [9, 16], [22, 18], [44, 15], [31, 21], [50, 8]];
  for (const [sx, sy] of soot) p.hline(X + sx, Y + sy, 3, C.photo);
  // 燒剩的燈：一條電線吊著燈泡座
  p.vline(X + 22, Y, 6, C.grey);
  p.rect(X + 20, Y + 6, 5, 3, C.wall);
  p.px(X + 22, Y + 9, C.metal);

  // 樓梯：踏板受光，級面暗
  for (let k = 0; k < 9; k += 1) {
    const sx = X + k * 7;
    const sy = Y + 50 - k * 4;
    p.rect(sx, sy, 9, 1, C.metal);
    p.rect(sx, sy + 1, 9, 3, C.wall);
    p.rect(sx, sy + 4, 9, 4, C.wallDark);
    p.px(sx + 2 + (k % 3), sy, C.white);
  }
  p.rect(X, Y + 54, 64, 4, C.photo);
  // 灰燼
  p.speckle(X, Y + 22, 60, 34, C.grey, 0.008, 103);
  // 扶手和欄杆：有幾支燒彎了
  p.line(X, Y + 36, X + 62, Y + 2, C.metal);
  p.line(X, Y + 37, X + 62, Y + 3, C.photo);
  for (let i = 0; i < 9; i += 1) {
    const bx = X + 4 + i * 7;
    const top = Y + 36 - Math.round((bx - X) * 34 / 62);
    const bottom = Y + 50 - Math.round((bx - X) * 4 / 7);
    if (i === 5) {
      p.line(bx, top + 1, bx + 2, bottom - 2, C.grey);
    } else {
      p.vline(bx, top + 1, Math.max(1, bottom - top - 1), C.grey);
    }
  }

  // 右下：從樓梯井望落地下，寫字樓的門
  p.rect(X + 72, Y + 26, 20, 31, C.wall);
  p.frame(X + 72, Y + 26, 20, 31, C.grey);
  p.rect(X + 75, Y + 29, 14, 9, C.metal);
  p.hline(X + 75, Y + 29, 14, C.white);
  p.rect(X + 77, Y + 32, 10, 2, C.wall);
  p.rect(X + 75, Y + 40, 14, 15, C.grey);
  p.px(X + 86, Y + 46, C.white);
  p.hline(X + 72, Y + 56, 20, C.black);
  // 門腳的黑痕：原大時只是一點暗
  p.dither(X + 75, Y + 52, 14, 3, C.photo);
  p.fine((ctx) => {
    // 放大才看得出：門縫下面一團向上薰的黑
    const ox = (X + 74) * 2;
    const oy = (Y + 44) * 2;
    P.dither(ctx, ox + 2, oy + 6, 24, 18, C.black);
    P.rect(ctx, ox + 4, oy + 18, 20, 6, C.black);
    P.dither(ctx, ox + 6, oy, 14, 8, C.black, 1);
    P.rect(ctx, ox - 2, oy + 24, 32, 2, C.black);
  });
  // 燒焦的牆上的裂紋，放大才看見
  p.fine((ctx) => {
    for (const [x0, y0, x1, y1] of [[20, 30, 34, 44], [34, 44, 30, 56], [70, 24, 84, 36], [84, 36, 96, 34], [52, 40, 60, 52]]) {
      P.line(ctx, x0, y0, x1, y1, C.photo);
    }
  });

  // 相片的暗角
  p.dither(X, Y, W, 2, C.black);
  p.dither(X, Y + H - 2, W, 2, C.black, 1);
  p.frame(X - 1, Y - 1, W + 2, H + 2, C.grey);
  // 白邊上的鉛筆字
  p.text('P1 福安樓三樓 3/11', 6, 63, { font: 'hand', size: 8, color: C.grey, threshold: 80 }, { weight: 700, threshold: 110, color: C.wallDark });
  return p.c;
}

// —— P2 證物袋裡的火水打火機 ——
// 細節位置：P2a 機身刻的字 (10, 28, 20, 14)；P2b 火石輪和棉芯 (10, 7, 18, 13)。打火機在左，標籤在右，互不遮擋。
export function bagP2(s) {
  const p = painter(84, 62, s);
  // 透明膠袋壓在皮革上：淺灰綠，有反光和摺痕
  p.rect(0, 9, 84, 53, C.wallLight);
  for (let i = 0; i < 3; i += 1) p.line(3 + i, 34, 22 + i, 12, C.paperShade);
  p.line(6, 34, 25, 12, C.white);
  for (let i = 0; i < 2; i += 1) p.line(60 + i, 60, 80 + i, 34, C.paperShade);
  p.line(62, 60, 82, 34, C.white);
  p.line(1, 24, 14, 60, C.wall);
  p.line(64, 12, 82, 22, C.wall);
  p.speckle(1, 10, 82, 51, C.paperShade, 0.015, 201);
  // 熱封的袋邊
  p.vline(2, 10, 50, C.white);
  p.vline(3, 10, 50, C.paperShade);
  p.vline(80, 10, 50, C.paperShade);
  p.vline(81, 10, 50, C.white);
  p.hline(2, 58, 80, C.paperShade);
  p.hline(2, 59, 80, C.white);
  p.frame(0, 9, 84, 53, C.wall);
  // 封口條：印著「證物」，左邊有個吊孔
  p.rect(0, 0, 84, 9, C.suit);
  p.hline(0, 0, 84, C.wallDark);
  p.hline(0, 8, 84, C.ink);
  p.rect(3, 3, 3, 3, C.black);
  p.frame(2, 2, 5, 5, C.metal);
  p.text('皇家香港警察', 10, 0, { size: 8, weight: 500, color: C.white, threshold: 90 });
  p.text('P2', 72, 0, { size: 8, weight: 700, color: C.brassLight, threshold: 90 });

  // 標籤：手寫的地點和日期
  p.rect(40, 30, 42, 27, C.white);
  p.hline(40, 56, 42, C.paperShade);
  p.vline(81, 30, 27, C.paperShade);
  for (const y of [39, 48]) p.hline(42, y, 38, C.paperLine);
  const hand = { font: 'hand', size: 8, color: C.trust, threshold: 80 };
  p.text('福安樓', 42, 31, hand, { weight: 700, threshold: 110 });
  p.text('三樓樓梯', 42, 40, hand, { weight: 700, threshold: 110 });
  p.text('3/11/87', 42, 49, hand, { weight: 700, threshold: 110 });
  p.line(70, 54, 73, 50, C.trust);
  p.line(73, 50, 75, 54, C.trust);
  p.line(75, 54, 79, 51, C.trust);

  // 打火機：蓋向右翻開，看得見防風罩、火石輪、棉芯
  p.rect(29, 9, 9, 15, C.black);
  p.rect(30, 10, 7, 13, C.grey);
  p.vline(30, 10, 13, C.metal);
  p.hline(30, 10, 7, C.metal);
  p.rect(28, 22, 3, 6, C.black);
  p.vline(29, 23, 4, C.grey);
  // 防風罩：兩行氣孔
  p.rect(11, 13, 16, 14, C.black);
  p.rect(12, 14, 14, 12, C.metal);
  p.vline(12, 14, 12, C.white);
  p.vline(24, 14, 12, C.grey);
  p.vline(25, 14, 12, C.wallDark);
  for (const y of [17, 21]) for (const x of [15, 18, 21]) p.px(x, y, C.black);
  // 火石輪和棉芯：原大時只是兩點
  p.rect(19, 10, 5, 4, C.black);
  p.rect(20, 11, 3, 2, C.grey);
  p.rect(14, 11, 3, 3, C.paperShade);
  p.px(14, 10, C.paperShade);
  // 機身：圓角，左邊反光，右邊背光
  p.rect(10, 26, 20, 27, C.black);
  p.rect(11, 27, 18, 25, C.metal);
  for (const [x, y] of [[10, 26], [29, 26], [10, 52], [29, 52]]) p.px(x, y, C.wallLight);
  p.rect(11, 27, 2, 25, C.white);
  p.vline(13, 27, 25, C.paperShade);
  p.rect(24, 27, 3, 25, C.grey);
  p.rect(27, 27, 2, 25, C.wallDark);
  p.hline(11, 27, 18, C.white);
  p.hline(11, 30, 18, C.wallDark);
  p.hline(11, 51, 18, C.grey);
  // 刮花
  p.line(15, 44, 19, 48, C.grey);
  p.line(20, 31, 22, 33, C.grey);
  // 刻字：原大時只是一個小記號
  p.dither(16, 35, 6, 6, C.grey);
  p.px(18, 34, C.wallDark);
  p.px(19, 41, C.wallDark);
  p.fine((ctx) => {
    // 火石輪磨得光滑，沒有齒；棉芯又乾又散，沒有油漬
    P.rect(ctx, 38, 20, 10, 8, C.metal);
    P.rect(ctx, 38, 20, 10, 1, C.white);
    P.rect(ctx, 38, 23, 10, 1, C.white);
    P.rect(ctx, 38, 27, 10, 1, C.grey);
    P.rect(ctx, 28, 22, 6, 6, C.paperShade);
    for (const [x, y] of [[27, 20], [29, 18], [31, 17], [33, 19], [35, 21], [26, 23], [32, 19], [30, 21]]) P.px(ctx, x, y, C.paperShade);
    P.rect(ctx, 28, 27, 6, 1, C.skinShade);
    // 機身刻的「樂」字：深色的刻痕，下面一道光
    ctx.drawImage(P.text('樂', { size: 13, weight: 700, color: C.white, threshold: 110 }).canvas, 31, 69);
    ctx.drawImage(P.text('樂', { size: 13, weight: 700, color: C.wallDark, threshold: 110 }).canvas, 30, 68);
    // 細刮痕
    for (const [x0, y0, x1, y1] of [[26, 60, 34, 64], [42, 92, 50, 86], [28, 96, 32, 100]]) P.line(ctx, x0, y0, x1, y1, C.grey);
  });
  return p.c;
}

// —— P4 警署口供紙 ——
// 細節位置：P4a 承認放火的一句 (4, 50, 84, 32)；P4b 頁底歪斜的手寫字 (2, 100, 88, 15)。
export function confessionP4(s) {
  const p = painter(92, 116, s);
  p.rect(0, 0, 92, 116, C.paper);
  p.speckle(1, 1, 90, 114, C.paperShade, 0.012, 401);
  p.vline(91, 0, 116, C.paperShade);
  p.hline(0, 115, 92, C.paperShade);
  // 摺成三份的摺痕
  for (const y of [38, 77]) {
    p.hline(0, y, 92, C.paperShade);
    p.hline(0, y + 1, 92, C.white);
  }
  // 釘書釘
  p.hline(3, 2, 5, C.metal);
  p.hline(3, 3, 5, C.grey);
  // 印好的表格
  const small = { size: 8, color: C.wallDark, threshold: 90 };
  p.text('皇家香港警察', 6, 3, small, { color: C.ink, threshold: 110 });
  p.text('3/11/87', 58, 3, small, { color: C.ink, threshold: 110 });
  p.text('警署口供紙', 6, 12, { size: 12, weight: 400, color: C.ink, threshold: 120 });
  p.hline(6, 27, 80, C.ink);
  p.hline(6, 28, 80, C.paperShade);
  // 打字的內容
  const typed = { size: 8, width: 80, lineHeight: 9, color: C.ink, threshold: 90 };
  // 每行十一個字，句末的標點剛好碰到紙邊，所以這段由 x = 4 開始
  p.text('本人何嘉樂，二十二歲，外賣員，住福安樓四樓。', 4, 30, typed, { threshold: 110 });
  p.text('本人承認於福安樓放火。', 6, 50, { size: 12, weight: 500, width: 80, lineHeight: 14, color: C.ink, threshold: 110 });
  p.text('以上內容正確。', 6, 80, typed, { threshold: 110 });
  // 簽名、日期、警署的圓印
  p.text('簽署：', 6, 90, small, { color: C.ink, threshold: 110 });
  p.line(28, 97, 34, 90, C.ink);
  p.line(34, 90, 37, 97, C.ink);
  p.line(37, 97, 44, 92, C.ink);
  p.line(44, 92, 52, 95, C.ink);
  p.line(52, 95, 56, 92, C.ink);
  for (let y = -6; y <= 6; y += 1) {
    for (let x = -6; x <= 6; x += 1) {
      const d = Math.sqrt(x * x + y * y);
      if ((d > 5 && d <= 6.4) || (d > 3 && d <= 3.6)) p.px(78 + x, 94 + y, C.trust);
    }
  }
  p.px(78, 94, C.trust);
  p.fine((ctx) => {
    // 圓印上的細字只在放大時看到一圈點
    for (let a = 0; a < 24; a += 1) {
      const ang = (a / 24) * Math.PI * 2;
      P.px(ctx, Math.round(157 + Math.cos(ang) * 9), Math.round(189 + Math.sin(ang) * 9), C.trust);
    }
  });
  // 頁底歪斜的一行手寫字：原大時只是一條墨跡
  p.text('我只係喺地下點過張紙', 4, 103, { font: 'hand', size: 8, width: 86, color: C.trust, threshold: 80 }, { weight: 700, threshold: 110 });
  return p.c;
}

// —— 托盤上的小圖 ——

export function iconP1() {
  const { c, ctx } = P.canvas(24, 18);
  P.rect(ctx, 0, 0, 24, 18, C.white);
  P.rect(ctx, 2, 2, 20, 12, C.wallDark);
  P.rect(ctx, 2, 2, 11, 6, C.black);
  P.rect(ctx, 14, 2, 8, 12, C.photo);
  P.line(ctx, 2, 12, 14, 4, C.metal);
  P.rect(ctx, 17, 8, 4, 6, C.wall);
  P.rect(ctx, 3, 15, 10, 1, C.grey);
  P.frame(ctx, 0, 0, 24, 18, C.black);
  return c;
}

export function iconP2() {
  const { c, ctx } = P.canvas(24, 18);
  P.rect(ctx, 0, 0, 24, 18, C.wallLight);
  P.rect(ctx, 0, 0, 24, 3, C.suit);
  P.line(ctx, 2, 14, 8, 5, C.white);
  P.rect(ctx, 10, 6, 6, 10, C.black);
  P.rect(ctx, 11, 7, 4, 8, C.metal);
  P.px(ctx, 11, 7, C.white);
  P.rect(ctx, 2, 11, 7, 5, C.white);
  P.frame(ctx, 0, 0, 24, 18, C.black);
  return c;
}

export function iconP4() {
  const { c, ctx } = P.canvas(24, 18);
  P.rect(ctx, 3, 0, 18, 18, C.paper);
  P.rect(ctx, 5, 2, 10, 2, C.ink);
  for (let y = 6; y < 15; y += 2) P.rect(ctx, 5, y, 14, 1, C.grey);
  P.rect(ctx, 15, 12, 3, 3, C.trust);
  P.frame(ctx, 3, 0, 18, 18, C.black);
  return c;
}

// hotspots：每個細節在證物上的位置（原大的座標），對照模式和放大鏡都靠它。
export const EVIDENCE = {
  P1: { name: '樓梯現場相片', w: 104, h: 72, draw: photoP1, icon: iconP1, hotspots: { P1a: [6, 6, 50, 24], P1b: [78, 52, 18, 12] } },
  P2: { name: '證物袋裡的打火機', w: 84, h: 62, draw: bagP2, icon: iconP2, hotspots: { P2a: [10, 28, 20, 14], P2b: [10, 7, 18, 13] } },
  P4: { name: '警署口供紙', w: 92, h: 116, draw: confessionP4, icon: iconP4, hotspots: { P4a: [4, 50, 84, 32], P4b: [2, 100, 88, 15] } },
};
