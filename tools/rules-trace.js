// 規則引擎的對照軌跡：用固定種子的亂數玩幾十局，記下每個呼叫的函數名、參數、回傳值，
// 以及呼叫之後狀態的變化。game/tests/test_rules_trace.gd 在 GDScript 版重播同樣的呼叫，逐項比對。
// 重新產生：node tools/rules-trace.js（寫入 game/tests/fixtures/rules_trace.json；內容固定，連跑兩次一樣）
//
// 軌跡裡的函數名是 JS 的名字。'$day' 不是引擎函數，是直接改 game.day（測試也是這樣換天）。
// 狀態不是每步整份寫：init 是 createGame 之後的整份，之後每步的 patch 只寫和上一步不同的部分。
// patch 逐層比物件：有變的鍵才寫，刪掉的鍵寫 null；陣列和單一值整個換掉。final 是整局結束時的整份，用來驗證 patch 還原。
// 引擎改了行為（或 case.js 改了內容），就重新產生，再跑 GDScript 測試看兩邊還一不一樣。
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../prototype/engine.js';
import { AI_IDS, CARD_NAMES, CLAIMS, DAYS, EXHIBITS, LINKS, REASONS, SEATS, THOUGHTS, WITNESSES } from '../prototype/case.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'game', 'tests', 'fixtures', 'rules_trace.json');
const GAMES = 40;

const CLAIM_IDS = Object.keys(CLAIMS);
const EXHIBIT_IDS = Object.keys(EXHIBITS);
const DETAIL_IDS = EXHIBIT_IDS.flatMap((x) => EXHIBITS[x].details.map((d) => d.id));
const CARDS = Object.keys(CARD_NAMES);
const WHO = ['you', ...AI_IDS];
const ALL_PAIRS = [...Object.values(REASONS).flatMap((r) => r.pairs ?? []), ...THOUGHTS.map((t) => t.pair)];

// 每局的 createGame 參數：沒有參數、空物件、種子 0（當作 1）、超出 32 位元的種子、負數，其餘是散開的整數。
const GAME_OPTS = [undefined, {}, { seed: 0 }, { seed: 4294967295 }, { seed: 4294967301 }, { seed: -3 }, { seed: 7 }, { seed: 3 }, { seed: 42 }];
for (let i = GAME_OPTS.length; i < GAMES; i += 1) GAME_OPTS.push({ seed: Math.floor((i * 2654435761) % 4294967296) });

// 策略自己的亂數，和引擎的 game.rng 無關。
function mulberry(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    chance: (p) => next() < p,
    int: (n) => Math.floor(next() * n),
    pick: (list) => list[Math.floor(next() * list.length)],
  };
}

const clone = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function diff(a, b) {
  if (isObject(a) && isObject(b)) {
    const out = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in b)) out[k] = null;
      else if (!(k in a)) out[k] = b[k];
      else {
        const d = diff(a[k], b[k]);
        if (d !== undefined) out[k] = d;
      }
    }
    return Object.keys(out).length ? out : undefined;
  }
  return JSON.stringify(a) === JSON.stringify(b) ? undefined : b;
}

const used = new Map();
const events = new Map();
const count = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

class Trace {
  constructor(opts) {
    this.opts = opts;
    this.game = opts === undefined ? E.createGame() : E.createGame(opts);
    count(used, 'createGame');
    this.init = clone(this.game);
    this.prev = this.init;
    this.calls = [];
  }

  log(fn, args, ret) {
    const state = clone(this.game);
    const patch = diff(this.prev, state);
    this.prev = state;
    const entry = { fn, args: clone(args), ret: clone(ret) };
    if (patch !== undefined) entry.patch = patch;
    this.calls.push(entry);
    count(used, fn);
    if (Array.isArray(ret)) {
      for (const e of ret) if (e && e.type) count(events, e.cause ? `${e.type}:${e.cause}` : e.type);
    } else if (ret && ret.verdict !== undefined) count(events, `verdict:${ret.verdict}`);
    else if (ret && ret.kind) count(events, `${fn}:${ret.kind}`);
  }

