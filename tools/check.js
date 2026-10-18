// 自動試玩：npm run check
// 先把 Godot 版匯出成網頁（debug 版，腳本錯誤會印到 console），再用本機的 Chrome 打開，
// 用真的滑鼠事件玩完整一局（五天、評議室、夜晚、結局）；手機尺寸用觸控事件（CDP 的 Input.dispatchTouchEvent）。
// 狀態從 window.__desk.state() 讀；遊戲座標是 480×270，用 state().view 和 canvas 的位置換算成頁面座標。
// 位置一律從狀態拿：細節位置用 hotspots，說法位置用 entryRects，按鈕和選項用各頁回報的位置，不寫死。
// 截圖放在 build/check/。加 --skip-export 用上一次匯出的版本；加 --only=名字 只跑一段（full、oneday、touch、sizes）。
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
const CASE = JSON.parse(readFileSync(join(root, 'game', 'data', 'case.json'), 'utf8'));
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
let failed = 0;

function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok });
  if (!ok) failed += 1;
  console.log(`${ok ? '✔' : '✖'} ${name}${ok || !detail ? '' : `\n    ${detail}`}`);
}

const center = ([x, y, w, h]) => [Math.floor(x + w / 2), Math.floor(y + h / 2)];
const isBallot = (menu) => !!menu && menu.title.startsWith(UI.room.ballot.split('：')[0]);

