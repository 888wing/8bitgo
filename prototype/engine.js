// 規則引擎：只處理狀態，不碰畫面。畫面、測試和模擬都直接用它。
import {
  AI_IDS, CALLOUT, CARD_NAMES, CLAIMS, EXHIBITS, JURORS, LEAN_IN, LINKS,
  REACTIONS, REASONS, ROOMS, SEATS, THOUGHTS,
} from './case.js';

const CLOCK = ['下午三時', '下午三時半', '下午四時', '下午四時半'];
const ACTIONS_PER_ROOM = 3;

export function createGame({ seed = 1 } = {}) {
  const jurors = {};
  for (const id of AI_IDS) jurors[id] = { stamps: {}, revealed: {}, overrides: {}, usingStruck: {} };
  return {
    day: 1,
    heard: [],
    struck: {},
    exhibits: [],
    zoomed: {},
    rules: ['r1', 'r2', 'r3', 'r4'],
    player: { stamps: {}, history: [], reasons: [], votes: [] },
    jurors,
    room: null,
    lastResult: null,
    rng: seed >>> 0 || 1,
  };
}

export const seatOf = (id) => SEATS.find((s) => s.id === id);
export const callOf = (id) => seatOf(id)?.call ?? id;

// —— 法庭 ——

export function hearClaim(game, id) {
  if (game.heard.includes(id)) return false;
  game.heard.push(id);
  for (const jid of AI_IDS) game.jurors[jid].stamps[id] = JURORS[jid].initial[id] ?? null;
  return true;
}

export function strikeClaim(game, id) {
  game.struck[id] = true;
}

export function addExhibit(game, id) {
  if (!game.exhibits.includes(id)) game.exhibits.push(id);
}

export function addRule(game, id) {
  if (!game.rules.includes(id)) game.rules.push(id);
}

export function canZoom(game, exhibitId) {
  return EXHIBITS[exhibitId].details.some((d) => d.zoom && !game.zoomed[d.id]);
}

export function zoom(game, exhibitId) {
  const found = [];
  for (const d of EXHIBITS[exhibitId].details) {
    if (d.zoom && !game.zoomed[d.id]) {
      game.zoomed[d.id] = true;
      found.push(d);
    }
  }
  return found;
}

// 放大鏡移到某一處才發現那個細節（桌面版用）；文字版用上面的 zoom，一次看整件證物。
export function revealDetail(game, detailId) {
  if (game.zoomed[detailId]) return false;
  const known = Object.values(EXHIBITS).some((ex) => ex.details.some((d) => d.id === detailId && d.zoom));
  if (!known) return false;
  game.zoomed[detailId] = true;
  return true;
}

export function visibleDetails(game, exhibitId) {
  return EXHIBITS[exhibitId].details.filter((d) => !d.zoom || game.zoomed[d.id]);
}

// value：'trust'、'doubt'、'struck' 或 null（留空）。改印章時記下舊的，筆記本會把它劃掉。
// 證人退庭前在印章盤上改來改去不算改主意，所以 record 為 false。
export function setPlayerStamp(game, claimId, value, { record = true } = {}) {
  const prev = game.player.stamps[claimId] ?? null;
  if (prev === value) return false;
  if (record && prev !== null && prev !== 'struck') game.player.history.push({ claim: claimId, from: prev, to: value, day: game.day });
  game.player.stamps[claimId] = value;
  return true;
}

export function stampHistory(game, claimId) {
  return game.player.history.filter((h) => h.claim === claimId).map((h) => h.from);
}

export function crossCheck(game, a, b) {
  const matches = ([x, y]) => (x === a && y === b) || (x === b && y === a);
  for (const [id, reason] of Object.entries(REASONS)) {
    if (!reason.pairs?.some(matches)) continue;
    if (game.player.reasons.includes(id)) return { kind: 'known', reason: id };
    game.player.reasons.push(id);
    return { kind: 'reason', reason: id };
  }
  const thought = THOUGHTS.find((t) => matches(t.pair));
  if (thought) return { kind: 'thought', text: thought.text };
  return { kind: 'none' };
}

// —— 判斷 ——

export function effective(game, who, claimId) {
  if (who === 'you') {
    if (game.struck[claimId]) return null;
    return game.player.stamps[claimId] ?? null;
  }
  const j = game.jurors[who];
  if (game.struck[claimId]) return j.usingStruck[claimId] ? 'trust' : null;
  if (j.overrides[claimId]) return j.overrides[claimId].value;
  return j.stamps[claimId] ?? null;
}

