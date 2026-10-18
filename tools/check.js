// 自動試玩：npm run check
// 先把 Godot 版匯出成網頁（debug 版，腳本錯誤會印到 console），再用本機的 Chrome 打開，
// 用真的滑鼠事件玩第一天；手機尺寸用觸控事件（CDP 的 Input.dispatchTouchEvent）。
// 狀態從 window.__desk.state() 讀；遊戲座標是 480×270，用 state().view 和 canvas 的位置換算成頁面座標。
// 位置一律從狀態拿：細節位置用 hotspots，說法位置用 entryRects，不寫死。
// 截圖放在 build/check/。加 --skip-export 用上一次匯出的版本。
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'build', 'web');
const shots = join(root, 'build', 'check');
const UI = JSON.parse(readFileSync(join(root, 'game', 'data', 'ui.json'), 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
let failed = 0;

function check(name, ok, detail = '') {
  results.push({ name, ok });
  if (!ok) failed += 1;
  console.log(`${ok ? '✔' : '✖'} ${name}${ok || !detail ? '' : `\n    ${detail}`}`);
}

// 一個打開了遊戲的分頁：用滑鼠或觸控，以遊戲座標操作。
class Desk {
  constructor(page, client, touch) {
    this.page = page;
    this.client = client;
    this.touch = touch;
    this.errors = [];
    page.on('pageerror', (e) => this.errors.push(`page error：${e}`));
    page.on('console', (m) => {
      const t = m.text();
      if (m.type() === 'error' || /SCRIPT ERROR|^ERROR:|USER ERROR/.test(t)) this.errors.push(`console：${t.split('\n')[0]}`);
    });
  }

  static async open(browser, url, { width, height, dpr = 1, touch = false }) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    const client = touch ? await context.newCDPSession(page) : null;
    const desk = new Desk(page, client, touch);
    await page.goto(url);
    await page.waitForFunction(() => window.__desk, null, { timeout: 60000 });
    await desk.waitFor((s) => s.modal === 'title', 10000);
    return desk;
  }

  state() {
    return this.page.evaluate(() => window.__desk.state());
  }

  async waitFor(cond, timeout = 8000) {
    const end = Date.now() + timeout;
    let s;
    while (Date.now() < end) {
      s = await this.state();
      if (cond(s)) return s;
      await sleep(40);
    }
    return null;
  }

  // 遊戲座標 → 頁面座標（CSS 像素）。對準那一格的中間。
  async at(gx, gy) {
    const s = await this.state();
    const g = await this.page.evaluate(() => {
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      return { left: r.left, top: r.top, sx: r.width / c.width, sy: r.height / c.height };
    });
    const v = s.view;
    return { x: g.left + (v.x + (gx + 0.5) * v.k) * g.sx, y: g.top + (v.y + (gy + 0.5) * v.k) * g.sy };
  }

  async pointer(type, p) {
    if (!this.touch) {
      await this.page.mouse.move(p.x, p.y);
      if (type === 'down') await this.page.mouse.down();
      if (type === 'up') await this.page.mouse.up();
      return;
    }
    // 手指未按下時沒有「移動」這回事
    if (type === 'move' && !this.touching) return;
    this.touching = type !== 'up';
    const kind = { down: 'touchStart', move: 'touchMove', up: 'touchEnd' }[type];
    await this.client.send('Input.dispatchTouchEvent', { type: kind, touchPoints: type === 'up' ? [] : [{ x: p.x, y: p.y }] });
  }

  async click(gx, gy) {
    const p = await this.at(gx, gy);
    await this.pointer('move', p);
    await this.pointer('down', p);
    await sleep(40);
    await this.pointer('up', p);
    await sleep(60);
  }

  // 由第一點拖到最後一點；hold 是放手前停留的毫秒，during 在停留時執行（例如截圖）。
  async drag(points, { hold = 0, steps = 8, during = null } = {}) {
    const pts = [];
    for (const [gx, gy] of points) pts.push(await this.at(gx, gy));
    await this.pointer('move', pts[0]);
    await this.pointer('down', pts[0]);
    await sleep(30);
    for (let i = 1; i < pts.length; i += 1) {
      for (let k = 1; k <= steps; k += 1) {
        const t = k / steps;
        await this.pointer('move', { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t });
        await sleep(16);
      }
    }
    if (hold) await sleep(hold);
    if (during) await during();
    await this.pointer('up', pts[pts.length - 1]);
    await sleep(80);
  }

  async key(k) {
    await this.page.keyboard.press(k);
    await sleep(30);
  }

  // 一直聽下一句，直到 cond 成立。用空白鍵；觸控時點對白框。
  async advanceUntil(cond, limit = 300) {
    for (let i = 0; i < limit; i += 1) {
      const s = await this.state();
      if (cond(s)) return s;
      if (s.typing || s.waiting) {
        if (this.touch) await this.click(75, 226);
        else await this.key('Space');
      }
      await sleep(this.touch ? 40 : 60);
    }
    return null;
  }

  shot(name) {
    return this.page.screenshot({ path: join(shots, `${name}.png`) });
  }

  // 截圖，檢查畫面每一格都是 k×k 個一樣顏色的實際像素。
  async blocks() {
    const s = await this.state();
    const png = (await this.page.screenshot({ scale: 'device' })).toString('base64');
    return this.page.evaluate(async ({ png, v }) => {
      const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob());
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const ctx = c.getContext('2d');
      ctx.drawImage(bmp, 0, 0);
      const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
      const px = (x, y) => d.slice((y * bmp.width + x) * 4, (y * bmp.width + x) * 4 + 3).join(',');
      const k = v.k;
      let bad = 0;
      let tested = 0;
      for (let gy = 0; gy < 270; gy += 7) {
        for (let gx = 0; gx < 480; gx += 11) {
          const x0 = v.x + gx * k;
          const y0 = v.y + gy * k;
          const first = px(x0, y0);
          for (let j = 0; j < k; j += 1) for (let i = 0; i < k; i += 1) if (px(x0 + i, y0 + j) !== first) bad += 1;
          tested += 1;
        }
      }
      return { bad, tested, width: bmp.width, height: bmp.height };
    }, { png, v: s.view });
  }
}

