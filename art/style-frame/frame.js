// 風格定稿圖：一張完整上色的 480×270 法庭桌面。
// 版面、調色盤和字都照 docs/06-art.md；每一部分都是將來換掉佔位美術時的樣板。
// 畫的一刻：鄭督察答辯方「……我唔記得。」；放大鏡停在口供頁底的手寫字上，你拿起「疑」字印章，準備蓋在他的口供上。
import * as P from '../../prototype/desk/pixels.js';
import * as L from '../../prototype/desk/layout.js';
import { PAL as C } from '../../prototype/desk/art.js';
import { EVIDENCE } from './evidence.js';

// —— 工具 ——

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

const hline = (ctx, x, y, w, color) => P.rect(ctx, x, y, w, 1, color);
const vline = (ctx, x, y, h, color) => P.rect(ctx, x, y, 1, h, color);

// 字元圖：一個字元代表一種顏色；空格和句點是透明。
function sprite(ctx, x, y, rows, key) {
  rows.forEach((row, j) => {
    [...row].forEach((ch, i) => {
      if (key[ch]) P.px(ctx, x + i, y + j, key[ch]);
    });
  });
}

// 凸起的面：上、左受光，下、右背光。
function raised(ctx, x, y, w, h, face, light, dark) {
  P.rect(ctx, x, y, w, h, face);
  hline(ctx, x, y, w, light);
  vline(ctx, x, y, h, light);
  hline(ctx, x, y + h - 1, w, dark);
  vline(ctx, x + w - 1, y, h, dark);
}

// 凹入的面：反過來。
function sunken(ctx, x, y, w, h, face, light, dark) {
  P.rect(ctx, x, y, w, h, face);
  hline(ctx, x, y, w, dark);
  vline(ctx, x, y, h, dark);
  hline(ctx, x, y + h - 1, w, light);
  vline(ctx, x + w - 1, y, h, light);
}

// 木紋：一塊塊橫放的木板，每塊有幾條略為起伏、斷斷續續的紋。lines 是每塊的紋數。
function planks(ctx, x, y, w, h, { base, dark, light, seam, height = 22, seed = 1, lines: perBoard = 0 }) {
  const r = rng(seed);
  P.rect(ctx, x, y, w, h, base);
  for (let top = y; top < y + h; top += height) {
    const bh = Math.min(height, y + h - top);
    if (seam && top > y) hline(ctx, x, top, w, seam);
    const lines = perBoard || Math.max(1, Math.floor(bh / 5));
    for (let k = 0; k < lines; k += 1) {
      const row = top + 2 + Math.floor((k + r() * 0.6) * (bh - 3) / lines);
      const phase = r() * 6.28;
      const amp = 0.6 + r();
      const freq = 0.02 + r() * 0.03;
      let i = Math.floor(r() * 20);
      while (i < w) {
        const len = 10 + Math.floor(r() * 40);
        const color = r() < 0.75 ? dark : light;
        for (let t = 0; t < len && i + t < w; t += 1) {
          const yy = row + Math.round(Math.sin((i + t) * freq + phase) * amp);
          if (yy > top && yy < top + bh) P.px(ctx, x + i + t, yy, color);
        }
        i += len + 4 + Math.floor(r() * 18);
      }
    }
  }
}

// 稀疏的點：皮革、紙、牆的質感。
function speckle(ctx, x, y, w, h, color, density, seed) {
  const r = rng(seed);
  for (let j = 0; j < h; j += 1) {
    for (let i = 0; i < w; i += 1) if (r() < density) P.px(ctx, x + i, y + j, color);
  }
}

function dottedH(ctx, x, y, w, color, step = 2) {
  for (let i = 0; i < w; i += step) P.px(ctx, x + i, y, color);
}

function dottedFrame(ctx, x, y, w, h, color) {
  for (let i = 0; i < w; i += 2) {
    P.px(ctx, x + i, y, color);
    P.px(ctx, x + i, y + h - 1, color);
  }
  for (let j = 0; j < h; j += 2) {
    P.px(ctx, x, y + j, color);
    P.px(ctx, x + w - 1, y + j, color);
  }
}

function text(ctx, str, x, y, opts) {
  const t = P.text(str, opts);
  ctx.drawImage(t.canvas, x, y);
  return t;
}

// 光從左上方來：把一個橢球按亮度分幾級顏色，色塊乾淨，不用網點。
const LIGHT = (() => {
  const v = [-0.5, -0.62, 0.6];
  const n = Math.hypot(...v);
  return v.map((a) => a / n);
})();

function shade(ctx, { cx, cy, rx, ry, mask, ramp, light = LIGHT }) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y += 1) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x += 1) {
      if (!mask(x, y)) continue;
      const nx = Math.max(-1, Math.min(1, (x + 0.5 - cx) / rx));
      const ny = Math.max(-1, Math.min(1, (y + 0.5 - cy) / ry));
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const i = nx * light[0] + ny * light[1] + nz * light[2];
      P.px(ctx, x, y, (ramp.find(([t]) => i >= t) ?? ramp[ramp.length - 1])[1]);
    }
  }
}

const inEllipse = (cx, cy, rx, ry) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;

// —— 法庭 ——

