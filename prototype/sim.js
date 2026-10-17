// 平衡模擬：用不同性格的假玩家跑很多局，看結局怎樣分佈。
// 用法：node sim.js [局數]
import * as E from './engine.js';
import { DAYS, WITNESSES, REASONS, AI_IDS } from './case.js';

const RUNS = Number(process.argv[2] ?? 5000);

function makeRandom(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rand, list) => list[Math.floor(rand() * list.length)];

// 每種玩家：怎樣蓋章、找到理由的機會、怎樣用評議室的動作、怎樣投票。
const PLAYERS = {
  跟大隊: { doubt: 0, find: 0, act: 'none', vote: () => 'G' },
  憑印章: { doubt: 0.3, find: 0.5, act: 'random', vote: (belief) => belief },
  細心: { doubt: 0.2, find: 0.9, act: 'smart', vote: (belief) => belief },
  拉住天秤: { doubt: 0.3, find: 0.9, act: 'smart', vote: () => 'U' },
  隨機: { doubt: 0.5, find: 0.3, act: 'random', vote: (_b, rand) => pick(rand, ['G', 'NG', 'U']) },
};

function court(game, day, style, rand) {
  game.day = day;
  for (const wid of DAYS[day - 1].witnesses) {
    for (const beat of WITNESSES[wid].script) {
      if (beat.claim) E.hearClaim(game, beat.claim);
      if (beat.exhibit) {
        E.addExhibit(game, beat.exhibit);
        if (rand() < style.find) E.zoom(game, beat.exhibit);
      }
      if (beat.strike) {
        E.strikeClaim(game, beat.strike);
        E.setPlayerStamp(game, beat.strike, 'struck');
      }
    }
    for (const id of WITNESSES[wid].claims) E.setPlayerStamp(game, id, rand() < style.doubt ? 'doubt' : 'trust');
  }
  // 找到的理由：只試證物已經放大過、說法已經聽過的配對。
  for (const r of Object.values(REASONS)) {
    for (const [a, b] of r.pairs ?? []) {
      const visible = (id) => game.heard.includes(id) || game.exhibits.some((ex) => E.visibleDetails(game, ex).some((d) => d.id === id));
      if (visible(a) && visible(b) && rand() < style.find) E.crossCheck(game, a, b);
    }
  }
  // 找到理由的人，會把相應的說法改成「疑」或「信」。
  for (const id of game.player.reasons) {
    for (const c of REASONS[id].claims) if (game.heard.includes(c) && !game.struck[c]) E.setPlayerStamp(game, c, REASONS[id].effect);
  }
}

function room(game, style, rand) {
  E.startRoom(game);
  while (!game.room.over) {
    const cards = E.cards(game);
    const active = game.room.statements.filter((s) => s.active);
    if (style.act === 'none') E.callVote(game);
    else if (style.act === 'smart') {
      const slip = active.find((s) => s.id === 'd2-slip');
      if (slip) E.callOut(game, slip.id);
      else if (cards.some((c) => c.card === 'D1') && game.jurors.leung.stamps.g1 !== 'doubt') E.present(game, 'D1', 'leung');
      else if (cards.some((c) => c.card === 'D1') && game.jurors.lam.stamps.g3 !== 'doubt') E.present(game, 'D1', 'lam');
      else if (!game.player.reasons.includes('RB')) E.ask(game, 'fung');
      else if (cards.some((c) => c.card === 'P1') && game.jurors.leung.stamps.c1 !== 'doubt') E.present(game, 'P1', 'leung');
      else if (cards.some((c) => c.card === 'P2') && game.jurors.fung.stamps.c2 !== 'doubt') E.present(game, 'P2', 'fung');
      else if (cards.length) E.present(game, pick(rand, cards).card, pick(rand, AI_IDS));
      else E.ask(game, pick(rand, AI_IDS));
    } else {
      const options = ['ask', 'vote'];
      if (cards.length) options.push('present', 'present');
      if (active.length) options.push('callout');
      const choice = pick(rand, options);
      if (choice === 'present') E.present(game, pick(rand, cards).card, pick(rand, AI_IDS));
      else if (choice === 'ask') E.ask(game, pick(rand, AI_IDS));
      else if (choice === 'callout') E.callOut(game, pick(rand, active).id);
      else E.callVote(game);
    }
  }
  const aiGuilty = AI_IDS.filter((id) => E.aiVote(game, id) === 'G').length;
  const result = E.vote(game, style.vote(E.beliefOf(game, 'you'), rand));
  return { result, aiGuilty };
}

function play(style, seed) {
  const rand = makeRandom(seed);
  const game = E.createGame({ seed });
  const day1Guilty = [];
  for (const { day } of DAYS) {
    court(game, day, style, rand);
    const { result, aiGuilty } = room(game, style, rand);
    day1Guilty.push(aiGuilty);
    if (result.verdict) return { ending: `${result.verdict}${day}`, aiGuilty: day1Guilty, mismatch: E.conscience(game).some((v) => v.mismatch) };
  }
  return { ending: 'CONT', aiGuilty: day1Guilty, mismatch: E.conscience(game).some((v) => v.mismatch) };
}

const pct = (n) => `${((n / RUNS) * 100).toFixed(1)}%`;

for (const [name, style] of Object.entries(PLAYERS)) {
  const endings = {};
  const guiltyDay1 = {};
  let mismatches = 0;
  for (let i = 1; i <= RUNS; i += 1) {
    const out = play(style, i * 7919);
    endings[out.ending] = (endings[out.ending] ?? 0) + 1;
    guiltyDay1[out.aiGuilty[0]] = (guiltyDay1[out.aiGuilty[0]] ?? 0) + 1;
    if (out.mismatch) mismatches += 1;
  }
  const endingText = Object.entries(endings).sort().map(([k, v]) => `${k} ${pct(v)}`).join('　');
  const guiltyText = Object.entries(guiltyDay1).sort().map(([k, v]) => `${k}人 ${pct(v)}`).join('　');
  console.log(`${name}\n  結局：${endingText}\n  第一天表決前，AI 投有罪的人數：${guiltyText}\n  信與投不一致：${pct(mismatches)}`);
}
console.log('\nG1／G2：第一、二天罪成　NG2：第二天無罪　CONT：未有裁決，審判會到第三天');