  call(fn, ...args) {
    const ret = E[fn](this.game, ...args);
    this.log(fn, args, ret);
    return ret;
  }

  pure(fn, ...args) {
    const ret = E[fn](...args);
    this.log(fn, args, ret);
    return ret;
  }

  setDay(day) {
    this.game.day = day;
    this.log('$day', [day], null);
  }
}

// —— 策略 ——

function stamp(t, r, id, value) {
  if (r.chance(0.3)) t.call('setPlayerStamp', id, value, { record: false });
  else t.call('setPlayerStamp', id, value);
}

function pickPair(r) {
  if (r.chance(0.55)) {
    const [a, b] = r.pick(ALL_PAIRS);
    return r.chance(0.5) ? [a, b] : [b, a];
  }
  const kind = r.int(3);
  if (kind === 0) return [r.pick(CLAIM_IDS), r.pick(DETAIL_IDS)];
  if (kind === 1) return [r.pick(DETAIL_IDS), r.pick(CLAIM_IDS)];
  return [r.pick(CLAIM_IDS), r.pick(CLAIM_IDS)];
}

// 沒有狀態依賴的查詢：隨機挑幾個。
function queries(t, r) {
  const who = () => r.pick(WHO);
  for (let i = r.int(4); i > 0; i -= 1) {
    switch (r.int(10)) {
      case 0: t.call('effective', who(), r.pick(CLAIM_IDS)); break;
      case 1: t.call('linkStatus', who(), r.pick(LINKS).id); break;
      case 2: t.call('linkStatuses', who()); break;
      case 3: t.call('beliefOf', who()); break;
      case 4: t.call('aiVote', r.pick(AI_IDS)); break;
      case 5: t.call('boardCell', who(), r.pick(CLAIM_IDS)); break;
      case 6: t.call('clockLabel'); break;
      case 7: t.call('cards'); break;
      case 8: t.call('doubtedClaims'); break;
      default: t.call('conscience'); break;
    }
  }
}

// 法庭上和評議室裡玩家隨時會做的小動作。
function sideAction(t, r) {
  const g = t.game;
  switch (r.int(8)) {
    case 0: case 1: {
      const id = g.heard.length && r.chance(0.85) ? r.pick(g.heard) : r.pick(CLAIM_IDS);
      stamp(t, r, id, r.pick(['trust', 'trust', 'doubt', 'doubt', 'struck', null]));
      break;
    }
    case 2: {
      const ex = g.exhibits.length && r.chance(0.85) ? r.pick(g.exhibits) : r.pick(EXHIBIT_IDS);
      if (r.chance(0.5)) t.call('canZoom', ex);
      t.call('zoom', ex);
      if (r.chance(0.4)) t.call('visibleDetails', ex);
      break;
    }
    case 3: t.call('revealDetail', r.pick([...DETAIL_IDS, 'zz'])); break;
    case 4: t.call('crossCheck', ...pickPair(r)); break;
    case 5: t.call('stampHistory', r.pick(CLAIM_IDS)); break;
    default: queries(t, r); break;
  }
}

// 證人退庭前在印章盤上蓋章（不算改主意），退庭後偶爾改主意。
function stampWitness(t, r, p, wid) {
  for (const id of WITNESSES[wid].claims) {
    if (!t.game.heard.includes(id)) continue;
    const value = r.chance(0.15) ? null : r.chance(p.skeptic) ? 'doubt' : 'trust';
    if (r.chance(0.7)) t.call('setPlayerStamp', id, value, { record: false });
    else t.call('setPlayerStamp', id, value);
    if (r.chance(0.25)) t.call('setPlayerStamp', id, r.pick(['trust', 'doubt', null]));
  }
}

