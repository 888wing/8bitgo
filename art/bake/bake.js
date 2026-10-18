// 美術輸出（在瀏覽器裡執行）：把 art/src 的程式畫法畫成 PNG，交給 Godot 版。
// 由 tools/bake.js 打開這一頁，再呼叫 window.bake()。字要用瀏覽器的字型畫，所以這一步不能在 Node 做。
import * as P from '../src/pixels.js';
import { PAL } from '../src/palette.js';
import { TEXTURES } from '../src/placeholder.js';
import { EVIDENCE, EVIDENCE_TEXT } from '../src/evidence.js';
import { FRAME_TEXT, drawFrame } from '../style-frame/frame.js';
import { SHEET_TEXT, drawSheet } from '../style-frame/sheet.js';

// 遊戲裡即場排的字：每種字款輸出一張點陣字表。數值跟網頁版桌面切片（commit 3a3a819 的 court.js）一樣。
export const GLYPH_STYLES = {
  dialogue: { font: 'print', size: 13, weight: 500, threshold: 110 },
  name: { font: 'print', size: 12, weight: 400, threshold: 120 },
  hand: { font: 'hand', size: 12, weight: 700, threshold: 110 },
  body: { font: 'print', size: 12, weight: 500, threshold: 110 },
  bold: { font: 'print', size: 12, weight: 700, threshold: 120 },
  // 大字只用在一兩句，只輸出那幾句的字
  title: { font: 'print', size: 24, weight: 700, threshold: 120, only: (ui) => ui.title },
  heading: { font: 'print', size: 16, weight: 700, threshold: 120, only: (ui) => ui.end.title },
  small: { font: 'print', size: 8, weight: 400, threshold: 90 },
};

const PAD = 2; // 每個字的格子四邊多留的位置：有些字會伸出字身少少
const PHASES = 4; // 瀏覽器把字放在最接近的 1/4 像素；每個字按這四個位置各畫一次
const ATLAS_W = 2048;

// 字表樣本：用整句畫（舊做法），讓 Godot 的測試對照逐個字拼出來的結果。
const SAMPLES = [
  ['dialogue', '凌晨兩點十分，消防接報。火好快就燒到四樓。', 124, 16],
  ['dialogue', '我哋喺起火點搵到一個打火機，上面刻住個「樂」字。', 124, 16],
  ['name', '偵緝督察鄭志雄（控方）', 0, 14],
  ['hand', '打火機在起火點找到，刻著「樂」字', 134, 14],
  ['hand', '火石平、棉芯乾，點著？', 132, 13],
  ['body', '證物 P2：打火機', 300, 14],
  ['body', '你發現了 2 個細節，寫了 3 句批註，蓋了 6 個印。', 396, 15],
  ['bold', '再玩一次', 0, 15],
  ['title', '第七席', 0, 28],
  ['heading', '手感切片完', 0, 20],
  ['small', '1/2', 0, 11],
];

function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');

async function loadFonts(text) {
  const faces = ['400 12px "Noto Sans TC"', '500 12px "Noto Sans TC"', '700 12px "Noto Sans TC"', '700 12px "LXGW WenKai TC"'];
  const results = await Promise.all(faces.map((f) => document.fonts.load(f, text)));
  const missing = faces.filter((_, i) => !results[i].length);
  if (missing.length) throw new Error(`字型載入不到：${missing.join('、')}（要連網）`);
  await document.fonts.ready;
}

// 一種字款的點陣字表：每個字一組四格（字放在 0、¼、½、¾ 像素的位置），記下位置和字寬（小數）。
// Godot 排字時把每個字的位置取到最接近的 ¼ 像素，再用對應的一格，結果跟瀏覽器整句畫的逐點相同。
function atlas(style, chars) {
  const font = `${style.weight} ${style.size}px ${P.FONTS[style.font]}`;
  const measure = P.canvas(1, 1).ctx;
  measure.font = font;
  const advances = chars.map((ch) => measure.measureText(ch).width);
  const cellW = Math.ceil(Math.max(...advances)) + PAD * 2 + 1;
  const cellH = Math.ceil(style.size * 1.5) + PAD * 2;
  const cols = Math.floor(ATLAS_W / (cellW * PHASES));
  const rows = Math.ceil(chars.length / cols);
  const { c, ctx } = P.canvas(cols * cellW * PHASES, rows * cellH);
  const glyphs = {};
  chars.forEach((ch, i) => {
    const x = (i % cols) * cellW * PHASES;
    const y = Math.floor(i / cols) * cellH;
    for (let k = 0; k < PHASES; k += 1) {
      const cell = P.canvas(cellW, cellH);
      cell.ctx.font = font;
      cell.ctx.textBaseline = 'top';
      cell.ctx.fillStyle = '#000';
      cell.ctx.fillText(ch, PAD + k / PHASES, PAD);
      const img = cell.ctx.getImageData(0, 0, cellW, cellH);
      for (let n = 0; n < img.data.length; n += 4) {
        const on = img.data[n + 3] >= style.threshold;
        img.data[n] = 255;
        img.data[n + 1] = 255;
        img.data[n + 2] = 255;
        img.data[n + 3] = on ? 255 : 0;
      }
      ctx.putImageData(img, x + k * cellW, y);
    }
    glyphs[ch] = [x, y, advances[i]];
  });
  return { canvas: c, meta: { ...style, pad: PAD, phases: PHASES, cell: [cellW, cellH], glyphs } };
}