// 一個環：信的說法多於疑的就成立，疑的多就存疑，其餘未知。
export function linkStatus(game, who, linkId) {
  let trust = 0;
  let doubt = 0;
  for (const id of game.heard) {
    if (CLAIMS[id].link !== linkId) continue;
    const s = effective(game, who, id);
    if (s === 'trust') trust += 1;
    else if (s === 'doubt') doubt += 1;
  }
  if (trust > doubt) return 'est';
  if (doubt > trust) return 'doubt';
  return 'unknown';
}

export function linkStatuses(game, who) {
  return Object.fromEntries(LINKS.map((l) => [l.id, linkStatus(game, who, l.id)]));
}

export function beliefOf(game, who) {
  const st = linkStatuses(game, who);
  if (who !== 'you' && JURORS[who].rule === 'motiveEnough' && st.motive === 'est' && st.presence === 'est') return 'G';
  const required = LINKS.filter((l) => l.required).map((l) => st[l.id]);
  if (required.includes('doubt')) return 'NG';
  const supporting = LINKS.filter((l) => !l.required).map((l) => st[l.id]);
  if (required.every((s) => s === 'est') && supporting.includes('est')) return 'G';
  return 'U';
}

export function aiVote(game, id) {
  const belief = beliefOf(game, id);
  const style = JURORS[id].vote;
  if (style === 'guilty') return 'G';
  if (style === 'impatient' && game.day >= 2 && belief === 'U') return 'G';
  return belief;
}

// —— 評議室 ——

const line = (who, text) => ({ type: 'line', who, text });

function flip(game, jid, claimId, value, cause) {
  const j = game.jurors[jid];
  const from = j.stamps[claimId] ?? null;
  j.stamps[claimId] = value;
  j.revealed[claimId] = true;
  return { type: 'flip', juror: jid, claim: claimId, from, to: value, cause };
}

function say(game, st) {
  const room = game.room;
  const events = [];
  for (const id of st.reveal ?? []) game.jurors[st.juror].revealed[id] = true;
  room.statements.push({ id: st.id, juror: st.juror, text: st.text, improper: !!st.improper, active: true });
  if (st.effect?.usingStruck) {
    for (const jid of st.effect.jurors) game.jurors[jid].usingStruck[st.effect.usingStruck] = st.id;
  }
  if (st.effect?.override) {
    for (const jid of st.effect.jurors) {
      for (const id of st.effect.override) {
        if (game.heard.includes(id)) game.jurors[jid].overrides[id] = { value: st.effect.value, by: st.id };
      }
    }
  }
  events.push({ type: 'reveal', juror: st.juror, claims: st.reveal ?? [] }, line(st.juror, st.text));
  if (st.gives && !game.player.reasons.includes(st.gives)) {
    game.player.reasons.push(st.gives);
    events.push({ type: 'borrow', reason: st.gives }, line('旁白', `你在筆記上記下${callOf(st.juror)}的說法。`));
  }
  return events;
}

function undo(game, statementId) {
  for (const jid of AI_IDS) {
    const j = game.jurors[jid];
    for (const [id, by] of Object.entries(j.usingStruck)) if (by === statementId) delete j.usingStruck[id];
    for (const [id, o] of Object.entries(j.overrides)) if (o.by === statementId) delete j.overrides[id];
  }
}

export function startRoom(game) {
  const def = ROOMS[game.day];
  game.room = {
    day: game.day,
    board: def.board.filter((id) => game.heard.includes(id) && !game.struck[id]),
    actions: ACTIONS_PER_ROOM,
    clock: 0,
    statements: [],
    fired: {},
    over: false,
    result: null,
  };
  const events = def.intro.map((b) => line(b.who, b.text));
  for (const st of def.openings) events.push(...say(game, st));
  return events;
}

export function clockLabel(game) {
  return game.room ? CLOCK[Math.min(game.room.clock, CLOCK.length - 1)] : '';
}

export function cards(game) {
  const byCard = new Map();
  for (const id of game.player.reasons) {
    const r = REASONS[id];
    if (!byCard.has(r.card)) byCard.set(r.card, []);
    byCard.get(r.card).push(id);
  }
  return [...byCard].map(([card, reasons]) => ({ card, name: CARD_NAMES[card], reasons }));
}

