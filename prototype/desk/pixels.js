// 像素畫的基本工具：在小畫布上逐點作畫，文字也壓成全有或全無的點陣。

export const FONTS = {
  print: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
  hand: '"LXGW WenKai TC", "Kaiti TC", "BiauKai", serif',
};

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function px(ctx, x, y, color) {
  rect(ctx, x, y, 1, 1, color);
}

// 一像素粗的直線（Bresenham），不會有半透明的邊。linePoints 給要逐點畫出來的動畫用。
export function linePoints(x0, y0, x1, y1) {
  let [x, y] = [Math.round(x0), Math.round(y0)];
  const [tx, ty] = [Math.round(x1), Math.round(y1)];
  const dx = Math.abs(tx - x);
  const dy = -Math.abs(ty - y);
  const sx = x < tx ? 1 : -1;
  const sy = y < ty ? 1 : -1;
  let err = dx + dy;
  const points = [];
  for (;;) {
    points.push([x, y]);
    if (x === tx && y === ty) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return points;
}

export function line(ctx, x0, y0, x1, y1, color) {
  for (const [x, y] of linePoints(x0, y0, x1, y1)) px(ctx, x, y, color);
}

export function frame(ctx, x, y, w, h, color) {
  rect(ctx, x, y, w, 1, color);
  rect(ctx, x, y + h - 1, w, 1, color);
  rect(ctx, x, y, 1, h, color);
  rect(ctx, x + w - 1, y, 1, h, color);
}

export function ellipse(ctx, cx, cy, rx, ry, color) {
  for (let y = -ry; y <= ry; y += 1) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    rect(ctx, cx - half, cy + y, half * 2 + 1, 1, color);
  }
}

export function ring(ctx, cx, cy, r, color, width = 1) {
  for (let y = -r; y <= r; y += 1) {
    for (let x = -r; x <= r; x += 1) {
      const d = Math.sqrt(x * x + y * y);
      if (d <= r + 0.5 && d > r - width + 0.5 - 1) px(ctx, cx + x, cy + y, color);
    }
  }
}

// 棋盤格網點：像素畫的半色調。
export function dither(ctx, x, y, w, h, color, phase = 0) {
  for (let j = 0; j < h; j += 1) {
    for (let i = 0; i < w; i += 1) if ((i + j + phase) % 2 === 0) px(ctx, x + i, y + j, color);
  }
}

// 把漢字按寬度斷行；句號、逗號、引號收尾的字不會落在行首。
const CLOSERS = '，。、；：？！」』）》…';
export function wrap(ctx, text, width) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let current = '';
    for (const ch of para) {
      const next = current + ch;
      if (current && ctx.measureText(next).width > width && !CLOSERS.includes(ch)) {
        lines.push(current);
        current = ch;
      } else {
        current = next;
      }
    }
    lines.push(current);
  }
  return lines;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// 文字：先用網頁字型畫，再把每一點壓成全有或全無，得到點陣字的邊緣。
// widths 是每一行的寬度，筆記本逐行把字露出來時要用。
export function text(str, { size = 12, font = 'print', color = '#1d2733', width = 0, lineHeight = 0, weight = 400, threshold = 120 } = {}) {
  const lh = lineHeight || size + 3;
  const measure = canvas(1, 1).ctx;
  measure.font = `${weight} ${size}px ${FONTS[font]}`;
  const lines = width ? wrap(measure, str, width) : String(str).split('\n');
  const widths = lines.map((l) => Math.ceil(measure.measureText(l).width) + 1);
  const w = Math.max(width, 1, ...widths);
  const { c, ctx } = canvas(w + 2, lines.length * lh);
  ctx.font = measure.font;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000';
  lines.forEach((l, i) => ctx.fillText(l, 0, i * lh + Math.floor((lh - size) / 2)));
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const [r, g, b] = hexToRgb(color);
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] >= threshold) {
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    } else {
      img.data[i + 3] = 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { canvas: c, lines, widths, lineHeight: lh, width: c.width, height: c.height };
}