const entry = (s, claim) => s.entries.find((e) => e.claim === claim);
const rowOf = (s, claim) => s.entryRects.find((e) => e.claim === claim);
const docOf = (s, id) => s.docs.find((d) => d.id === id);
const center = ([x, y, w, h]) => [Math.floor(x + w / 2), Math.floor(y + h / 2)];
const iconCenter = (d) => [d.x + 12, d.y + 9];
const TRAY_DROP = [400, 114];

// 把托盤上的證物拖到桌上，左上角放在 (x, y)。抓住小圖的中間，攤開後手指仍在證物的中間。
async function dragToDesk(desk, id, x, y) {
  const s = await desk.state();
  const d = docOf(s, id);
  const w = s.hotspots[id].w;
  const h = s.hotspots[id].h;
  await desk.drag([iconCenter(d), [x + w / 2, y + h / 2]]);
  return desk.waitFor((t) => docOf(t, id).on_desk && docOf(t, id).form === 'full');
}

// 拿起放大鏡，移到細節的中間，停 0.4 秒。
async function inspectDetail(desk, id, detail, shot) {
  const s = await desk.state();
  const d = docOf(s, id);
  const [hx, hy, hw, hh] = s.hotspots[id].hotspots[detail];
  const target = [d.x + hx + Math.floor(hw / 2), d.y + hy + Math.floor(hh / 2)];
  await desk.drag([[s.loupe.x, s.loupe.y], target], { hold: 400, during: shot ? () => desk.shot(shot) : null });
  return desk.waitFor((t) => t.trial.zoomed[detail] === true, 1500);
}

// 按「對照」，點一個說法，再點一個細節。回傳對照完的狀態。
async function crossCheck(desk, claim, detail) {
  let s = await desk.state();
  if (s.mode !== 'inspect') {
    await desk.click(176, 260);
    s = await desk.waitFor((t) => t.mode === 'inspect');
  }
  const a = s.items.find((i) => i.id === claim);
  const b = s.items.find((i) => i.id === detail);
  if (!a || !b) return { missing: !a ? claim : detail, state: s };
  await desk.click(...center(a.rect));
  await desk.click(...center(b.rect));
  await desk.waitFor((t) => t.busy, 2000);
  const after = await desk.waitFor((t) => !t.busy && t.writing === 0, 6000);
  return { state: after };
}