function drawCourt(ctx) {
  // 天花和日光燈：燈下的牆亮一截
  P.rect(ctx, 0, 0, 480, 96, C.wall);
  P.rect(ctx, 0, 0, 480, 3, C.panel);
  for (const lx of [56, 312]) {
    hline(ctx, lx - 2, 0, 116, C.wallDark);
    P.rect(ctx, lx, 1, 112, 2, C.white);
    P.rect(ctx, lx - 8, 3, 128, 3, C.wallLight);
    P.dither(ctx, lx - 20, 6, 152, 4, C.wallLight);
  }
  // 吸音板：接縫左邊受光
  for (let x = 24; x < 480; x += 48) {
    vline(ctx, x, 6, 35, C.wallDark);
    vline(ctx, x - 1, 6, 35, C.wallLight);
  }
  P.dither(ctx, 0, 38, 480, 3, C.wallDark, 1);
  drawClock(ctx, 34, 20);

  // 柚木牆板
  planks(ctx, 0, 41, 480, 46, { base: C.wood, dark: C.woodDark, light: C.woodLight, height: 46, seed: 3, lines: 6 });
  hline(ctx, 0, 41, 480, C.woodLight);
  hline(ctx, 0, 42, 480, C.brass);
  hline(ctx, 0, 43, 480, C.woodDark);
  for (let x = 4; x < 480; x += 30) sunken(ctx, x, 48, 24, 34, C.wood, C.woodLight, C.woodDark);
  // 地板
  P.rect(ctx, 0, 86, 480, 10, C.woodDark);
  hline(ctx, 0, 86, 480, C.black);
  P.dither(ctx, 0, 90, 480, 6, C.black);

  // 法官：徽章、雕花的高背、法官、法官席
  P.rect(ctx, 220, 18, 40, 25, C.woodDark);
  P.rect(ctx, 222, 16, 36, 2, C.woodDark);
  P.rect(ctx, 225, 14, 30, 2, C.woodDark);
  hline(ctx, 225, 14, 30, C.wood);
  vline(ctx, 220, 18, 25, C.wood);
  vline(ctx, 259, 18, 25, C.black);
  P.frame(ctx, 223, 19, 34, 22, C.brassDark);
  drawArms(ctx, 229, 2);
  drawJudge(ctx, 228, 16);
  raised(ctx, 166, 38, 148, 4, C.woodLight, C.brass, C.woodDark);
  P.rect(ctx, 168, 42, 144, 26, C.woodDark);
  for (let i = 0; i < 7; i += 1) raised(ctx, 171 + i * 20, 45, 17, 20, C.wood, C.woodLight, C.black);
  hline(ctx, 168, 67, 144, C.black);
  raised(ctx, 231, 47, 18, 7, C.brass, C.brassLight, C.brassDark);

  // 證人台
  drawCheng(ctx, 79, 29);
  raised(ctx, 56, 50, 64, 4, C.woodLight, C.brass, C.woodDark);
  P.rect(ctx, 58, 54, 60, 32, C.woodDark);
  raised(ctx, 63, 58, 50, 24, C.wood, C.woodLight, C.black);
  // 咪高峰
  vline(ctx, 103, 42, 8, C.black);
  P.rect(ctx, 102, 39, 3, 3, C.photo);
  P.px(ctx, 102, 39, C.grey);

  drawUsher(ctx, 124, 38);

  // 律師枱在他們前面，椅背在我們這邊
  for (const tx of [140, 250]) {
    raised(ctx, tx, 62, 90, 3, C.woodLight, C.brass, C.woodDark);
    P.rect(ctx, tx + 2, 65, 86, 8, C.woodDark);
    P.rect(ctx, tx + 6, 59, 20, 3, C.paper);
    hline(ctx, tx + 6, 61, 20, C.paperShade);
    P.rect(ctx, tx + 62, 58, 14, 4, C.judgeRed);
    hline(ctx, tx + 62, 58, 14, C.red);
    hline(ctx, tx + 62, 61, 14, C.woodDark);
  }
  drawCounsel(ctx, 176, 50);
  drawCounsel(ctx, 290, 50);
  for (const cx of [170, 284]) {
    P.dither(ctx, cx + 2, 86, 26, 3, C.black);
    raised(ctx, cx, 70, 28, 16, C.woodDark, C.wood, C.black);
    P.rect(ctx, cx + 2, 68, 24, 2, C.woodDark);
    hline(ctx, cx + 2, 68, 24, C.wood);
  }

  drawDock(ctx, 352, 40);
}

function drawClock(ctx, cx, cy) {
  P.ellipse(ctx, cx, cy, 9, 9, C.brassDark);
  P.ellipse(ctx, cx, cy, 8, 8, C.brass);
  P.ellipse(ctx, cx, cy, 7, 7, C.white);
  for (const [dx, dy] of [[0, -6], [6, 0], [0, 6], [-6, 0]]) P.px(ctx, cx + dx, cy + dy, C.ink);
  P.line(ctx, cx, cy, cx - 2, cy - 4, C.ink);
  P.line(ctx, cx, cy, cx - 4, cy - 2, C.ink);
  P.line(ctx, cx, cy, cx + 4, cy + 2, C.ink);
  P.px(ctx, cx, cy, C.red);
  P.px(ctx, cx - 5, cy - 5, C.white);
}

// 法官席上方的皇家徽章：盾、冠、兩隻扶盾獸、絲帶。
function drawArms(ctx, x, y) {
  sprite(ctx, x, y, [
    '.........YYYYY.........',
    '........YbYbYbY........',
    '........YYYYYYY........',
    '.WW.....bbbbbbb.....bb.',
    'WWWw...bYYYbrrrb...bYYb',
    '.WWWw..bYYYbrrrb..bYYb.',
    '..WWww.bbbbbbbbb.bYYYb.',
    '..WwWw.bwwwbYYYb.bYbYb.',
    '..W.Ww.bwwwbYYYb..YbYb.',
    '..W..w.bwwwbYYYb..Y..Y.',
    '..W..w..bwwbYYb...Y..Y.',
    '.........bbbbb.........',
    '.bbYYYYYYYYYYYYYYYYYbb.',
    'bYYbbbbbbbbbbbbbbbbYYb.',
    '.bb.................bb.',
  ], { Y: C.brass, b: C.brassDark, r: C.judgeRed, W: C.white, w: C.paperShade });
  hline(ctx, x + 2, y + 12, 18, C.brassLight);
}