function scaled(src, k) {
  const { c, ctx } = P.canvas(src.width * k, src.height * k);
  ctx.drawImage(src, 0, 0, src.width * k, src.height * k);
  return c;
}

// 只用 32 色，而且每一點不是全透明就是全不透明。
const PAL_SET = new Set(Object.values(PAL).map((h) => parseInt(h.slice(1), 16)));
function offPalette(canvas, white = false) {
  const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let bad = 0;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a === 0) continue;
    const rgb = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    if (a !== 255 || !(PAL_SET.has(rgb) || (white && rgb === 0xffffff))) bad += 1;
  }
  return bad;
}

// 跟 repo 裡現有的檔案逐點比較：一樣的話不用重寫，免得 git 出現只是編碼不同的改動。
async function diffWithExisting(path, canvas) {
  const res = await fetch(`/${path}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const bmp = await createImageBitmap(await res.blob());
  if (bmp.width !== canvas.width || bmp.height !== canvas.height) return -1;
  const old = P.canvas(bmp.width, bmp.height);
  old.ctx.drawImage(bmp, 0, 0);
  const a = old.ctx.getImageData(0, 0, bmp.width, bmp.height).data;
  const b = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let diff = 0;
  for (let i = 0; i < a.length; i += 4) {
    // 全透明的點只比較透明度：顏色看不見
    if (a[i + 3] === 0 && b[i + 3] === 0) continue;
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) diff += 1;
  }
  return diff;
}

window.bake = async () => {
  const [caseData, ui] = await Promise.all(['case', 'ui'].map((n) => fetch(`/game/data/${n}.json`, { cache: 'no-store' }).then((r) => r.json())));
  const labels = TEXTURES.map(([path]) => path).join('');
  const used = [...strings(caseData), ...strings(ui), ...SAMPLES.map((s) => s[1])].join('');
  const chars = [...new Set([...ascii, ...'0123456789/', ...used])].sort();
  await loadFonts([...new Set([...chars, ...EVIDENCE_TEXT.join(''), ...FRAME_TEXT, ...SHEET_TEXT, ...labels, '信疑證物對照須知退庭'])].join(''));

  const images = []; // [路徑, canvas, 可以有白色]
  const json = {};
  for (const [path, draw] of TEXTURES) images.push([`game/art/${path}`, draw()]);
  const evidence = {};
  for (const [id, e] of Object.entries(EVIDENCE)) {
    images.push([`game/art/evidence/${id}.png`, e.draw(1)]);
    images.push([`game/art/evidence/${id}-zoom.png`, e.draw(2)]);
    images.push([`game/art/evidence/${id}-icon.png`, e.icon()]);
    evidence[id] = { name: e.name, w: e.w, h: e.h, hotspots: e.hotspots };
  }
  json['game/art/evidence/evidence.json'] = evidence;
  json['game/art/palette.json'] = PAL;
  for (const [name, { only, ...style }] of Object.entries(GLYPH_STYLES)) {
    const a = atlas(style, only ? [...new Set([...only(ui), ...'0123456789/'])].sort() : chars);
    images.push([`game/art/fonts/${name}.png`, a.canvas, true]);
    json[`game/art/fonts/${name}.json`] = a.meta;
  }
  const samples = SAMPLES.map(([style, text, width, lineHeight], i) => {
    const { only, ...s } = GLYPH_STYLES[style];
    const t = P.text(text, { ...s, color: PAL.white, width, lineHeight });
    const file = `${String(i).padStart(2, '0')}-${style}.png`;
    images.push([`game/tests/fixtures/text/${file}`, t.canvas]);
    return { file, style, text, width, lineHeight };
  });
  json['game/tests/fixtures/text/samples.json'] = samples;

  const frame = drawFrame(document.createElement('canvas'));
  const sheet = drawSheet(document.createElement('canvas'));
  images.push(['art/style-frame/court-desk.png', frame], ['art/style-frame/court-desk@4x.png', scaled(frame, 4)]);
  images.push(['art/style-frame/evidence.png', sheet], ['art/style-frame/evidence@4x.png', scaled(sheet, 4)]);

  const files = [];
  for (const [path, canvas, white] of images) {
    const diff = await diffWithExisting(path, canvas);
    files.push({
      path, w: canvas.width, h: canvas.height, diff, offPalette: offPalette(canvas, white),
      png: diff === 0 ? null : canvas.toDataURL('image/png'),
    });
  }
  return { files, json, chars: chars.length };
};
window.bakeReady = true;