// 把印章拖到某一句說法上：印章底部的中點（抓住的位置往下 14 點）要落在那一行。
async function stampOn(desk, kind, gx, gy) {
  const s = await desk.state();
  const [sx, sy] = s.stamps[kind];
  await desk.drag([[sx + 13, sy + 17], [gx, gy - 14]]);
  return desk.waitFor((t) => !t.stamp_busy[kind] && t.drag === null, 3000);
}

async function stampClaim(desk, kind, claim) {
  const s = await desk.state();
  const [x, y, w, h] = rowOf(s, claim).row;
  return stampOn(desk, kind, x + Math.floor(w / 2), y + Math.floor(h / 2));
}

async function mainFlow(browser, url) {
  const desk = await Desk.open(browser, url, { width: 1280, height: 720 });
  let s = await desk.state();
  await desk.shot('01-title');
  check('開場：標題頁', s.modal === 'title');

  // 1. 空白鍵推進，三件證物依次進托盤
  await desk.key('Space');
  const order = [];
  s = await desk.advanceUntil((t) => {
    for (const d of t.docs) if (!order.includes(d.id)) order.push(d.id);
    return t.docs.length === 3 && t.docs.every((d) => !d.arriving);
  });
  check('空白鍵推進：三件證物依次進托盤', s && order.join() === 'P1,P2,P4' && s.docs.every((d, i) => d.form === 'icon' && d.x === 364 + i * 28 && d.y === 105), `次序 ${order}`);
  check('三句說法寫進筆記本', s && ['c1', 'c2', 'c3'].every((c) => rowOf(s, c)), JSON.stringify(s?.entryRects));
  await desk.shot('02-tray');

  // 2–4. 證物、放大鏡、對照
  s = await dragToDesk(desk, 'P1', 370, 150);
  check('P1 由托盤拖到桌上，攤開成原大', s && docOf(s, 'P1').x === 370 && docOf(s, 'P1').y === 150, JSON.stringify(s && docOf(s, 'P1')));
  s = await inspectDetail(desk, 'P1', 'P1b', '03-loupe-P1');
  check('放大鏡停在 P1b 0.4 秒：看到門腳的黑痕', !!s);
  let before = entry(await desk.state(), 'c1').notes.length;
  let r = await crossCheck(desk, 'c1', 'P1b');
  check('對照 c1 × P1b：寫一行鉛筆字', r.state && entry(r.state, 'c1').notes.length === before + 1 && entry(r.state, 'c1').notes.at(-1).style === 'thought' && r.state.mode === 'normal', JSON.stringify(r.missing ?? entry(r.state, 'c1')));
  await desk.drag([[370 + 52, 150 + 36], TRAY_DROP]);
  s = await desk.waitFor((t) => docOf(t, 'P1').form === 'icon' && !docOf(t, 'P1').on_desk);
  check('證物拖回托盤：縮回小圖', s && docOf(s, 'P1').x === 364 && docOf(s, 'P1').y === 105);

  s = await desk.state();
  await desk.click(...iconCenter(docOf(s, 'P2')));
  s = await desk.waitFor((t) => docOf(t, 'P2').on_desk && docOf(t, 'P2').form === 'full');
  check('只點一下 P2 的小圖：攤到桌上', !!s);
  s = await inspectDetail(desk, 'P2', 'P2b', '04-loupe-P2');
  check('放大鏡停在 P2b 0.4 秒：看到火石輪和棉芯', !!s);
  before = entry(await desk.state(), 'c2').notes.length;
  r = await crossCheck(desk, 'c2', 'P2b');
  check('對照 c2 × P2b：得到理由 R2，寫一句紅筆字', r.state && r.state.trial.player.reasons.includes('R2') && entry(r.state, 'c2').notes.length === before + 1 && entry(r.state, 'c2').notes.at(-1).style === 'reason', JSON.stringify(r.missing ?? entry(r.state, 'c2')));
  const notesBefore = JSON.stringify((await desk.state()).entries);
  r = await crossCheck(desk, 'c1', 'P2a');
  check('對不上的一對（c1 × P2a）：甚麼都不寫，仍然在對照模式', r.state && JSON.stringify(r.state.entries) === notesBefore && r.state.mode === 'inspect', r.missing ?? r.state?.mode);
  await desk.key('Escape');
  s = await desk.waitFor((t) => t.mode === 'normal');
  check('Esc 退出對照模式', !!s);
  const p2 = docOf(s, 'P2');
  await desk.drag([[p2.x + 42, p2.y + 31], TRAY_DROP]);
  await desk.waitFor((t) => docOf(t, 'P2').form === 'icon');

  s = await dragToDesk(desk, 'P4', 384, 132);
  check('P4 拖到桌上', !!s);
  s = await inspectDetail(desk, 'P4', 'P4b', '05-loupe-P4');
  check('放大鏡停在 P4b 0.4 秒：讀到頁底的手寫字', !!s);
  before = entry(await desk.state(), 'c3').notes.length;
  r = await crossCheck(desk, 'c3', 'P4b');
  check('對照 c3 × P4b：得到理由 R1，寫一句紅筆字', r.state && r.state.trial.player.reasons.includes('R1') && entry(r.state, 'c3').notes.length === before + 1 && entry(r.state, 'c3').notes.at(-1).style === 'reason', JSON.stringify(r.missing ?? entry(r.state, 'c3')));
  await desk.shot('06-notes');

  await desk.click(224, 260);
  s = await desk.waitFor((t) => t.modal === 'booklet');
  await desk.shot('07-booklet');
  check('按「須知」打開《陪審員須知》', !!s);
  await desk.click(240, 135);
  s = await desk.waitFor((t) => t.modal === null);
  check('按一下合上須知', !!s);

  // 5. 蓋章
  s = await desk.advanceUntil((t) => t.stamping === 'cheng' && t.rack.ready);
  check('鄭督察退庭前，印章盤滑出', !!s);
  const history0 = s.trial.player.history.length;
  s = await stampClaim(desk, 'trust', 'c1');
  check('「信」印章拖到 c1：蓋上', s && entry(s, 'c1').imprints.length === 1 && entry(s, 'c1').imprints[0].kind === 'trust' && s.trial.player.stamps.c1 === 'trust');
  s = await stampClaim(desk, 'doubt', 'c1');
  check('同一句改蓋「疑」：舊印劃掉', s && entry(s, 'c1').imprints.length === 2 && entry(s, 'c1').imprints[0].crossed && !entry(s, 'c1').imprints[1].crossed && s.trial.player.stamps.c1 === 'doubt');
  check('證人在台上時改印章：不記錄', s && s.trial.player.history.length === history0, JSON.stringify(s?.trial.player.history));
  await desk.shot('08-stamped');
  const home = s.stamps.trust;
  const imprints = JSON.stringify(s.entries.map((e) => e.imprints.length));
  s = await stampOn(desk, 'trust', 240, 40);
  check('印章放在空白處：彈回原位，不蓋印', s && s.stamps.trust[0] === home[0] && s.stamps.trust[1] === home[1] && JSON.stringify(s.entries.map((e) => e.imprints.length)) === imprints);
  await desk.click(s.rack.x + 26, 134 + 92);
  s = await desk.waitFor((t) => t.caption === UI.blank, 3000);
  check('有說法留空時按「退庭」：提示留空當作未決', !!s);

  s = await desk.advanceUntil((t) => t.stamping === 'chung' && t.rack.ready);
  check('鍾永發退庭前，印章盤再滑出', !!s);
  await desk.click(259, 260);
  s = await desk.waitFor((t) => t.page === 0);
  check('◀ 翻回鄭督察那一頁', !!s);
  const history1 = s.trial.player.history.length;
  s = await stampClaim(desk, 'trust', 'c1');
  check('翻回前一頁改印章：記錄下來', s && s.trial.player.history.length === history1 + 1 && s.trial.player.history.at(-1).claim === 'c1', JSON.stringify(s?.trial.player.history));
  await desk.click(279, 260);
  s = await desk.waitFor((t) => t.page === 1);
  s = await stampClaim(desk, 'doubt', 'g1');
  check('在鍾永發的頁蓋 g1', s && s.trial.player.stamps.g1 === 'doubt');
  await desk.click(s.rack.x + 26, 134 + 92);

  // 6. 完結頁、再玩一次、靜音
  s = await desk.advanceUntil((t) => t.modal === 'end');
  check('第一天完：完結頁', !!s);
  await desk.shot('09-end');
  await desk.click(...center(s.again));
  s = await desk.waitFor((t) => t.modal === 'title' && t.docs.length === 0 && t.trial.heard.length === 0 && t.entries.length === 0);
  check('完結頁按「再玩一次」：回到開場，桌面清空', !!s);
  await desk.key('Space');
  await desk.waitFor((t) => t.modal === null);
  const muted = (await desk.state()).muted;
  await desk.click(470, 9);
  s = await desk.waitFor((t) => t.muted === !muted);
  check('按喇叭：靜音', !!s);
  await desk.key('m');
  s = await desk.waitFor((t) => t.muted === muted);
  check('按 M 鍵：取消靜音', !!s);

  const b = await desk.blocks();
  check('1280×720（1 倍螢幕）：每格 2×2 實際像素', (await desk.state()).view.k === 2 && b.bad === 0, JSON.stringify(b));
  return desk;
}