// 小人：法官。半月形眼鏡、假髮兩邊捲起、紅袍、白色領帶。
function drawJudge(ctx, x, y) {
  sprite(ctx, x, y, [
    '.......wwwwwwwwww.......',
    '.....wWWWWWWWWWWWWw.....',
    '....wWWgWWWgWWWgWWWw....',
    '...wWWWWWWWWWWWWWWWWw...',
    '...WWgWWLSSSSSSSWWgWW...',
    '..gWWWWWLSSSSSSSsWWWWg..',
    '..gWgWWSSSSSSSSSsWWgWg..',
    '..gWWWWwwwSSSSwwwWWWWg..',
    '..gWgWWSIISSSSIIsWWgWg..',
    '..gWWWWKYKKSSKKYKWWWWg..',
    '..gWgWWSSSSSssSSsWWgWg..',
    '...gWWWsSSSddSSssWWWg...',
    '...gWWWsSSsDDsSssWWWg...',
    '....gWWWsssssssWWWWg....',
    '.....rrRWWBBBBWWRrr.....',
    '...rRRRRRWBBBBWRRRRrr...',
    '..rRRRRRRrBBBBrRRRRRrr..',
    '.rRRRRRRRrrBBrrRRRRRRrr.',
    'rRRRRRRRrrrrrrrrRRRRRrrr',
    'rRRRRRRrrrrrrrrrrRRRRrrr',
    'rRRRRRrrrrrrrrrrrrRRRrrr',
    'rRRRRrrrrrrrrrrrrrrRRrrr',
  ], {
    W: C.white, w: C.paperShade, g: C.wallLight, L: C.skinLight, S: C.skin, s: C.skinShade, d: C.woodLight, D: C.wood,
    K: C.black, Y: C.white, I: C.ink, R: C.red, r: C.judgeRed, B: C.white,
  });
}

// 小人：證人台上的鄭督察。灰西裝、紅領帶、黑頭髮。
function drawCheng(ctx, x, y) {
  sprite(ctx, x, y, [
    '.......hhhhhhh........',
    '.....hhhnhhhhhhh......',
    '....hhnnhhhhhhhhh.....',
    '....hhSSSSSSSSShh.....',
    '....hSSSSSSSSSSShh....',
    '...sSSKKSSSSKKSSSs....',
    '...sSSSSSSSSSSSSss....',
    '....SSSSSsdSSSSss.....',
    '....sSSSShhhhSSss.....',
    '.....sSSSSddSSss......',
    '......ssSSSSsss.......',
    '.......dssssdd........',
    '....UUUUWWTWWUUUU.....',
    '..UUUUUUWWTTWUUUUUU...',
    '.UUUUUUUUWTTUUUUUUUu..',
    'UUUUUUUuUUTTUUuUUUuuu.',
    'UUUUUUUuUUTtUUuUUUuuu.',
    'UUUUUUUuUUUUUUuUUuuuu.',
    'UUUUUUuuUUUUUUuuUuuuu.',
    'UUUUUuuuUUUUUUuuuuuuu.',
    'UUUUuuuuUUUUUUuuuuuuu.',
  ], {
    h: C.black, n: C.wallDark, S: C.skin, s: C.skinShade, d: C.woodLight, K: C.ink,
    U: C.wallDark, u: C.photo, W: C.white, T: C.red, t: C.judgeRed,
  });
}

function drawUsher(ctx, x, y) {
  sprite(ctx, x, y, [
    '...iiiiiii....',
    '..iiiiYiiii...',
    '.KKKKKKKKKKK..',
    '...SSSSSSs....',
    '...SKSSKSs....',
    '...SSSSSss....',
    '...sSSSSss....',
    '....ssssd.....',
    '..iiiWWWiiii..',
    '.iiiiiWiiiiii.',
    '.iIiiiYiiiiiu.',
    '.iIiiiiiiiiiu.',
    '.iIiiiYiiiiiu.',
    '.iIiiiiiiiiuu.',
    '.iIiiiiiiiiuu.',
    '.SiiiiYiiiiuS.',
    '..iiiiiiiiiu..',
    '..iiiiiiiiiu..',
    '..KKKKKKKKKK..',
    '..iiiii.iiiu..',
    '..iiiii.iiiu..',
    '..iiiii.iiiu..',
    '..iiiii.iiiu..',
    '..iiiii.iiiu..',
    '..iiiii.iiiu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '..iiiii.iiuu..',
    '.KKKKK..KKKK..',
    '.KKKKKK.KKKKK.',
  ], { i: C.suit, I: C.wallDark, u: C.ink, K: C.black, Y: C.brass, S: C.skin, s: C.skinShade, d: C.woodLight, W: C.white });
}

// 大律師的背影：假髮後面一排排的捲、兩條小辮、黑袍的摺。
function drawCounsel(ctx, x, y) {
  sprite(ctx, x, y, [
    '....wwwwwwww....',
    '..wWWWWWWWWWWw..',
    '.wWgWWgWWgWWgWw.',
    '.WWWWWWWWWWWWWW.',
    '.gWgWWgWWgWWgWg.',
    '.WWWWWWWWWWWWWW.',
    '..gWgWWgWWgWWg..',
    '...WW.ssss.WW...',
    '...W..sSSs..W...',
    '..qqKKWWWWKKKK..',
    '.qqKKKKKKKKKKKK.',
    'qqKKKKKKKKKKKKKK',
    'qKKKKKpKKKpKKKKK',
    'qKKKKKpKKKpKKKKK',
    'qKKKKpKKKKKpKKKK',
    'KKKKKpKKKKKpKKKK',
    'KKKKKpKKKKKKpKKK',
    'KKKKpKKKKKKKpKKK',
    'KKKKpKKKKKKKKKKK',
    'KKKKKKKKKKKKKKKK',
  ], { W: C.white, w: C.paperShade, g: C.wallLight, s: C.skinShade, S: C.skin, K: C.robe, p: C.photo, q: C.wallDark });
}

