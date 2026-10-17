import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import { DAYS, WITNESSES } from '../case.js';

// 照劇本把某一天的證人全部聽完，像玩家在法庭上一樣。
function hearDay(game, day) {
  game.day = day;
  for (const wid of DAYS[day - 1].witnesses) {
    for (const beat of WITNESSES[wid].script) {
      if (beat.claim) E.hearClaim(game, beat.claim);
      if (beat.exhibit) E.addExhibit(game, beat.exhibit);
      if (beat.strike) {
        E.strikeClaim(game, beat.strike);
        E.setPlayerStamp(game, beat.strike, 'struck');
      }
    }
  }
}

function stampAll(game, value, ids) {
  for (const id of ids) E.setPlayerStamp(game, id, value);
}

const aiVotes = (game) => Object.fromEntries(['leung', 'wong', 'law', 'lam', 'so', 'fung'].map((id) => [id, E.aiVote(game, id)]));

test('第一天：四人傾向有罪，你就是第五票', () => {
  const game = E.createGame({ seed: 7 });
  hearDay(game, 1);
  E.startRoom(game);
  assert.deepEqual(aiVotes(game), { leung: 'G', wong: 'G', law: 'G', lam: 'NG', so: 'G', fung: 'U' });
  game.room.over = true;
  const result = E.vote(game, 'G');
  assert.equal(result.tally.G, 5);
  assert.equal(result.verdict, 'G');
});

test('第一天：投未決，審判就有第二天', () => {
  const game = E.createGame({ seed: 7 });
  hearDay(game, 1);
  E.startRoom(game);
  const result = E.vote(game, 'U');
  assert.equal(result.verdict, null);
});

test('口供頁底的手寫字令主席收回對口供的信任', () => {
  const game = E.createGame();
  hearDay(game, 1);
  E.zoom(game, 'P4');
  assert.equal(E.crossCheck(game, 'c3', 'P4b').kind, 'reason');
  E.startRoom(game);
  const events = E.present(game, 'P4', 'leung');
  assert.ok(events.some((e) => e.type === 'flip' && e.juror === 'leung' && e.claim === 'c3' && e.to === 'doubt'));
  assert.equal(E.aiVote(game, 'leung'), 'U');
});

test('乾掉的打火機說不動黃老闆，但馮 Sir 會湊過來看', () => {
  const game = E.createGame();
  hearDay(game, 1);
  E.zoom(game, 'P2');
  E.crossCheck(game, 'c2', 'P2b');
  E.startRoom(game);
  const events = E.present(game, 'P2', 'wong');
  assert.ok(!events.some((e) => e.type === 'flip' && e.juror === 'wong'));
  assert.equal(game.jurors.fung.stamps.c2, 'doubt');
  assert.equal(E.aiVote(game, 'fung'), 'NG');
  assert.equal(E.aiVote(game, 'wong'), 'G');
});

test('追問馮 Sir 得到燒痕的理由，專家的話說得動主席', () => {
  const game = E.createGame();
  hearDay(game, 1);
  E.startRoom(game);
  E.ask(game, 'fung');
  assert.ok(game.player.reasons.includes('RB'));
  E.present(game, 'P1', 'leung');
  assert.equal(game.jurors.leung.stamps.c1, 'doubt');
  assert.equal(E.aiVote(game, 'leung'), 'U');
});

test('看不懂的對照只留下一個念頭', () => {
  const game = E.createGame();
  hearDay(game, 1);
  E.zoom(game, 'P1');
  assert.equal(E.crossCheck(game, 'c1', 'P1b').kind, 'thought');
  assert.equal(E.crossCheck(game, 'g1', 'P2a').kind, 'none');
});

test('三個動作之後，庭警敲門', () => {
  const game = E.createGame();
  hearDay(game, 1);
  E.startRoom(game);
  E.ask(game, 'leung');
  E.ask(game, 'wong');
  assert.equal(game.room.over, false);
  E.ask(game, 'lam');
  assert.equal(game.room.over, true);
  assert.equal(E.clockLabel(game), '下午四時半');
});

test('第二天：新的動機和火水單據把主席拉回有罪', () => {
  const game = E.createGame();
  hearDay(game, 1);
  E.zoom(game, 'P4');
  E.crossCheck(game, 'c3', 'P4b');
  E.startRoom(game);
  E.present(game, 'P4', 'leung');
  assert.equal(E.aiVote(game, 'leung'), 'U');
  game.room.over = true;
  E.vote(game, 'U');
  hearDay(game, 2);
  E.startRoom(game);
  assert.equal(E.aiVote(game, 'leung'), 'G');
});