function applyReasons(game, jid, reasonIds) {
  const def = JURORS[jid];
  const j = game.jurors[jid];
  const out = { flips: [], accepted: false, swayed: false };
  for (const rid of reasonIds) {
    if (!def.accepts.includes(rid)) continue;
    const r = REASONS[rid];
    for (const id of r.claims) {
      if (!game.heard.includes(id) || game.struck[id]) continue;
      const keys = def.locks?.[id];
      if (keys && !keys.includes(rid)) continue;
      out.accepted = true;
      if (j.overrides[id] && j.overrides[id].value !== r.effect) out.swayed = true;
      if ((j.stamps[id] ?? null) !== r.effect) out.flips.push(flip(game, jid, id, r.effect, 'reason'));
      else j.revealed[id] = true;
    }
  }
  return out;
}

function reaction(jid, card, res) {
  const table = REACTIONS[jid];
  const spec = table[card] ?? {};
  const base = table.default;
  if (res.swayed) return JURORS[jid].swayed ?? base.reject;
  if (res.flips.length) return spec.flip ?? base.flip;
  if (res.accepted) return spec.agree ?? base.agree;
  return spec.reject ?? base.reject;
}

// 同一個證人有兩句被他存疑，他連這個證人其餘的說法也不再相信。
function contagion(game, jid) {
  const j = game.jurors[jid];
  const locks = JURORS[jid].locks ?? {};
  const byWitness = {};
  for (const id of game.heard) {
    if (game.struck[id]) continue;
    (byWitness[CLAIMS[id].witness] ??= []).push(id);
  }
  const flips = [];
  for (const ids of Object.values(byWitness)) {
    if (ids.filter((id) => j.stamps[id] === 'doubt').length < 2) continue;
    for (const id of ids) if (j.stamps[id] !== 'doubt' && !locks[id]) flips.push(flip(game, jid, id, 'doubt', 'contagion'));
  }
  return flips;
}

// 跟大隊的人：黑板上看得見的意見裡，有四個和他相反，他就改。
function conformity(game, jid) {
  const j = game.jurors[jid];
  const locks = JURORS[jid].locks ?? {};
  const flips = [];
  for (const id of game.room.board) {
    if (game.struck[id] || locks[id]) continue;
    const mine = j.stamps[id] ?? null;
    for (const want of ['doubt', 'trust']) {
      if (mine === want) continue;
      let count = effective(game, 'you', id) === want ? 1 : 0;
      for (const other of AI_IDS) {
        if (other !== jid && game.jurors[other].revealed[id] && effective(game, other, id) === want) count += 1;
      }
      if (count >= 4) {
        flips.push(flip(game, jid, id, want, 'conformity'));
        break;
      }
    }
  }
  return flips;
}

function settle(game) {
  const events = [];
  for (let round = 0; round < 3; round += 1) {
    let changed = false;
    for (const jid of AI_IDS) {
      const flips = contagion(game, jid);
      if (flips.length) {
        changed = true;
        events.push(...flips, line(jid, JURORS[jid].contagion ?? '……'));
      }
    }
    for (const jid of AI_IDS.filter((id) => JURORS[id].conformist)) {
      for (const f of conformity(game, jid)) {
        changed = true;
        const word = f.to === 'doubt' ? '疑' : '信';
        events.push(f, line('旁白', `${callOf(jid)}望望其他人，把「${CLAIMS[f.claim].label}」改成了「${word}」。`));
      }
    }
    if (!changed) break;
  }
  return events;
}

const TRIGGERS = {
  afterFirst: (game) => game.room.actions === ACTIONS_PER_ROOM - 1,
  slip: (game, act) => act.card === 'D1' || game.room.actions <= 1,
};

function interjections(game, act) {
  const events = [];
  for (const it of ROOMS[game.day].interjections) {
    if (game.room.fired[it.id] || !TRIGGERS[it.when](game, act)) continue;
    game.room.fired[it.id] = true;
    events.push(...say(game, it));
    if (it.reply) {
      const r = it.reply;
      const text = effective(game, r.juror, r.claim) === 'doubt' ? r.doubt : r.otherwise;
      events.push(line(r.juror, text));
    }
  }
  return events;
}

function spend(game, act) {
  const room = game.room;
  room.actions -= 1;
  room.clock += 1;
  const events = interjections(game, act);
  events.push(...settle(game));
  if (room.actions <= 0 && !room.over) {
    room.over = true;
    events.push(line('旁白', '四點半，庭警敲門：「夠鐘表決。」'));
  }
  return events;
}