function drawDock(ctx, x, y) {
  // 被告坐著，白恤衫，望住陪審席。
  sprite(ctx, x + 36, y + 5, [
    '...hhhhhhh....',
    '..hhhhhhhhh...',
    '..hhSSSSSShh..',
    '..hSSSSSSSSh..',
    '..sSKSSSKSSs..',
    '..sSSSSSSSss..',
    '...SSSssSSs...',
    '...sSSddSss...',
    '....sssss.....',
    '..WWWWsWWWW...',
    '.WWWWWWWWWWw..',
    'WWWWWWWWWWWww.',
    'WWWWwWWWWWwww.',
    'WWWWwWWWWWwww.',
    'WWWWwWWWWwwww.',
    'WWWwwWWWWwwww.',
    'WWWwwWWWwwwww.',
    'WWwwwWWWwwwww.',
  ], { h: C.black, S: C.skin, s: C.skinShade, d: C.woodLight, K: C.ink, W: C.paper, w: C.paperShade });
  // 懲教人員
  sprite(ctx, x + 64, y + 2, [
    '.iiiiiii..',
    'KKKKKKKKK.',
    '..SSSSs...',
    '..SKSKs...',
    '..SSSss...',
    '...sss....',
    '.iiiWiii..',
    'iiiiiiiiu.',
    'iIiiiiiiu.',
    'iIiiYiiiu.',
    'iIiiiiiuu.',
    'iIiiiiiuu.',
    'iiiiiiiuu.',
    'iiiiiiuuu.',
    'iiiiiiuuu.',
    'iiiiiiuuu.',
    'iiiiiiuuu.',
    'iiiiiiuuu.',
    'iiiiiiuuu.',
    'iiiiiiuuu.',
  ], { i: C.suit, I: C.wallDark, u: C.ink, K: C.black, Y: C.brass, S: C.skin, s: C.skinShade, W: C.white });
  // 欄杆和木欄
  raised(ctx, x, y, 86, 3, C.woodLight, C.brass, C.woodDark);
  for (let i = 4; i < 84; i += 7) {
    vline(ctx, x + i, y + 3, 23, C.brassDark);
    vline(ctx, x + i + 1, y + 3, 23, C.brass);
  }
  raised(ctx, x, y + 25, 86, 3, C.woodLight, C.brass, C.woodDark);
  P.rect(ctx, x + 2, y + 28, 82, 24, C.woodDark);
  for (let i = 0; i < 4; i += 1) raised(ctx, x + 5 + i * 20, y + 31, 17, 18, C.wood, C.woodLight, C.black);
  hline(ctx, x + 2, y + 51, 82, C.black);
}

// —— 左下：特寫、名牌、對白 ——

function drawBooth(ctx) {
  const { x, y, w, h } = L.BOOTH;
  planks(ctx, x, y, w, h, { base: C.woodDark, dark: C.black, light: C.wood, height: 58, seed: 11, lines: 4 });
  vline(ctx, x + w - 2, y, h, C.wood);
  vline(ctx, x + w - 1, y, h, C.black);
  hline(ctx, x, y, w, C.black);
  hline(ctx, x, y + 1, w, C.wood);

  // 相框
  const f = L.PORTRAIT;
  P.dither(ctx, f.x + 2, f.y + 2, f.w, f.h, C.black);
  P.rect(ctx, f.x, f.y, f.w, f.h, C.black);
  raised(ctx, f.x + 1, f.y + 1, f.w - 2, f.h - 2, C.brass, C.brassLight, C.brassDark);
  P.rect(ctx, f.x + 3, f.y + 2, f.w - 6, f.h - 4, C.black);
  for (const [cx, cy] of [[f.x + 2, f.y + 2], [f.x + f.w - 3, f.y + 2], [f.x + 2, f.y + f.h - 3], [f.x + f.w - 3, f.y + f.h - 3]]) {
    P.px(ctx, cx, cy, C.brassLight);
  }
  ctx.drawImage(portraitCheng(), f.x + 4, f.y + 3);

  // 名牌
  const n = L.NAME;
  P.rect(ctx, n.x, n.y, n.w, n.h, C.black);
  raised(ctx, n.x + 1, n.y + 1, n.w - 2, n.h - 2, C.brass, C.brassLight, C.brassDark);
  for (const sx of [n.x + 4, n.x + n.w - 5]) {
    P.px(ctx, sx, n.y + 6, C.brassDark);
    P.px(ctx, sx, n.y + 7, C.brassLight);
  }
  const name = P.text('鄭督察', { size: 12, weight: 400, lineHeight: 13, color: C.ink, threshold: 120 });
  ctx.drawImage(name.canvas, n.x + Math.floor((n.w - name.width) / 2), n.y + 1);

  // 對白框
  const d = L.DIALOGUE;
  P.rect(ctx, d.x, d.y, d.w, d.h, C.black);
  P.rect(ctx, d.x + 1, d.y + 1, d.w - 2, d.h - 2, C.panel);
  P.frame(ctx, d.x + 2, d.y + 2, d.w - 4, d.h - 4, C.wallDark);
  hline(ctx, d.x + 3, d.y + 3, d.w - 6, C.photo);
  text(ctx, '……我唔記得。', d.x + 6, d.y + 7, { size: 13, weight: 500, width: 124, lineHeight: 16, color: C.white, threshold: 110 });
  sprite(ctx, d.x + d.w - 13, d.y + d.h - 9, ['KKKKKKK', '.KKKKK.', '..KKK..', '...K...'], { K: C.white });
}