// 一個打開了遊戲的分頁：用滑鼠或觸控，以遊戲座標操作。
class Game {
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
    const g = new Game(page, client, touch);
    await page.goto(url);
    await page.waitForFunction(() => window.__desk, null, { timeout: 60000 });
    await g.waitFor((s) => s.screen === 'story' && s.story.card, 10000);
    return g;
  }

  state() {
    return this.page.evaluate(() => window.__desk.state());
  }

  async waitFor(cond, timeout = 8000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const s = await this.state();
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
    await sleep(70);
  }

  clickRect(rect) {
    return this.click(...center(rect));
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

  // 聽下一句：觸控時點一下（桌面點左下的對白框，其他頁點畫面上半），否則按空白鍵。
  next(s) {
    if (!this.touch) return this.key('Space');
    return s.screen === 'desk' ? this.click(75, 226) : this.click(240, 120);
  }

  // 揀選項框裡字包含 text 的一項。
  async pick(menu, text) {
    const i = typeof text === 'number' ? text : menu.options.findIndex((o) => o.includes(text));
    if (i < 0) throw new Error(`選項裡沒有「${text}」：${menu.options.join('、')}`);
    await this.clickRect(menu.rows[i]);
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

  // —— 自動玩家：一直玩，直到 until 成立。每頁的決定交給 hooks；沒有寫的用預設做法 ——
  // 預設：聽下一句；證人退庭；評議室直接提請表決，投未決（最後一天投無罪）；夜晚揀第一項；視察現場直接離開。
  async play(until, hooks = {}, limit = 3000) {
    for (let i = 0; i < limit; i += 1) {
      const s = await this.state();
      if (until(s)) return s;
      if (!(await this.step(s, hooks))) await sleep(this.touch ? 40 : 50);
    }
    const s = await this.state();
    throw new Error(`自動玩家停在 ${s.screen}（第 ${s.day} 天）`);
  }

  async step(s, hooks) {
    if (s.screen === 'story') {
      const st = s.story;
      if (st.card) return this.clickRect(st.card).then(() => true);
      if (st.menu) return this.pick(st.menu, hooks.night ? await hooks.night(s) : 0).then(() => true);
      if (st.typing || st.waiting) return this.next(s).then(() => true);
      return false;
    }
    if (s.screen === 'site') {
      if (s.site.looking) return this.clickRect(s.site.leave).then(() => true);
      if (s.site.typing || s.site.waiting) return this.next(s).then(() => true);
      return false;
    }
    if (s.screen === 'room') {
      const r = s.room;
      if (r.menu) {
        if (isBallot(r.menu)) {
          const choice = hooks.ballot ? await hooks.ballot(s) : (s.trial.ext.final ? UI.room.votes.NG : UI.room.votes.U);
          return this.pick(r.menu, choice).then(() => true);
        }
        return this.clickRect(r.menu.cancel ?? r.menu.rows[0]).then(() => true);
      }
      if (r.choosing) {
        await this.clickRect(r.buttons.vote.rect);
        const t = await this.waitFor((x) => x.room?.menu, 3000);
        if (t) await this.clickRect(t.room.menu.rows[0]);
        return true;
      }
      if (r.typing || r.waiting) return this.next(s).then(() => true);
      return false;
    }
    if (s.screen === 'desk') {
      if (s.modal) return this.click(240, 135).then(() => true);
      if (s.menu) return this.clickRect(s.menu.cancel ?? s.menu.rows[0]).then(() => true);
      if (s.stamping && s.rack.ready && !s.slip_busy && !s.drag) {
        if (s.stamp_mode === 'strike') {
          await stampClaim(this, 'struck', strikeTarget(s));
          await this.waitFor((t) => t.stamp_mode !== 'strike' || !t.rack.ready, 3000);
          return true;
        }
        await this.click(s.rack.x + 26, 134 + 92);
        await this.waitFor((t) => !t.stamping || !t.rack.ready, 3000);
        return true;
      }
      if (s.typing || s.waiting) return this.next(s).then(() => true);
      return false;
    }
    return false;
  }
}

// 法官剔除了、還沒蓋「不予採納」的那一句。
const strikeTarget = (s) => Object.keys(s.trial.struck).find((id) => s.trial.player.stamps[id] !== 'struck');
const entry = (s, claim) => s.entries.find((e) => e.claim === claim);
const rowOf = (s, claim) => s.entryRects.find((e) => e.claim === claim);
const docOf = (s, id) => s.docs.find((d) => d.id === id);
const iconCenter = (d) => [d.x + 12, d.y + 9];
const TRAY_DROP = [400, 114];
const seat = (id) => CASE.SEATS.find((x) => x.id === id).call;

// 把托盤上的證物拖到桌上，左上角放在 (x, y)。抓住小圖的中間，攤開後手指仍在證物的中間。
async function dragToDesk(g, id, x, y) {
  const s = await g.state();
  const d = docOf(s, id);
  const { w, h } = s.hotspots[id];
  await g.drag([iconCenter(d), [x + w / 2, y + h / 2]]);
  return g.waitFor((t) => docOf(t, id).on_desk && docOf(t, id).form === 'full');
}

async function dragToTray(g, id) {
  const s = await g.state();
  const d = docOf(s, id);
  await g.drag([[d.x + Math.floor(d.w / 2), d.y + Math.floor(d.h / 2)], TRAY_DROP]);
  return g.waitFor((t) => docOf(t, id).form === 'icon' && !docOf(t, id).on_desk);
}

// 拿起放大鏡，移到細節的中間，停 0.4 秒。
async function inspectDetail(g, id, detail, shot) {
  const s = await g.state();
  const d = docOf(s, id);
  const [hx, hy, hw, hh] = s.hotspots[id].hotspots[detail];
  const target = [d.x + hx + Math.floor(hw / 2), d.y + hy + Math.floor(hh / 2)];
  await g.drag([[s.loupe.x, s.loupe.y], target], { hold: 400, during: shot ? () => g.shot(shot) : null });
  return g.waitFor((t) => t.trial.zoomed[detail] === true, 1500);
}

// 按「對照」，點一個說法，再點一個細節。回傳對照完的狀態。
async function crossCheck(g, claim, detail) {
  let s = await g.state();
  if (s.mode !== 'inspect') {
    await g.click(176, 260);
    s = await g.waitFor((t) => t.mode === 'inspect');
  }
  const a = s.items.find((i) => i.id === claim);
  const b = s.items.find((i) => i.id === detail);
  if (!a || !b) return { missing: !a ? claim : detail, state: s };
  await g.clickRect(a.rect);
  await g.clickRect(b.rect);
  await g.waitFor((t) => t.busy, 2000);
  return { state: await g.waitFor((t) => !t.busy && t.writing === 0, 6000) };
}

// 把印章拖到某一行：印章底部的中點（抓住的位置往下 14 點）要落在那一行。
async function stampOn(g, kind, gx, gy) {
  const s = await g.state();
  const [sx, sy] = s.stamps[kind];
  await g.drag([[sx + 13, sy + 17], [gx, gy - 14]]);
  return g.waitFor((t) => !t.stamp_busy[kind] && t.drag === null, 3000);
}

// 說法不在這一頁，就翻頁去找。
async function stampClaim(g, kind, claim) {
  let s = await g.state();
  for (const button of [259, 279]) {
    for (let i = 0; i < s.pages && !rowOf(s, claim); i += 1) {
      await g.click(button, 260);
      s = await g.state();
    }
  }
  const r = rowOf(s, claim);
  if (!r) return null;
  const [x, y, w, h] = r.row;
  return stampOn(g, kind, x + Math.floor(w / 2), y + Math.floor(h / 2));
}

// 遞紙條：按「紙條」，揀那條問題，等證人答完、印章盤再滑出來。
async function useSlip(g, wid, question) {
  let s = await g.waitFor((t) => t.slip, 3000);
  if (!s) return null;
  await g.clickRect(s.slip);
  s = await g.waitFor((t) => t.menu, 3000);
  await g.pick(s.menu, question);
  await g.waitFor((t) => t.slip_busy, 3000);
  return g.play((t) => t.screen === 'desk' && t.stamping === wid && !t.slip_busy && t.rack.ready);
}

// 評議室：按一個動作，然後逐個選項框揀字包含 picks 的那一項。
async function roomAction(g, kind, picks = []) {
  let s = await g.state();
  await g.clickRect(s.room.buttons[kind].rect);
  for (const text of picks) {
    s = await g.waitFor((t) => t.room?.menu, 3000);
    await g.pick(s.room.menu, typeof text === 'function' ? text(s) : text);
    await sleep(120);
  }
  return g.play((t) => t.screen !== 'room' || t.room.choosing || !!t.room.menu);
}

// —— 完整一局（滑鼠，1280×720）——
async function fullRun(browser, url) {
  const g = await Game.open(browser, url, { width: 1280, height: 720 });
  await g.shot('01-title');
  let s = await g.play((t) => t.screen === 'story' && !t.story.card);
  check('標題：按「打開傳票」開始序幕', s.story.label === UI.places.prologue);
  s = await g.play((t) => t.screen === 'desk');
  check('序幕完：進入第一天的法庭', s.day === 1);

  // 第一天：證物、放大鏡、對照、須知
  const order = [];
  s = await g.play((t) => {
    for (const d of t.docs ?? []) if (!order.includes(d.id)) order.push(d.id);
    return t.screen === 'desk' && t.docs.length === 3 && t.docs.every((d) => !d.arriving);
  });
  check('第一天：三件證物依次進托盤', order.join() === 'P1,P2,P4', order.join());
  s = await dragToDesk(g, 'P1', 370, 150);
  check('P1 由托盤拖到桌上', s && docOf(s, 'P1').x === 370);
  s = await inspectDetail(g, 'P1', 'P1b', '02-loupe-P1');
  check('放大鏡停在 P1b 0.4 秒：看到門腳的黑痕', !!s);
  let r = await crossCheck(g, 'c1', 'P1b');
  check('對照 c1 × P1b：寫一行鉛筆字', r.state && entry(r.state, 'c1').notes.at(-1)?.style === 'thought', r.missing);
  check('證物拖回托盤：縮回小圖', !!(await dragToTray(g, 'P1')));
  s = await g.state();
  await g.click(...iconCenter(docOf(s, 'P2')));
  check('只點一下 P2 的小圖：攤到桌上', !!(await g.waitFor((t) => docOf(t, 'P2').on_desk)));
  await inspectDetail(g, 'P2', 'P2b', '03-loupe-P2');
  r = await crossCheck(g, 'c2', 'P2b');
  check('對照 c2 × P2b：得到理由 R2，寫一句紅筆字', r.state?.trial.player.reasons.includes('R2') && entry(r.state, 'c2').notes.at(-1)?.style === 'reason');
  const notes = JSON.stringify((await g.state()).entries);
  r = await crossCheck(g, 'c1', 'P2a');
  check('對不上的一對：甚麼都不寫，仍然在對照模式', r.state && JSON.stringify(r.state.entries) === notes && r.state.mode === 'inspect');
  await g.key('Escape');
  await dragToTray(g, 'P2');
  await dragToDesk(g, 'P4', 384, 132);
  await inspectDetail(g, 'P4', 'P4b', '04-loupe-P4');
  r = await crossCheck(g, 'c3', 'P4b');
  check('對照 c3 × P4b：得到理由 R1', r.state?.trial.player.reasons.includes('R1'));
  await g.click(224, 260);
  check('「須知」打開《陪審員須知》', !!(await g.waitFor((t) => t.modal === 'booklet')));
  await g.click(240, 135);
  check('按一下合上須知', !!(await g.waitFor((t) => !t.modal)));
  await dragToTray(g, 'P4');

  // 第一天：蓋章、改印章、空白處、留空、紙條
  s = await g.play((t) => t.screen === 'desk' && t.stamping === 'cheng' && t.rack.ready);
  const h0 = s.trial.player.history.length;
  s = await stampClaim(g, 'trust', 'c1');
  check('「信」印章拖到 c1：蓋上', s && entry(s, 'c1').imprints.length === 1);
  s = await stampClaim(g, 'doubt', 'c1');
  check('同一句改蓋「疑」：舊印劃掉；證人在台上，不記錄', s && entry(s, 'c1').imprints[0].crossed && s.trial.player.history.length === h0);
  const home = s.stamps.trust.join();
  s = await stampOn(g, 'trust', 240, 40);
  check('印章放在空白處：彈回原位', s && s.stamps.trust.join() === home);
  await g.click(s.rack.x + 26, 134 + 92);
  check('有說法留空時按「退庭」：提示留空當作未決', !!(await g.waitFor((t) => t.caption === UI.blank, 3000)));
  s = await g.play((t) => t.screen === 'desk' && t.stamping === 'chung' && t.rack.ready);
  s = await useSlip(g, 'chung', '更亭部電視');
  check('紙條：問看更的電視，「插電嘅」寫進筆記本的續頁', s.trial.heard.includes('g4') && !!entry(s, 'g4'));
  check('每天只可以遞一張紙條', !s.slip);
  const h1 = s.trial.player.history.length;
  s = await stampClaim(g, 'trust', 'c1');
  check('翻回前一頁改印章：記錄下來', s && s.trial.player.history.length === h1 + 1);
  await stampClaim(g, 'doubt', 'g1');
  await g.shot('05-stamped');

  // 第一天：評議室
  s = await g.play((t) => t.screen === 'room' && t.room.choosing);
  await g.shot('06-room');
  check('評議室：黑板寫上第一天的說法', s.room.board.length >= 5, JSON.stringify(s.room.board));
  s = await roomAction(g, 'present', [CASE.CARD_NAMES.P4, seat('leung')]);
  check('出示口供的手寫字給主席：他把口供改成「疑」', s.trial.jurors.leung.stamps.c3 === 'doubt');
  s = await roomAction(g, 'ask', [seat('fung')]);
  check('追問馮 Sir：借來燒痕的理由', s.trial.player.reasons.includes('RB'));
  s = await roomAction(g, 'present', [CASE.CARD_NAMES.P1, seat('leung')]);
  s = await g.play((t) => t.screen === 'room' && isBallot(t.room.menu));
  check('三個動作之後，庭警敲門：投票', s.trial.room.actions === 0);
  await g.pick(s.room.menu, UI.room.votes.U);
  await g.play((t) => t.screen === 'room' && t.room.reading);
  await g.shot('07-reading');
  s = await g.play((t) => t.screen === 'story' && t.story.place === 'night');
  check('第一天投未決：沒有五票，到了夜晚', s.trial.lastResult.verdict === null);

  // 第一晚：何太的玉鐲
  s = await g.play((t) => t.screen === 'story' && t.story.menu);
  await g.shot('08-night');
  await g.pick(s.story.menu, '八十元');
  s = await g.play((t) => t.screen === 'story' && t.story.place === 'morning');
  check('第一晚：照市價收下玉鐲；第二天早上', s.trial.ext.flags.jade === 'fair');

  // 第二天：剔除傳聞（紅色印章）
  s = await g.play((t) => t.screen === 'desk' && t.stamp_mode === 'strike' && t.rack.ready);
  check('第二天：法官剔除傳聞，印章盤只放紅色的「不予採納」', s.stamping === 'wat');
  await g.shot('09-strike');
  await stampClaim(g, 'struck', 'h1');
  check('親手在傳聞那一行蓋上「不予採納」', !!(await g.waitFor((t) => t.trial.player.stamps.h1 === 'struck', 3000)));
  s = await g.play((t) => t.screen === 'story' && t.story.menu);
  check('第二天：評議、投票，到了第二晚', s.day === 2);
  await g.pick(s.story.menu, '甚麼都不說');

  // 第三天：剔除口供；驗屍報告；紙條問手鐲；揭發羅生
  s = await g.play((t) => t.screen === 'desk' && t.stamp_mode === 'strike' && t.rack.ready);
  check('第三天：法官剔除口供', s.day === 3 && s.trial.struck.c3);
  await stampClaim(g, 'struck', 'c3');
  check('口供那一行蓋上「不予採納」，證物 P4 也不予接納', !!(await g.waitFor((t) => t.trial.player.stamps.c3 === 'struck' && t.trial.ext.struck_exhibits.P4, 3000)));
  await g.play((t) => t.screen === 'desk' && t.docs.some((d) => d.id === 'P5' && !d.arriving));
  await dragToDesk(g, 'P5', 384, 132);
  check('放大鏡看驗屍報告的附頁：婆婆戴著龍鳳金鐲', !!(await inspectDetail(g, 'P5', 'P5b', '10-loupe-P5')));
  await dragToTray(g, 'P5');
  await g.play((t) => t.screen === 'desk' && t.stamping === 'man' && t.rack.ready);
  s = await useSlip(g, 'man', '金鐲');
  check('紙條問金鐲：遺物清單上沒有首飾', s.trial.heard.includes('f4'));
  s = await g.play((t) => t.screen === 'room' && t.room.choosing);
  check('第三天的黑板：口供那一行擦走了', !s.room.board.includes('c3'));
  await roomAction(g, 'ask', [seat('lam')]);
  s = await roomAction(g, 'ask', [seat('so')]);
  const said = s.trial.room.statements.some((st) => st.id === 'd3-slip');
  check('羅生又說溜了嘴', said);
  if (said && s.screen === 'room' && s.room.choosing) await roomAction(g, 'callout', [CASE.ROOMS['3'].interjections[0].text.slice(0, 6)]);
  s = await g.play((t) => t.screen === 'story' && t.story.menu);
  check('指出羅生的失言：主席寫紙條報告法官', s.trial.ext.exposed.law === 3);
  check('第三晚：認得那隻金鐲，多了「報警」', s.story.menu.options.includes('報警'));
  await g.pick(s.story.menu, '收下');

  // 第四天：羅生解除職務；視察現場；對照燒痕；紙條問第二起火點
  s = await g.play((t) => t.screen === 'site' && t.site.looking);
  check('第四天早上：羅生已被解除職務', !!s.trial.ext.dismissed.law);
  for (const id of ['V1a', 'V1b', 'V1c']) {
    await g.clickRect(s.site.spots[id]);
    await sleep(150);
  }
  check('視察現場：看清楚燒痕、燈座和保安', !!(await g.waitFor((t) => ['V1a', 'V1b', 'V1c'].every((id) => t.trial.zoomed[id]), 3000)));
  await g.shot('11-site');
  await g.clickRect(s.site.leave);
  s = await g.play((t) => t.screen === 'desk' && t.docs.some((d) => d.id === 'V1' && !d.arriving) && t.trial.heard.includes('q1') && !t.typing);
  check('回到法院：視察現場的筆記放進托盤', !!s);
  await dragToDesk(g, 'V1', 384, 140);
  r = await crossCheck(g, 'q1', 'V1a');
  check('對照區主任① × 地下的燒痕：「地下都燒過。」', r.state?.trial.player.reasons.includes('RV'), r.missing);
  await g.key('Escape');
  await dragToTray(g, 'V1');
  await g.play((t) => t.screen === 'desk' && t.stamping === 'au' && t.rack.ready);
  s = await useSlip(g, 'au', '另一個起火點');
  check('紙條問第二起火點：區主任「唔排除」', s.trial.heard.includes('q3'));
  s = await stampClaim(g, 'trust', 'q3');
  check('在「地下另有起火點」蓋「信」', s?.trial.player.stamps.q3 === 'trust');
  s = await g.play((t) => t.screen === 'room' && t.room.choosing);
  await g.shot('12-room-day4');
  check('第四天的評議室：羅生的位子空著', !!s.trial.ext.dismissed.law);
  s = await g.play((t) => t.screen === 'story' && t.story.menu);
  await g.pick(s.story.menu, '不收');

  // 第五天：被告作供；紙條；最後表決
  await g.play((t) => t.screen === 'desk' && t.docs.some((d) => d.id === 'P7' && !d.arriving));
  await dragToDesk(g, 'P7', 384, 140);
  check('放大鏡看外套口袋：燒焦的傳單', !!(await inspectDetail(g, 'P7', 'P7b', '13-loupe-P7')));
  await dragToTray(g, 'P7');
  await g.play((t) => t.screen === 'desk' && t.stamping === 'ho' && t.rack.ready);
  s = await useSlip(g, 'ho', '喺地下做過');
  check('紙條問被告：他承認在地下點過火', s.trial.heard.includes('d4'));
  await stampClaim(g, 'trust', 'd4');
  s = await g.play((t) => t.screen === 'room' && isBallot(t.room.menu));
  check('最後一天的選票：沒有未決，多了縱火', s.trial.ext.final && s.room.menu.options.join() === [UI.room.votes.G, UI.room.votes.NG, UI.room.votes.A].join(), s.room.menu.options.join());
  await g.shot('14-final-ballot');
  s = await g.play((t) => t.screen === 'ending', { ballot: async () => UI.room.votes.A });
  await g.shot('15-ending');
  check(`走到結局：${s.ending.title}`, CASE.ENDINGS.some((e) => e.title === s.ending.title));
  await g.clickRect(s.ending.again);
  check('回顧頁按「再玩一次」：回到傳票', !!(await g.waitFor((t) => t.screen === 'story' && t.story.card, 5000)));
  return g;
}

// —— 一日審判：第一天投有罪；另外試靜音 ——
async function oneDay(browser, url) {
  const g = await Game.open(browser, url, { width: 1280, height: 720 });
  let s = await g.play((t) => t.screen === 'desk');
  const muted = s.muted;
  await g.click(470, 9);
  check('法庭：按喇叭靜音', !!(await g.waitFor((t) => t.muted === !muted)));
  await g.key('m');
  check('按 M 鍵取消靜音', !!(await g.waitFor((t) => t.muted === muted)));
  s = await g.play((t) => t.screen === 'ending', { ballot: async () => UI.room.votes.G });
  check('第一天投有罪：一日審判', s.ending.title === '一日審判' && s.day === 1, s.ending.title);
  await g.shot('16-one-day');
  await g.clickRect(s.ending.again);
  check('再玩一次：回到傳票，桌面清空', !!(await g.waitFor((t) => t.screen === 'story' && t.story.card && t.trial.heard.length === 0, 5000)));
  return g;
}

// —— 手機橫放，用觸控玩一段 ——
async function touchRun(browser, url) {
  const g = await Game.open(browser, url, { width: 844, height: 390, dpr: 3, touch: true });
  let s = await g.state();
  check('844×390（3 倍、觸控）：每格 4 實際像素', s.view.k === 4 && s.view.touch, JSON.stringify(s.view));
  const b = await g.blocks();
  check('844×390：每格 4×4 個一樣的實際像素', b.bad === 0 && b.width === 2532, JSON.stringify(b));
  s = await g.play((t) => t.screen === 'desk' && t.docs.length >= 1 && !t.docs[0].arriving);
  check('觸控：點傳票、點畫面聽序幕，P1 送到托盤', !!s);
  check('觸控：P1 拖到桌上', !!(await dragToDesk(g, 'P1', 370, 150)));
  check('觸控：放大鏡看到 P1b', !!(await inspectDetail(g, 'P1', 'P1b', '20-touch-loupe')));
  const r = await crossCheck(g, 'c1', 'P1b');
  check('觸控：對照 c1 × P1b 寫鉛筆字', r.state && entry(r.state, 'c1').notes.length === 1, r.missing);
  await g.play((t) => t.screen === 'desk' && t.stamping === 'cheng' && t.rack.ready);
  s = await stampClaim(g, 'doubt', 'c2');
  check('觸控：「疑」印章拖到 c2', s && entry(s, 'c2').imprints.length === 1);
  await g.play((t) => t.screen === 'room' && t.room.choosing);
  await g.shot('21-touch-room');
  check('觸控：評議室投票，到了夜晚', !!(await g.play((t) => t.screen === 'story' && t.story.place === 'night')));
  return g;
}

async function sizes(browser, url, games) {
  if (games[0]) {
    const b = await games[0].blocks();
    check('1280×720（1 倍螢幕）：每格 2×2 實際像素', (await games[0].state()).view.k === 2 && b.bad === 0, JSON.stringify(b));
  }
  for (const [opts, label, test] of [
    [{ width: 844, height: 340, dpr: 3, touch: true }, '每格 3.6 實際像素', (v) => Math.abs(v.k - 3.6) < 1e-6],
    [{ width: 390, height: 844, dpr: 3, touch: true }, '直放：出現「把手機橫放」，每格 2', (v) => v.rotate && v.k === 2],
  ]) {
    const g = await Game.open(browser, url, opts);
    games.push(g);
    const v = (await g.state()).view;
    check(`${opts.width}×${opts.height}：${label}`, test(v), JSON.stringify(v));
    await g.shot(`size-${opts.width}x${opts.height}`);
  }
  for (const g of games) {
    const scroll = await g.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const v = (await g.state()).view;
    check(`${v.w / v.dpr}×${v.h / v.dpr}：沒有橫向捲動`, scroll <= 0);
  }
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
  const games = [];
  try {
    for (const [name, fn] of [['full', fullRun], ['oneday', oneDay], ['touch', touchRun]]) {
      if (only && only !== name) continue;
      try {
        games.push(await fn(browser, `${url}/`));
      } catch (e) {
        check(`${name}：玩到最後`, false, String(e).split('\n')[0]);
      }
    }
    if (!only || only === 'sizes') await sizes(browser, `${url}/`, games);
    const errors = games.flatMap((g) => g.errors);
    check('整個過程沒有 page error，也沒有腳本錯誤', errors.length === 0, errors.slice(0, 5).join('\n    '));
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`\n自動試玩 ${results.length} 項：${results.length - failed} 過，${failed} 失敗。截圖在 build/check/。`);
  process.exitCode = failed ? 1 : 0;
}

await main();