test('截電通知、羅生的失言、指出違規：完整的第二天', () => {
  const game = E.createGame({ seed: 3 });
  hearDay(game, 1);
  stampAll(game, 'trust', ['c1', 'c2', 'c3']);
  E.startRoom(game);
  game.room.over = true;
  E.vote(game, 'U');

  hearDay(game, 2);
  stampAll(game, 'doubt', ['g1', 'g2', 'g3']);
  E.crossCheck(game, 'g2', 'D1b');
  E.crossCheck(game, 'g3', 'D1b');
  E.startRoom(game);
  assert.equal(E.aiVote(game, 'leung'), 'G');

  // 一、截電通知推到主席面前：看更說了兩次謊，他連「見到被告」也不再信。
  E.present(game, 'D1', 'leung');
  assert.equal(game.jurors.leung.stamps.g1, 'doubt');
  // 羅生隨即替看更說話，主席又被拉回去。
  assert.ok(game.room.fired['d2-slip']);
  assert.equal(E.aiVote(game, 'leung'), 'G');

  // 二、指出羅生的話是庭外資料。
  E.callOut(game, 'd2-slip');
  assert.equal(E.aiVote(game, 'leung'), 'NG');

  // 三、截電通知推到林小姐面前，蘇太見到四個人都存疑，跟著改。
  E.present(game, 'D1', 'lam');
  assert.equal(game.jurors.so.stamps.g3, 'doubt');
  assert.deepEqual(aiVotes(game), { leung: 'NG', wong: 'G', law: 'G', lam: 'NG', so: 'NG', fung: 'NG' });
  assert.equal(game.room.over, true);

  const result = E.vote(game, 'NG');
  assert.equal(result.verdict, 'NG');
});

test('不理會羅生的失言，第二天你的票又成了第五票', () => {
  const game = E.createGame();
  hearDay(game, 1);
  E.startRoom(game);
  game.room.over = true;
  E.vote(game, 'U');
  hearDay(game, 2);
  E.crossCheck(game, 'g2', 'D1b');
  E.crossCheck(game, 'g3', 'D1b');
  E.startRoom(game);
  E.present(game, 'D1', 'leung');
  E.ask(game, 'law');
  E.ask(game, 'so');
  const votes = aiVotes(game);
  assert.equal(Object.values(votes).filter((v) => v === 'G').length, 4);
  assert.equal(E.vote(game, 'G').verdict, 'G');
});

test('指出蘇太引用被剔除的傳聞', () => {
  const game = E.createGame();
  hearDay(game, 1);
  hearDay(game, 2);
  E.startRoom(game);
  assert.equal(E.effective(game, 'leung', 'h1'), 'trust');
  E.callOut(game, 'd2-so');
  assert.equal(E.effective(game, 'leung', 'h1'), null);
});

test('指錯了也會用掉一次發言', () => {
  const game = E.createGame();
  hearDay(game, 1);
  E.startRoom(game);
  const events = E.callOut(game, 'd1-wong');
  assert.ok(events.some((e) => e.type === 'line' && e.text.includes('冇問題')));
  assert.equal(game.room.actions, 2);
});

test('放大鏡逐處發現細節，發現之後才可以拿來對照', () => {
  const game = E.createGame();
  hearDay(game, 1);
  assert.ok(!E.visibleDetails(game, 'P4').some((d) => d.id === 'P4b'));
  assert.equal(E.revealDetail(game, 'P4b'), true);
  assert.equal(E.revealDetail(game, 'P4b'), false);
  assert.equal(E.revealDetail(game, 'P4a'), false);
  assert.ok(E.visibleDetails(game, 'P4').some((d) => d.id === 'P4b'));
  assert.equal(E.canZoom(game, 'P4'), false);
  assert.equal(E.crossCheck(game, 'c3', 'P4b').kind, 'reason');
});

test('改印章會留下舊的印章', () => {
  const game = E.createGame();
  hearDay(game, 1);
  E.setPlayerStamp(game, 'g2', 'trust');
  E.setPlayerStamp(game, 'g2', 'doubt');
  assert.deepEqual(E.stampHistory(game, 'g2'), ['trust']);
});

test('信與投：不信看更卻投有罪，會被記住', () => {
  const game = E.createGame();
  hearDay(game, 1);
  stampAll(game, 'trust', ['c1', 'c2', 'c3', 'g2']);
  stampAll(game, 'doubt', ['g1', 'g3']);
  E.startRoom(game);
  E.vote(game, 'G');
  const [day1] = E.conscience(game);
  assert.equal(day1.belief, 'NG');
  assert.equal(day1.mismatch, true);
});

test('同一個種子，投票的揭曉次序一樣', () => {
  const run = () => {
    const game = E.createGame({ seed: 42 });
    hearDay(game, 1);
    E.startRoom(game);
    return E.vote(game, 'U').ballots.map((b) => b.who).join();
  };
  assert.equal(run(), run());
});