// 特寫：鄭督察，四十歲，短髮、鬍子、灰西裝。答「唔記得」時眼睛望開，眉頭皺起，額角有汗。
// 光從左上方來：臉的左邊亮，右邊和下巴底暗。逐行定好皮膚的範圍，五官逐點放。
function portraitCheng() {
  const { c, ctx } = P.canvas(56, 60);
  const dot = (x, y, color) => P.px(ctx, x, y, color);
  const run = (y, x0, x1, color) => P.rect(ctx, x0, y, x1 - x0 + 1, 1, color);

  // 背景：牆色，下面暗一點
  P.rect(ctx, 0, 0, 56, 60, C.wallDark);

  // 西裝：肩膀向兩邊斜落；左肩受光
  for (let y = 44; y < 60; y += 1) {
    const half = Math.min(28, 13 + Math.round((y - 44) * 1.9));
    run(y, 28 - half, 27 + half, C.suit);
    run(y, 28 - half, 28 - half + 2, y < 50 ? C.grey : C.suit);
    run(y, 27 + half - 5, 27 + half, C.ink);
  }
  run(44, 15, 40, C.suit);
  run(44, 15, 18, C.grey);
  // 恤衫和領帶
  for (let y = 42; y < 60; y += 1) {
    const half = Math.max(0, 6 - Math.round((y - 42) * 0.42));
    if (half) run(y, 28 - half, 27 + half, y < 46 ? C.white : C.paperShade);
  }
  run(42, 22, 24, C.white);
  run(42, 31, 33, C.paperShade);
  P.rect(ctx, 26, 44, 4, 3, C.judgeRed);
  dot(26, 44, C.red);
  dot(27, 44, C.red);
  for (let y = 47; y < 60; y += 1) {
    const half = 1 + Math.floor((y - 47) / 5);
    run(y, 28 - half, 27 + half, C.judgeRed);
    dot(28 - half, y, C.red);
  }
  // 翻領
  P.line(ctx, 21, 45, 25, 59, C.ink);
  P.line(ctx, 34, 45, 30, 59, C.ink);
  P.line(ctx, 20, 46, 23, 59, C.grey);

  // 頸：在下巴的影裡
  for (let y = 38; y <= 44; y += 1) run(y, 22, 33, C.skinShade);
  for (let y = 38; y <= 41; y += 1) run(y, 22, 33, C.woodLight);
  for (let y = 38; y <= 44; y += 1) run(y, 31, 33, C.woodLight);

  // 耳
  for (let y = 22; y <= 30; y += 1) {
    run(y, 14, 16, C.skin);
    run(y, 39, 41, C.skinShade);
  }
  for (let y = 24; y <= 28; y += 1) {
    dot(15, y, C.skinShade);
    dot(40, y, C.woodLight);
  }
  for (const y of [22, 30]) {
    dot(14, y, C.wallDark);
    dot(41, y, C.wallDark);
  }
  for (let y = 23; y <= 29; y += 1) dot(41, y, C.woodLight);

  // 臉：每行皮膚的左右界
  const FACE = {
    13: [19, 36], 14: [18, 37], 15: [17, 38], 16: [17, 38], 17: [17, 38], 18: [17, 38], 19: [17, 38], 20: [17, 38],
    21: [17, 38], 22: [17, 38], 23: [17, 38], 24: [17, 38], 25: [17, 38], 26: [17, 38], 27: [17, 38], 28: [17, 38],
    29: [17, 38], 30: [17, 38], 31: [18, 37], 32: [18, 37], 33: [19, 36], 34: [19, 36], 35: [20, 35], 36: [21, 34],
    37: [22, 33], 38: [24, 31], 39: [26, 29],
  };
  for (const [y, [x0, x1]] of Object.entries(FACE)) {
    const yy = +y;
    run(yy, x0, x1, C.skin);
    run(yy, x1 - 3, x1, C.skinShade);
    if (yy >= 27) dot(x1, yy, C.woodLight);
    if (yy >= 33) run(yy, x1 - 1, x1, C.woodLight);
  }
  // 受光：額頭左邊、左顴骨
  for (const [y, x0, x1] of [[14, 20, 25], [15, 19, 24], [16, 19, 22], [25, 18, 20], [26, 18, 20], [27, 19, 20]]) run(y, x0, x1, C.skinLight);
  // 下巴和腮的影
  for (const [y, x0, x1] of [[34, 20, 22], [35, 21, 22], [36, 22, 23]]) run(y, x0, x1, C.skinShade);
  run(39, 26, 29, C.woodLight);

  // 頭髮：黑色、短、左分界，向右梳；右邊和邊緣最黑
  const HAIR = {
    5: [21, 34], 6: [18, 37], 7: [17, 38], 8: [16, 39], 9: [16, 39], 10: [15, 40], 11: [15, 40], 12: [15, 40],
  };
  for (const [y, [x0, x1]] of Object.entries(HAIR)) {
    run(+y, x0, x1, C.hair);
    run(+y, x1 - 4, x1, C.black);
    dot(x0, +y, C.black);
  }
  run(13, 15, 18, C.hair);
  run(13, 37, 40, C.black);
  run(14, 15, 17, C.hair);
  run(14, 38, 40, C.black);
  for (let y = 15; y <= 22; y += 1) {
    run(y, 15, 16, C.hair);
    run(y, 39, 40, C.black);
  }
  dot(17, 15, C.hair);
  dot(38, 15, C.black);
  // 分界和梳過的光
  P.line(ctx, 22, 6, 21, 12, C.black);
  for (const [x0, y0, x1, y1] of [[24, 7, 31, 6], [23, 9, 33, 8], [24, 11, 30, 10], [18, 8, 20, 7]]) P.line(ctx, x0, y0, x1, y1, C.wallDark);
  dot(19, 10, C.wallDark);
  // 額前的頭髮線：左邊略高
  run(13, 19, 21, C.hair);
  dot(22, 13, C.hair);

  // 眉：粗，眉頭向下壓
  run(19, 19, 24, C.black);
  run(20, 20, 24, C.black);
  run(19, 31, 36, C.black);
  run(20, 31, 35, C.black);
  dot(25, 21, C.black);
  dot(30, 21, C.black);
  dot(19, 19, C.hair);
  dot(36, 19, C.hair);
  // 眉骨下的影
  run(21, 19, 24, C.skinShade);
  run(21, 31, 36, C.skinShade);
  // 眼：上眼瞼、眼白、望向左下的眼珠、眼袋
  run(22, 20, 24, C.black);
  run(22, 31, 35, C.black);
  run(23, 20, 24, C.paperShade);
  run(23, 31, 35, C.paperShade);
  dot(20, 23, C.ink);
  dot(21, 23, C.ink);
  dot(31, 23, C.ink);
  dot(32, 23, C.ink);
  run(24, 20, 24, C.skinShade);
  run(24, 31, 35, C.skinShade);
  dot(25, 23, C.skinShade);
  dot(36, 23, C.woodLight);
  // 鼻：鼻樑受光，右邊有影，鼻翼和鼻孔
  for (let y = 23; y <= 28; y += 1) dot(27, y, C.skinLight);
  for (let y = 24; y <= 29; y += 1) dot(29, y, C.skinShade);
  run(30, 25, 30, C.skin);
  dot(27, 29, C.skinLight);
  dot(25, 30, C.skinShade);
  dot(30, 30, C.skinShade);
  dot(25, 31, C.woodLight);
  dot(30, 31, C.wood);
  run(31, 26, 29, C.skinShade);
  // 鬍子
  run(32, 24, 31, C.black);
  run(33, 23, 32, C.black);
  run(32, 24, 26, C.hair);
  dot(22, 33, C.hair);
  dot(33, 33, C.black);
  // 嘴：抿著，嘴角向下
  run(34, 25, 30, C.skinShade);
  run(35, 25, 30, C.wood);
  dot(24, 36, C.woodLight);
  dot(31, 36, C.woodLight);
  run(36, 26, 29, C.skin);
  run(37, 26, 29, C.skinShade);
  dot(27, 38, C.skin);
  dot(28, 38, C.skin);

  // 額角的汗
  dot(19, 16, C.white);
  dot(19, 17, C.metal);
  dot(19, 18, C.metal);
  dot(20, 18, C.skinShade);
  return c;
}