function court(t, r, p, day) {
  const g = t.game;
  for (const wid of DAYS[day - 1].witnesses) {
    for (const beat of WITNESSES[wid].script) {
      if (beat.claim) {
        t.call('hearClaim', beat.claim);
        if (r.chance(0.08)) t.call('hearClaim', beat.claim);
      }
      if (beat.exhibit) {
        t.call('addExhibit', beat.exhibit);
        if (r.chance(0.1)) t.call('addExhibit', beat.exhibit);
      }
      if (beat.strike) {
        t.call('strikeClaim', beat.strike);
        if (r.chance(0.85)) t.call('setPlayerStamp', beat.strike, 'struck');
      }
      if (beat.rule) {
        t.call('addRule', beat.rule);
        if (r.chance(0.3)) t.call('addRule', r.pick(g.rules));
      }
      if (r.chance(0.2)) sideAction(t, r);
    }
    stampWitness(t, r, p, wid);
  }
  if (r.chance(0.1)) t.call('strikeClaim', r.pick(CLAIM_IDS));
  // 用功的玩家：放大、對照出筆記上的理由。
  for (const reason of Object.values(REASONS)) {
    if (!reason.pairs || !r.chance(p.diligence)) continue;
    const [a, b] = r.pick(reason.pairs);
    const detail = [a, b].find((x) => DETAIL_IDS.includes(x));
    const ex = EXHIBIT_IDS.find((e) => EXHIBITS[e].details.some((d) => d.id === detail));
    if (ex && r.chance(0.5)) t.call('zoom', ex);
    else if (detail) t.call('revealDetail', detail);
    t.call('crossCheck', ...(r.chance(0.5) ? [a, b] : [b, a]));
    if (r.chance(0.2)) t.call('crossCheck', a, b);
  }
  if (r.chance(p.diligence)) t.call('crossCheck', 'c1', 'P1b');
}

function roomAction(t, r, p) {
  const roll = r.next();
  if (roll < 0.42) {
    const mine = t.call('cards').map((c) => c.card);
    let card = mine.length && r.chance(0.85) ? r.pick(mine) : r.pick(CARDS);
    if (mine.includes('D1') && r.chance(0.35)) card = 'D1';
    t.call('present', card, r.chance(0.5) ? p.focus : r.pick(AI_IDS));
  } else if (roll < 0.66) {
    t.call('ask', r.pick(AI_IDS));
  } else if (roll < 0.9) {
    const statements = t.game.room ? t.game.room.statements : [];
    const improper = statements.filter((s) => s.improper && s.active).map((s) => s.id);
    let id;
    if (improper.length && r.chance(0.55)) id = r.pick(improper);
    else if (statements.length && r.chance(0.6)) id = r.pick(statements).id;
    else id = r.pick(['nope', 'd1-wong', 'd2-so', 'd2-slip']);
    t.call('callOut', id);
  } else if (roll < 0.94) {
    t.call('callVote');
  } else {
    sideAction(t, r);
  }
}

// 第二天評議室的固定開場：隨機玩很少走到「被別人的話拉住」「跟大隊」這些路。
const SCRIPTS = [
  [['present', 'D1', 'leung'], ['present', 'D1', 'leung'], ['callOut', 'd2-slip']],
  [['present', 'D1', 'leung'], ['callOut', 'd2-slip'], ['present', 'D1', 'lam']],
  [['present', 'D1', 'wong'], ['present', 'D1', 'so'], ['present', 'D1', 'fung']],
  [['ask', 'fung'], ['present', 'P1', 'leung'], ['present', 'P2', 'wong']],
  [['callOut', 'd2-so'], ['present', 'D1', 'so'], ['present', 'P3', 'wong']],
  [['present', 'P4', 'leung'], ['present', 'D1', 'leung'], ['ask', 'law']],
  [['ask', 'wong'], ['present', 'P3', 'wong'], ['present', 'P3', 'so']],
];