// 手機橫放，用觸控玩一段：點對白框、拖證物、放大鏡、對照、蓋章。
async function touchFlow(browser, url) {
  const desk = await Desk.open(browser, url, { width: 844, height: 390, dpr: 3, touch: true });
  let s = await desk.state();
  check('844×390（3 倍、觸控）：每格 4 實際像素', s.view.k === 4 && s.view.touch, JSON.stringify(s.view));
  const b = await desk.blocks();
  check('844×390：每格 4×4 個一樣的實際像素', b.bad === 0 && b.width === 2532, JSON.stringify(b));
  await desk.click(240, 135);
  s = await desk.advanceUntil((t) => t.docs.length >= 1 && !t.docs[0].arriving);
  check('觸控：點對白框推進，P1 送到托盤', !!s);
  s = await dragToDesk(desk, 'P1', 370, 150);
  check('觸控：P1 拖到桌上', !!s);
  s = await inspectDetail(desk, 'P1', 'P1b', '10-touch-loupe');
  check('觸控：放大鏡看到 P1b', !!s);
  const r = await crossCheck(desk, 'c1', 'P1b');
  check('觸控：對照 c1 × P1b 寫鉛筆字', r.state && entry(r.state, 'c1').notes.length === 1, r.missing);
  s = await desk.advanceUntil((t) => t.stamping === 'cheng' && t.rack.ready);
  s = await stampClaim(desk, 'doubt', 'c2');
  check('觸控：「疑」印章拖到 c2，蓋上', s && entry(s, 'c2').imprints.length === 1);
  await desk.shot('11-touch');
  return desk;
}