// —— 右下：陪審桌 ——

function drawDesk(ctx) {
  const { x, y, w, h } = L.DESK;
  planks(ctx, x, y, w, 154, { base: C.wood, dark: C.woodDark, light: C.woodLight, seam: C.black, height: 26, seed: 21 });
  vline(ctx, x, y, h, C.black);
  // 皮革面
  const lx = 330;
  const ly = 132;
  const lw = 146;
  const lh = 116;
  P.rect(ctx, lx - 1, ly - 1, lw + 2, lh + 2, C.black);
  P.rect(ctx, lx, ly, lw, lh, C.leather);
  speckle(ctx, lx, ly, lw, lh, C.leatherDark, 0.22, 7);
  speckle(ctx, lx, ly, lw, lh, C.wallDark, 0.02, 8);
  hline(ctx, lx, ly, lw, C.leatherDark);
  vline(ctx, lx, ly, lh, C.leatherDark);
  hline(ctx, lx - 1, ly + lh + 1, lw + 2, C.woodLight);
  for (let i = 4; i < lw - 4; i += 4) {
    P.rect(ctx, lx + i, ly + 3, 2, 1, C.brassDark);
    P.rect(ctx, lx + i, ly + lh - 4, 2, 1, C.brassDark);
  }
  for (let j = 4; j < lh - 4; j += 4) {
    P.rect(ctx, lx + 3, ly + j, 1, 2, C.brassDark);
    P.rect(ctx, lx + lw - 4, ly + j, 1, 2, C.brassDark);
  }
  // 桌邊和工具槽
  P.rect(ctx, x, 250, w, 20, C.woodDark);
  hline(ctx, x, 250, w, C.woodLight);
  hline(ctx, x, 251, w, C.wood);
  planks(ctx, x + 1, 253, w - 1, 16, { base: C.woodDark, dark: C.black, light: C.wood, height: 16, seed: 31 });
  hline(ctx, x, 269, w, C.black);
}

function drawTray(ctx) {
  const t = L.TRAY;
  P.dither(ctx, t.x + 2, t.y + 2, t.w, t.h, C.black);
  raised(ctx, t.x, t.y, t.w, t.h, C.wood, C.woodLight, C.woodDark);
  hline(ctx, t.x + 1, t.y + 1, t.w - 2, C.brass);
  sunken(ctx, t.x + 3, t.y + 3, t.w - 6, t.h - 6, C.leatherDark, C.leather, C.black);
  // 銅牌
  raised(ctx, t.x + 5, t.y + 6, 26, 15, C.brass, C.brassLight, C.brassDark);
  text(ctx, '證物', t.x + 6, t.y + 7, { size: 12, weight: 500, lineHeight: 13, color: C.ink, threshold: 110 });
}

function drawNotebook(ctx) {
  const n = L.NOTEBOOK;
  P.dither(ctx, n.x + 3, n.y + 3, 169, 145, C.black);
  // 一疊紙：底下幾頁露出邊
  P.rect(ctx, n.x + 2, n.y + 2, 167, 143, C.paperShade);
  hline(ctx, n.x + 2, n.y + 144, 167, C.grey);
  vline(ctx, n.x + 168, n.y + 2, 143, C.grey);
  P.rect(ctx, n.x, n.y, 167, 143, C.paper);
  hline(ctx, n.x, n.y + 142, 167, C.paperShade);
  vline(ctx, n.x + 166, n.y, 143, C.paperShade);
  speckle(ctx, n.x + 1, n.y + 8, 164, 132, C.paperShade, 0.012, 41);
  // 頂部的線圈
  for (let i = 8; i < 162; i += 9) {
    P.px(ctx, n.x + i + 1, n.y + 6, C.black);
    P.px(ctx, n.x + i + 2, n.y + 6, C.photo);
    sprite(ctx, n.x + i, n.y - 2, ['.mm.', 'mWMm', 'M..M', 'M..K', 'M..K', 'mKK.'], { m: C.metal, W: C.white, M: C.grey, K: C.wallDark });
  }
  // 頁邊線
  vline(ctx, L.PAGE.x + 24, n.y + 9, 131, C.paperLine);
  vline(ctx, L.PAGE.x + 25, n.y + 9, 131, C.paperLine);
  drawPage(ctx, L.PAGE.x, L.PAGE.y);
}