function room(t, r, p, day) {
  if (r.chance(0.05)) {
    // 評議室還沒開：這些呼叫都不該有任何作用。
    t.call('present', 'D1', 'leung');
    t.call('ask', 'fung');
    t.call('callOut', 'd2-so');
    t.call('callVote');
    t.call('clockLabel');
  }
  if (r.chance(0.05)) return;
  t.call('startRoom');
  if (r.chance(0.04)) t.call('startRoom');
  queries(t, r);
  if (day === 2 && p.script) {
    for (const [fn, ...args] of p.script) {
      t.call(fn, ...args);
      if (r.chance(0.4)) queries(t, r);
    }
  }
  for (let n = 2 + r.int(6); n > 0; n -= 1) {
    roomAction(t, r, p);
    if (r.chance(0.4)) queries(t, r);
  }
}

function ballot(t, r) {
  t.call('vote', r.pick(['G', 'NG', 'U']));
  if (r.chance(0.1)) t.call('vote', r.pick(['G', 'NG', 'U']));
  if (r.chance(0.6)) t.call('conscience');
}

// 整局結束時把所有查詢掃一遍；full 的連每個格子都查。
function sweep(t, full) {
  for (const who of WHO) {
    t.call('linkStatuses', who);
    t.call('beliefOf', who);
    if (!full) continue;
    for (const l of LINKS) t.call('linkStatus', who, l.id);
    for (const id of CLAIM_IDS) {
      t.call('effective', who, id);
      t.call('boardCell', who, id);
    }
  }
  for (const id of AI_IDS) t.call('aiVote', id);
  if (full) {
    for (const id of EXHIBIT_IDS) {
      t.call('canZoom', id);
      t.call('visibleDetails', id);
    }
    for (const id of CLAIM_IDS) t.call('stampHistory', id);
  }
  t.call('doubtedClaims');
  t.call('cards');
  t.call('conscience');
  t.call('clockLabel');
}

function playGame(index) {
  const r = mulberry(0x5eed + index * 7919);
  const t = new Trace(GAME_OPTS[index]);
  const p = { skeptic: r.next(), diligence: r.next(), focus: r.pick(AI_IDS) };
  let days = r.chance(0.1) ? 1 : 2;
  if (index % 3 === 1) {
    p.script = SCRIPTS[Math.floor(index / 3) % SCRIPTS.length];
    p.skeptic = 0.75 + r.next() * 0.25;
    p.diligence = 0.9 + r.next() * 0.1;
    days = 2;
  }
  if (index % 8 === 0) {
    for (const s of SEATS) {
      t.pure('seatOf', s.id);
      t.pure('callOf', s.id);
    }
    t.pure('seatOf', 'nobody');
    t.pure('callOf', 'nobody');
  }
  for (let day = 1; day <= days; day += 1) {
    if (day > 1) t.setDay(day);
    court(t, r, p, day);
    sweep(t, false);
    room(t, r, p, day);
    ballot(t, r);
  }
  sweep(t, index % 5 === 0);
  return { name: `局 ${index + 1}`, opts: GAME_OPTS[index] === undefined ? null : GAME_OPTS[index], init: t.init, calls: t.calls, final: clone(t.game) };
}

const games = [];
for (let i = 0; i < GAMES; i += 1) games.push(playGame(i));

const missing = Object.keys(E).filter((k) => !used.has(k));
if (missing.length) throw new Error(`軌跡沒有用到這些引擎函數：${missing.join('、')}`);

// 一個呼叫一行，方便看，也方便 diff。
const lines = games.map((g) => {
  const { calls, ...head } = g;
  const body = JSON.stringify(head).slice(0, -1);
  return `${body},"calls":[\n${calls.map((c) => JSON.stringify(c)).join(',\n')}\n]}`;
});
const text = `{"version":1,"games":[\n${lines.join(',\n')}\n]}\n`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, text);

const total = games.reduce((n, g) => n + g.calls.length, 0);
console.log(`${games.length} 局、${total} 個呼叫、${(text.length / 1024).toFixed(0)} KB（字元）→ ${OUT}`);
console.log([...used].sort().map(([k, v]) => `${k}:${v}`).join(' '));
console.log([...events].sort().map(([k, v]) => `${k}:${v}`).join(' '));