export function present(game, card, target) {
  const room = game.room;
  if (!room || room.over) return [];
  const ids = game.player.reasons.filter((id) => REASONS[id].card === card);
  const events = [line('旁白', `你把${CARD_NAMES[card]}推到${callOf(target)}面前。`)];
  const res = applyReasons(game, target, ids);
  events.push(...res.flips, line(target, reaction(target, card, res)));
  if (target !== 'fung') {
    const lean = ids.filter((id) => JURORS.fung.leansIn.includes(id));
    if (lean.length) {
      const r2 = applyReasons(game, 'fung', lean);
      if (r2.flips.length) events.push(...r2.flips, line('fung', LEAN_IN[card] ?? reaction('fung', card, r2)));
    }
  }
  events.push(...settle(game), ...spend(game, { kind: 'present', card, target }));
  return events;
}

export function ask(game, target) {
  const room = game.room;
  if (!room || room.over) return [];
  const def = JURORS[target];
  const j = game.jurors[target];
  for (const id of room.board) j.revealed[id] = true;
  const events = [
    line('旁白', `你問${callOf(target)}：「你點睇？」`),
    { type: 'reveal', juror: target, claims: [...room.board] },
  ];
  if (def.gives && !game.player.reasons.includes(def.gives)) {
    game.player.reasons.push(def.gives);
    events.push(line(target, def.ask), { type: 'borrow', reason: def.gives },
      line('旁白', `你在筆記上記下${callOf(target)}的看法。`));
  } else {
    events.push(line(target, def.gives ? def.askAgain : def.ask));
  }
  room.statements.push({ id: `ask-${target}-${room.clock}`, juror: target, text: def.ask, improper: false, active: true });
  events.push(...spend(game, { kind: 'ask', target }));
  return events;
}

export function callOut(game, statementId) {
  const room = game.room;
  if (!room || room.over) return [];
  const st = room.statements.find((s) => s.id === statementId);
  const events = [line('旁白', `你翻開《陪審員須知》，指著${callOf(st?.juror)}剛才那句話。`)];
  if (st?.improper && st.active) {
    st.active = false;
    undo(game, st.id);
    events.push(...CALLOUT[st.id].map((b) => line(b.who, b.text)), { type: 'refresh' });
  } else {
    events.push(...CALLOUT.invalid.map((b) => line(b.who, b.text)));
  }
  events.push(...settle(game), ...spend(game, { kind: 'callout' }));
  return events;
}

export function callVote(game) {
  if (!game.room || game.room.over) return [];
  game.room.over = true;
  return [line('旁白', '你請主席現在就表決。'), line('leung', '好，而家表決。')];
}

export function boardCell(game, who, claimId) {
  if (who === 'you') return game.player.stamps[claimId] ?? 'blank';
  const j = game.jurors[who];
  if (!j.revealed[claimId]) return 'hidden';
  return effective(game, who, claimId) ?? 'blank';
}

function shuffle(list, game) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    game.rng = (game.rng + 0x6d2b79f5) >>> 0;
    let t = game.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const k = Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * (i + 1));
    [list[i], list[k]] = [list[k], list[i]];
  }
  return list;
}

export function vote(game, playerVote) {
  const ballots = AI_IDS.map((id) => ({ who: id, vote: aiVote(game, id) }));
  ballots.push({ who: 'you', vote: playerVote });
  shuffle(ballots, game);
  const tally = { G: 0, NG: 0, U: 0 };
  for (const b of ballots) tally[b.vote] += 1;
  const verdict = tally.G >= 5 ? 'G' : tally.NG >= 5 ? 'NG' : null;
  game.player.votes.push({ day: game.day, vote: playerVote, belief: beliefOf(game, 'you') });
  const result = { ballots, tally, verdict };
  if (game.room) game.room.result = result;
  game.lastResult = result;
  return result;
}

// 信與投之間的距離：投有罪，但筆記本推不出有罪；或者反過來。
export function conscience(game) {
  return game.player.votes.map((v) => ({
    ...v,
    mismatch: (v.vote === 'G' && v.belief !== 'G') || (v.vote === 'NG' && v.belief === 'G'),
  }));
}

export function doubtedClaims(game) {
  return game.heard.filter((id) => !game.struck[id] && game.player.stamps[id] === 'doubt');
}