// 一頁筆記：抬頭、說法、紅筆批註、鉛筆字、印。
function drawPage(ctx, px, py) {
  const hand = (str, color, lh) => ({ font: 'hand', size: 12, weight: 700, width: 134, lineHeight: lh, color, threshold: 110 });
  text(ctx, '偵緝督察鄭志雄（控方）', px, py, { size: 12, weight: 400, lineHeight: 14, color: C.ink, threshold: 120 });
  dottedH(ctx, px, py + 15, 160, C.paperLine);
  const entries = [
    { claim: '起火點在三樓樓梯', notes: [['地下門腳都有黑痕？', C.grey]], stamp: 'trust' },
    { claim: '打火機在起火點找到，刻著「樂」字', notes: [['火石平、棉芯乾，點著？', C.red]], stamp: 'doubt' },
    { claim: '被告簽署口供，承認放火', notes: [['佢只係喺地下點過紙？', C.red]], target: true },
  ];
  let y = py + 18;
  const rows = [];
  for (const e of entries) {
    const top = y;
    y += text(ctx, e.claim, px + 26, y, hand(e.claim, C.ink, 14)).height;
    for (const [note, color] of e.notes) y += text(ctx, note, px + 26, y, hand(note, color, 13)).height;
    const h = Math.max(24, y - top);
    if (e.stamp) ctx.drawImage(imprint(e.stamp, top), px + 1, top);
    rows.push({ top, h, target: e.target });
    y = top + h + 2;
    dottedH(ctx, px + 26, y - 1, 134, C.paperLine);
  }
  // 「疑」字印章對準第三條：虛線框出要蓋的地方
  const t = rows.find((r) => r.target);
  dottedFrame(ctx, px, t.top - 1, 160, t.h + 2, C.ink);
  return t;
}

// 印：兩圈框、一個字，缺墨的位置每次不同。
function imprint(kind, seed) {
  const { c, ctx } = P.canvas(22, 22);
  const ink = kind === 'trust' ? C.trust : C.doubt;
  P.frame(ctx, 0, 0, 22, 22, ink);
  P.frame(ctx, 1, 1, 20, 20, ink);
  const t = P.text(kind === 'trust' ? '信' : '疑', { size: 13, weight: 700, color: ink, threshold: 110 });
  ctx.drawImage(t.canvas, 11 - Math.floor(t.width / 2), 3);
  const img = ctx.getImageData(0, 0, 22, 22);
  const r = rng(seed);
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] && r() < 0.1) img.data[i] = 0;
  ctx.putImageData(img, 0, 0);
  return c;
}

// —— 證物 ——

function drawEvidence(ctx) {
  // 口供攤在皮革上；相片和打火機留在托盤
  const doc = EVIDENCE.P4;
  P.dither(ctx, 334, 135, doc.w, doc.h, C.black);
  ctx.drawImage(doc.draw(1), 332, 133);
  for (const [i, id] of [[0, 'P1'], [1, 'P2']]) {
    const x = L.SLOTS.x + i * L.SLOTS.step;
    P.dither(ctx, x + 1, L.SLOTS.y + 1, 24, 18, C.black);
    ctx.drawImage(EVIDENCE[id].icon(), x, L.SLOTS.y);
  }
}

// 放大鏡：鏡片裡是證物的兩倍圖。光從左上方來，銅框左上亮、右下暗。
function drawLoupe(ctx, cx, cy, docId, dx, dy) {
  // 手柄和陰影
  P.dither(ctx, cx + 14, cy + 16, 26, 26, C.black);
  for (let i = 0; i < 26; i += 1) {
    const x = cx + 14 + i;
    const y = cy + 14 + i;
    P.rect(ctx, x, y, 4, 1, i < 5 ? C.brass : C.wood);
    P.px(ctx, x, y, i < 5 ? C.brassLight : C.woodLight);
    P.px(ctx, x + 3, y, i < 5 ? C.brassDark : C.woodDark);
    if (i === 12 || i === 18) P.rect(ctx, x, y, 4, 1, C.brassDark);
  }
  P.rect(ctx, cx + 38, cy + 38, 4, 3, C.woodDark);
  // 鏡片
  const r = L.LENS_R;
  const zoom = EVIDENCE[docId].draw(2);
  const lens = P.canvas(r * 2 + 1, r * 2 + 1);
  lens.ctx.fillStyle = C.leather;
  lens.ctx.fillRect(0, 0, r * 2 + 1, r * 2 + 1);
  lens.ctx.drawImage(zoom, r - 2 * (cx - dx), r - 2 * (cy - dy));
  for (let y = -r; y <= r; y += 1) {
    for (let x = -r; x <= r; x += 1) {
      if (x * x + y * y > (r - 0.5) ** 2) lens.ctx.clearRect(x + r, y + r, 1, 1);
    }
  }
  ctx.drawImage(lens.c, cx - r, cy - r);
  // 銅框
  for (let y = -23; y <= 23; y += 1) {
    for (let x = -23; x <= 23; x += 1) {
      const d = Math.sqrt(x * x + y * y);
      if (d > 18.5 && d <= 21.5) {
        const lit = (-x - y) / (Math.SQRT2 * d);
        let color = lit > 0.45 ? C.brassLight : lit > -0.35 ? C.brass : C.brassDark;
        if (d > 20.5) color = C.black;
        P.px(ctx, cx + x, cy + y, color);
      }
    }
  }
  // 玻璃反光
  for (const [x, y] of [[-11, -8], [-10, -10], [-8, -12], [-12, -6]]) P.px(ctx, cx + x, cy + y, C.white);
  P.px(ctx, cx - 6, cy - 13, C.paperShade);
}