async function sizeCheck(browser, url, opts, expect) {
  const desk = await Desk.open(browser, url, opts);
  const s = await desk.state();
  const scroll = await desk.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await desk.shot(`size-${opts.width}x${opts.height}`);
  return { desk, s, scroll };
}

async function main() {
  if (!process.argv.includes('--skip-export')) {
    mkdirSync(web, { recursive: true });
    execFileSync('godot', ['--headless', '--path', join(root, 'game'), '--export-debug', 'Web', '../build/web/index.html'], { stdio: ['ignore', 'ignore', 'inherit'] });
  }
  rmSync(shots, { recursive: true, force: true });
  mkdirSync(shots, { recursive: true });
  const { server, url } = await serve(web);
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const desks = [];
  try {
    desks.push(await mainFlow(browser, `${url}/`));
    desks.push(await touchFlow(browser, `${url}/`));

    // 7. 尺寸
    let r = await sizeCheck(browser, `${url}/`, { width: 844, height: 340, dpr: 3, touch: true });
    desks.push(r.desk);
    check('844×340（網址列佔去高度）：每格 3.6 實際像素', Math.abs(r.s.view.k - 3.6) < 1e-6, JSON.stringify(r.s.view));
    check('844×340：沒有橫向捲動', r.scroll <= 0);
    r = await sizeCheck(browser, `${url}/`, { width: 390, height: 844, dpr: 3, touch: true });
    desks.push(r.desk);
    check('390×844 直放：出現「把手機橫放」，每格 2', r.s.view.rotate && r.s.view.k === 2, JSON.stringify(r.s.view));
    check('390×844：沒有橫向捲動', r.scroll <= 0);
    for (const d of desks.slice(0, 2)) {
      const scroll = await d.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const v = (await d.state()).view;
      check(`${v.w / v.dpr}×${v.h / v.dpr}：沒有橫向捲動`, scroll <= 0);
    }

    // 8. 錯誤
    const errors = desks.flatMap((d) => d.errors);
    check('整個過程沒有 page error，也沒有腳本錯誤', errors.length === 0, errors.slice(0, 5).join('\n    '));
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`\n自動試玩 ${results.length} 項：${results.length - failed} 過，${failed} 失敗。截圖在 build/check/。`);
  process.exitCode = failed ? 1 : 0;
}

await main();