// —— 印章架和印章 ——

function stamp(kind) {
  const { c, ctx } = P.canvas(26, 34);
  const ink = kind === 'trust' ? C.trust : C.doubt;
  shade(ctx, { cx: 13, cy: 7.5, rx: 9, ry: 7, mask: inEllipse(13, 7.5, 9, 7), ramp: [[0.82, C.brass], [0.5, C.woodLight], [0.1, C.wood], [-2, C.woodDark]] });
  const t = P.text(kind === 'trust' ? '信' : '疑', { size: 12, weight: 700, color: C.woodDark, threshold: 120 });
  ctx.drawImage(t.canvas, 13 - Math.floor(t.width / 2) + 1, 2);
  const t2 = P.text(kind === 'trust' ? '信' : '疑', { size: 12, weight: 700, color: C.paper, threshold: 120 });
  ctx.drawImage(t2.canvas, 13 - Math.floor(t2.width / 2), 1);
  P.rect(ctx, 10, 14, 6, 7, C.wood);
  vline(ctx, 10, 14, 7, C.woodLight);
  vline(ctx, 15, 14, 7, C.woodDark);
  raised(ctx, 2, 21, 22, 8, C.wood, C.woodLight, C.woodDark);
  hline(ctx, 3, 22, 20, C.brass);
  P.rect(ctx, 3, 29, 20, 4, ink);
  hline(ctx, 3, 32, 20, C.black);
  return c;
}

function drawRack(ctx, x, y) {
  P.dither(ctx, x - 3, y + 3, 4, 104, C.black);
  raised(ctx, x, y, 52, 104, C.wood, C.woodLight, C.woodDark);
  vline(ctx, x + 1, y + 1, 102, C.brass);
  for (const sy of [6, 46]) {
    sunken(ctx, x + 7, y + sy - 1, 38, 36, C.black, C.woodLight, C.black);
    P.rect(ctx, x + 8, y + sy + 30, 36, 4, C.woodDark);
  }
  ctx.drawImage(stamp('trust'), x + 13, y + 6);
  // 退庭
  raised(ctx, x + 4, y + 85, 44, 15, C.brass, C.brassLight, C.brassDark);
  P.frame(ctx, x + 3, y + 84, 46, 17, C.black);
  const t = P.text('退庭', { size: 12, weight: 700, color: C.ink, threshold: 120 });
  ctx.drawImage(t.canvas, x + 4 + Math.floor((44 - t.width) / 2) + 1, y + 85);
}

// —— 工具槽 ——

function plaque(ctx, x, y, w, label, color = C.ink) {
  P.frame(ctx, x - 1, y - 1, w + 2, 17, C.black);
  raised(ctx, x, y, w, 15, C.brass, C.brassLight, C.brassDark);
  if (typeof label === 'string') {
    const t = P.text(label, { size: 12, weight: 700, color, threshold: 120 });
    ctx.drawImage(t.canvas, x + Math.floor((w - t.width) / 2) + 1, y);
  } else {
    label(x, y);
  }
}

function drawTools(ctx) {
  plaque(ctx, L.INSPECT.x, L.INSPECT.y, L.INSPECT.w, '對照');
  plaque(ctx, L.BOOKLET.x, L.BOOKLET.y, L.BOOKLET.w, '須知');
  plaque(ctx, L.PAGE_PREV.x, L.PAGE_PREV.y, L.PAGE_PREV.w, (x, y) => sprite(ctx, x + 6, y + 4, ['...K', '..KK', '.KKK', 'KKKK', '.KKK', '..KK', '...K'], { K: C.ink }));
  plaque(ctx, L.PAGE_NEXT.x, L.PAGE_NEXT.y, L.PAGE_NEXT.w, (x, y) => sprite(ctx, x + 8, y + 4, ['K...', 'KK..', 'KKK.', 'KKKK', 'KKK.', 'KK..', 'K...'], { K: C.ink }));
  text(ctx, '1/1', L.PAGE_NO.x, L.PAGE_NO.y, { size: 8, color: C.brassLight, threshold: 90 });
  // 喇叭
  sprite(ctx, L.SOUND.x, L.SOUND.y, [
    '.....W........',
    '....WW....W...',
    '...WWW..W..W..',
    'WWWWWW...W.W..',
    'WWWWWW...W.W..',
    'WWWWWW...W.W..',
    'WWWWWW...W.W..',
    '...WWW..W..W..',
    '....WW....W...',
    '.....W........',
  ], { W: C.white });
}

// —— 全幅 ——

export function drawFrame(canvas) {
  canvas.width = L.W;
  canvas.height = L.H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawCourt(ctx);
  // 說話的人頭上的小三角
  sprite(ctx, L.HEADS.witness[0] - 3, L.HEADS.witness[1] - 9, ['WWWWW', '.WWW.', '..W..'], { W: C.white });
  drawBooth(ctx);
  drawDesk(ctx);
  drawTray(ctx);
  drawNotebook(ctx);
  drawEvidence(ctx);
  // 放大鏡停在口供頁底的手寫字上：「地下」兩個字放大了
  drawLoupe(ctx, 376, 240, 'P4', 332, 133);
  drawRack(ctx, L.RACK.shownX, L.RACK.y);
  // 拿在手上的「疑」字印章：影子離紙遠一點，底部對準第三條說法的頁邊
  const held = stamp('doubt');
  P.dither(ctx, 162, 188, 26, 34, C.black);
  ctx.drawImage(held, 158, 182);
  drawTools(ctx);
  return canvas;
}

export const PALETTE = C;
