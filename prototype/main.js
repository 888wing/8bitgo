// 畫面：把規則引擎的狀態畫出來，等玩家按下去。流程寫成一條 async 的時間線。
import * as E from './engine.js';
import * as C from './case.js';

const CN = ['', '一', '二', '三', '四', '五'];
const VOTE_WORD = { G: '有罪', NG: '無罪', U: '未決' };
const BELIEF_TEXT = { G: '證據足以定罪', NG: '有合理疑點', U: '證據未足以定罪' };
const STAMP_WORD = { trust: '信', doubt: '疑', struck: '不予採納' };
const MARK = { trust: '信', doubt: '疑', blank: '－', hidden: '？', struck: '✕' };
const MARK_WORD = { trust: '信', doubt: '疑', blank: '未表態', hidden: '還沒說', struck: '不予採納' };
const SETTINGS_KEY = 'seventh-seat:settings';
const TAB_TITLES = { notebook: '筆記本', exhibits: '證物', transcript: '庭審記錄', rules: '陪審員須知' };

const $ = (sel) => document.querySelector(sel);
const stage = $('#stage');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, reducedMotion ? Math.min(ms, 200) : ms));

function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === false || value == null) continue;
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'class') node.className = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) if (child != null && child !== false) node.append(child);
  return node;
}

const rot = () => `--rot:${(Math.random() * 10 - 6).toFixed(1)}deg`;

const settings = (() => {
  try {
    return { auto: false, debug: false, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return { auto: false, debug: false };
  }
})();

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // 私密瀏覽或被封鎖時，設定只在今次有效。
  }
}

let game = null;
const transcript = [];
let openTab = null;
let lastBoard = {};
let pressedKey = null;

// —— 對白 ——

function speakerName(who) {
  if (who === '旁白' || who === '報紙') return '';
  if (who === '你') return '你（心想）';
  return C.SEATS.find((s) => s.id === who)?.call ?? who;
}

function speechBox() {
  return h('section', { class: 'speech', 'aria-live': 'polite' },
    h('ol', { class: 'history', id: 'history' }),
    h('div', { class: 'current', id: 'current' }));
}

function showLine(beat) {
  const current = $('#current');
  const history = $('#history');
  if (!current) return;
  if (current.dataset.text) {
    const label = current.dataset.label;
    history.append(h('li', {}, label ? `${label}：${current.dataset.text}` : current.dataset.text));
    while (history.children.length > 2) history.firstElementChild.remove();
  }
  const label = speakerName(beat.who);
  current.dataset.text = beat.text;
  current.dataset.label = label;
  const kind = beat.who === '旁白' ? 'narration' : beat.who === '你' ? 'thought' : beat.who === '報紙' ? 'paper-line' : '';
  current.className = `current ${kind}`;
  current.replaceChildren(...(label ? [h('div', { class: 'who' }, label)] : []), h('p', { class: 'line' }, beat.text));
}

// 把某樣東西捲到看得見的地方，底部會避開固定的抽屜按鈕。
function reveal(node) {
  node?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
}

function waitContinue({ auto = true } = {}) {
  const button = $('#continue');
  button.hidden = false;
  button.focus({ preventScroll: true });
  reveal(button);
  return new Promise((resolve) => {
    let timer = null;
    const done = () => {
      clearTimeout(timer);
      button.hidden = true;
      button.removeEventListener('click', done);
      resolve();
    };
    button.addEventListener('click', done);
    if (auto && settings.auto) timer = setTimeout(done, 1500 + ($('#current')?.dataset.text?.length ?? 0) * 75);
  });
}

async function playBeats(beats) {
  for (const beat of beats) {
    showLine(beat);
    await waitContinue();
  }
}

function record(beat) {
  if (beat.who === '你') return;
  transcript.push({ day: game.day, who: speakerName(beat.who), text: beat.text });
}

// —— 場景 ——

function setPlace(place, time = '') {
  $('#place').textContent = place;
  $('#time').textContent = time;
}

function courtScene(standText = '') {
  stage.replaceChildren(
    h('div', { class: 'stand', id: 'stand' }, standText ? [h('span', { class: 'eyebrow' }, '證人台'), h('span', {}, standText)] : []),
    speechBox(),
    h('p', { class: 'jot', id: 'jot' }),
    h('div', { id: 'panel' }),
    h('button', { class: 'continue', id: 'continue', type: 'button', hidden: true }, '繼續'),
  );
}

function roomScene() {
  stage.replaceChildren(
    h('div', { class: 'board-wrap' }, h('div', { class: 'board', id: 'board', role: 'table', 'aria-label': '黑板：七個人對每個說法的看法' })),
    speechBox(),
    h('div', { id: 'panel' }),
    h('button', { class: 'continue', id: 'continue', type: 'button', hidden: true }, '繼續'),
  );
  lastBoard = {};
}

function pulse(tab) {
  if (openTab !== tab) $(`#tab-${tab}`)?.classList.add('new');
}

function jot(beat) {
  const parts = [];
  if (beat.claim) {
    parts.push(game.struck[beat.claim] ? '' : `你在筆記本寫下：「${C.CLAIMS[beat.claim].text}」`);
    pulse('notebook');
  }
  if (beat.exhibit) {
    const ex = C.EXHIBITS[beat.exhibit];
    parts.push(`證物 ${ex.code}「${ex.name}」放到你桌上。`);
    pulse('exhibits');
  }
  const node = $('#jot');
  if (node) node.textContent = parts.filter(Boolean).join('　');
}

// —— 法庭 ——

async function witness(wid) {
  const w = C.WITNESSES[wid];
  setPlace(`第${CN[game.day]}天　法庭`);
  courtScene(`${w.name}（${w.side}）`);
  for (const beat of w.script) {
    if (beat.claim) E.hearClaim(game, beat.claim);
    if (beat.exhibit) E.addExhibit(game, beat.exhibit);
    if (beat.rule) {
      E.addRule(game, beat.rule);
      pulse('rules');
    }
    record(beat);
    showLine(beat);
    jot(beat);
    refreshSheet();
    await waitContinue();
    if (beat.strike) await strikePrompt(beat.strike);
  }
  $('#jot').textContent = '';
  await stampTray(w);
}

async function strikePrompt(id) {
  E.strikeClaim(game, id);
  const panel = $('#panel');
  const button = h('button', { class: 'stamp-button red', type: 'button' }, '蓋上「不予採納」');
  panel.replaceChildren(h('div', { class: 'tray' },
    h('p', { class: 'tray-title' }, '法官要你忽略這一句。'),
    h('p', { class: 'struck-line' }, `「${C.CLAIMS[id].text}」`),
    button));
  button.focus({ preventScroll: true });
  reveal(panel);
  await new Promise((resolve) => button.addEventListener('click', resolve, { once: true }));
  E.setPlayerStamp(game, id, 'struck');
  panel.replaceChildren(h('div', { class: 'tray' },
    h('p', { class: 'struck-line' }, h('span', { class: 'stamp struck pressed', style: rot() }, '不予採納'), C.CLAIMS[id].text)));
  refreshSheet();
  await sleep(700);
  panel.replaceChildren();
}

function stampChoice(id, value, onChange, record) {
  const current = game.player.stamps[id] ?? null;
  const on = current === value;
  const key = `${id}:${value}`;
  return h('button', {
    type: 'button',
    class: `stamp-choice ${value}${on ? ' on' : ''}${on && pressedKey === key ? ' pressed' : ''}`,
    'aria-pressed': String(on),
    'aria-label': `${STAMP_WORD[value]}：${C.CLAIMS[id].text}`,
    onclick: () => {
      E.setPlayerStamp(game, id, on ? null : value, { record });
      pressedKey = on ? null : key;
      onChange();
    },
  }, STAMP_WORD[value]);
}

async function stampTray(w) {
  const panel = $('#panel');
  const ids = w.claims.filter((id) => game.heard.includes(id) && !game.struck[id]);
  showLine({ who: '旁白', text: `${w.name}走下證人台之前，印章盤滑到你面前。` });
  const done = h('button', { class: 'primary', type: 'button' }, '證人退庭');
  const render = () => {
    panel.replaceChildren(h('div', { class: 'tray' },
      h('p', { class: 'tray-title' }, '為每個說法蓋章。留空就是未決。'),
      ...ids.map((id) => h('div', { class: 'tray-row' },
        h('p', { class: 'tray-claim' }, C.CLAIMS[id].text),
        h('div', { class: 'tray-buttons' },
          stampChoice(id, 'trust', render, false),
          stampChoice(id, 'doubt', render, false)))),
      done));
    refreshSheet();
  };
  render();
  reveal(panel);
  await new Promise((resolve) => done.addEventListener('click', resolve, { once: true }));
  pressedKey = null;
  panel.replaceChildren();
}

// —— 評議室 ——

function renderBoard() {
  const board = $('#board');
  if (!board || !game.room) return;
  const cells = [h('div', { class: 'cell corner' }, '黑板')];
  for (const s of C.SEATS) cells.push(h('div', { class: `cell seat${s.id === 'you' ? ' you' : ''}`, title: `${s.seat}號　${s.name}，${s.role}` }, s.short));
  for (const id of game.room.board) {
    cells.push(h('div', { class: 'cell label' }, C.CLAIMS[id].label));
    for (const s of C.SEATS) {
      let value = E.boardCell(game, s.id, id);
      let peek = false;
      if (value === 'hidden' && settings.debug) {
        value = E.effective(game, s.id, id) ?? 'blank';
        peek = true;
      }
      const key = `${s.id}:${id}`;
      const changed = lastBoard[key] !== undefined && lastBoard[key] !== value && !peek;
      lastBoard[key] = value;
      cells.push(h('div', {
        class: `cell mark ${value}${s.id === 'you' ? ' you' : ''}${changed ? ' changed' : ''}${peek ? ' peek' : ''}`,
        'aria-label': `${s.call}，${C.CLAIMS[id].label}：${MARK_WORD[value]}`,
      }, MARK[value]));
    }
  }
  if (settings.debug) {
    cells.push(h('div', { class: 'cell label' }, '（測試）傾向'));
    for (const s of C.SEATS) {
      const b = s.id === 'you' ? E.beliefOf(game, 'you') : E.aiVote(game, s.id);
      cells.push(h('div', { class: 'cell belief' }, VOTE_WORD[b]));
    }
  }
  board.replaceChildren(...cells);
}

async function playEvents(events) {
  for (const e of events) {
    if (e.type === 'line') {
      renderBoard();
      showLine(e);
      await waitContinue({ auto: false });
    } else if (e.type === 'borrow') {
      pulse('notebook');
    }
  }
  renderBoard();
}

function openModal(title, body) {
  const card = $('#modal-card');
  card.replaceChildren(
    h('div', { class: 'modal-head' }, h('h2', { id: 'modal-title' }, title),
      h('button', { type: 'button', onclick: closeModal }, '取消')),
    ...body);
  card.setAttribute('aria-labelledby', 'modal-title');
  $('#modal').hidden = false;
  card.querySelector('button.option, button.primary')?.focus({ preventScroll: true });
}

function closeModal() {
  $('#modal').hidden = true;
}

const option = (title, note, onclick, noteClass = '') => h('button', { class: 'option', type: 'button', onclick },
  h('span', { class: 'option-title' }, title),
  ...[note].flat().filter(Boolean).map((n) => h('span', { class: `option-note ${noteClass}` }, n)));

function pickJuror(title, onPick) {
  openModal(title, C.SEATS.filter((s) => s.id !== 'you').map((s) =>
    option(`${s.seat}號　${s.call}`, s.role, () => { closeModal(); onPick(s.id); })));
}

function chooseAction() {
  return new Promise((resolve) => {
    const cards = E.cards(game);
    const statements = game.room.statements.filter((s) => s.active && !s.id.startsWith('ask-'));
    const action = (label, hint, disabled, onclick) => h('button', { type: 'button', class: 'action', disabled, onclick },
      h('span', { class: 'action-label' }, label), h('span', { class: 'action-hint' }, hint));
    $('#panel').replaceChildren(h('div', { class: 'actions' },
      action('出示理由', cards.length ? '把證物和你的批註推到某人面前' : '你的筆記上還沒有理由', !cards.length, () => {
        openModal('出示哪一件？', cards.map((c) => option(c.name, c.reasons.map((r) => C.REASONS[r].note), () => {
          closeModal();
          pickJuror(`把${c.name}推到誰面前？`, (target) => resolve({ kind: 'present', card: c.card, target }));
        }, 'hand')));
      }),
      action('追問', '問某人怎樣看，揭開他那一欄', false, () => pickJuror('問誰？', (target) => resolve({ kind: 'ask', target }))),
      action('指出違規', '有人用了被剔除的說法，或庭外聽回來的東西', !statements.length, () => {
        openModal('指出哪一句？', statements.map((s) => option(E.callOf(s.juror), `「${s.text}」`, () => {
          closeModal();
          resolve({ kind: 'callout', statement: s.id });
        })));
      }),
      action('提請表決', '請主席現在就表決', false, () => {
        openModal('現在就表決？', [
          h('p', {}, '表決之後，今天的評議就結束。'),
          h('div', { class: 'row' },
            h('button', { class: 'primary', type: 'button', onclick: () => { closeModal(); resolve({ kind: 'vote' }); } }, '請主席表決'),
            h('button', { class: 'secondary', type: 'button', onclick: closeModal }, '再傾一陣')),
        ]);
      })));
    reveal($('#panel'));
  }).finally(() => $('#panel').replaceChildren());
}

function ballot() {
  showLine({ who: 'leung', text: '每人一張紙，寫好摺埋，放入木箱。' });
  return new Promise((resolve) => {
    const choice = (v) => h('button', { type: 'button', class: `ballot-option ${v}`, onclick: () => resolve(v) }, VOTE_WORD[v]);
    $('#panel').replaceChildren(h('div', { class: 'ballot' },
      h('p', { class: 'tray-title' }, '你的選票'),
      h('div', { class: 'ballot-options' }, choice('G'), choice('NG'), choice('U')),
      h('p', { class: 'hint' }, '不記名。任何一方有五票，今天就裁決。')));
    reveal($('#panel'));
  }).finally(() => $('#panel').replaceChildren());
}

const tallyMarks = (n) => '正'.repeat(Math.floor(n / 5)) + ['', '一', '丅', '下', '止'][n % 5];

async function reading(result) {
  const list = h('ol', { class: 'reading' });
  const tally = { G: 0, NG: 0, U: 0 };
  const line = h('p', { class: 'tally', 'aria-live': 'polite' });
  $('#panel').replaceChildren(h('div', { class: 'tray' }, h('p', { class: 'tray-title' }, '主席逐張讀出'), list, line));
  showLine({ who: '旁白', text: '主席打開木箱，一張一張讀出來。' });
  reveal($('#panel'));
  for (const b of result.ballots) {
    await sleep(950);
    tally[b.vote] += 1;
    list.append(h('li', { class: `slip ${b.vote}` }, VOTE_WORD[b.vote]));
    line.textContent = `有罪 ${tallyMarks(tally.G) || '　'}　無罪 ${tallyMarks(tally.NG) || '　'}　未決 ${tallyMarks(tally.U) || '　'}`;
  }
  await sleep(700);
  const v = result.verdict;
  showLine({ who: 'leung', text: v === 'G' ? '五票有罪。' : v === 'NG' ? '五票無罪。' : '冇五票。今日就到呢度。' });
  await waitContinue({ auto: false });
  $('#panel').replaceChildren();
}

async function deliberate() {
  setPlace(`第${CN[game.day]}天　評議室`);
  roomScene();
  const opening = E.startRoom(game);
  $('#time').textContent = E.clockLabel(game);
  renderBoard();
  await playEvents(opening);
  while (!game.room.over) {
    const act = await chooseAction();
    let events;
    if (act.kind === 'present') events = E.present(game, act.card, act.target);
    else if (act.kind === 'ask') events = E.ask(game, act.target);
    else if (act.kind === 'callout') events = E.callOut(game, act.statement);
    else events = E.callVote(game);
    $('#time').textContent = E.clockLabel(game);
    await playEvents(events);
  }
  const choice = await ballot();
  const result = E.vote(game, choice);
  await reading(result);
  return result;
}

// —— 抽屜：筆記本、證物、記錄、須知 ——

function compareResult(a, b) {
  const r = E.crossCheck(game, a, b);
  const text = r.kind === 'reason' ? `你在筆記旁邊寫下：「${C.REASONS[r.reason].note}」`
    : r.kind === 'known' ? '這一點你已經寫低了。'
      : r.kind === 'thought' ? r.text
        : '想了一陣，好像對不上。';
  openModal('對照', [
    h('p', { class: r.kind === 'reason' ? 'hand big' : '' }, text),
    h('button', { class: 'primary', type: 'button', onclick: () => { closeModal(); refreshSheet(); } }, '好'),
  ]);
}

function compareFromClaim(claimId) {
  const choices = [];
  for (const eid of game.exhibits) {
    const ex = C.EXHIBITS[eid];
    for (const d of E.visibleDetails(game, eid)) choices.push(option(`${ex.code} ${ex.name}`, d.text, () => compareResult(claimId, d.id)));
  }
  for (const id of game.heard) {
    if (id !== claimId && !game.struck[id]) choices.push(option(C.CLAIMS[id].label, C.CLAIMS[id].text, () => compareResult(claimId, id)));
  }
  openModal(`拿甚麼同「${C.CLAIMS[claimId].text}」對照？`, choices);
}

function compareFromDetail(detailId, text) {
  const choices = game.heard.filter((id) => !game.struck[id])
    .map((id) => option(C.CLAIMS[id].label, C.CLAIMS[id].text, () => compareResult(id, detailId)));
  openModal(`拿「${text}」同哪個說法對照？`, choices);
}

function notesFor(id) {
  return game.player.reasons.filter((r) => C.REASONS[r].claims.includes(id)).map((r) => C.REASONS[r].note);
}

function claimRow(id) {
  const current = game.player.stamps[id] ?? null;
  const struck = !!game.struck[id];
  const past = E.stampHistory(game, id);
  const stampNode = (value, extra = '') => h('span', { class: `stamp ${value}${extra}`, style: rot() }, STAMP_WORD[value]);
  return h('div', { class: `claim${struck ? ' is-struck' : ''}` },
    h('div', { class: 'claim-stamps' }, ...past.map((p) => stampNode(p, ' old')), current ? stampNode(current) : h('span', { class: 'stamp empty' }, '　')),
    h('div', { class: 'claim-body' },
      h('p', { class: 'claim-text' }, C.CLAIMS[id].text),
      ...notesFor(id).map((n) => h('p', { class: 'hand note' }, n)),
      struck ? null : h('div', { class: 'claim-tools' },
        stampChoice(id, 'trust', refreshAll, true),
        stampChoice(id, 'doubt', refreshAll, true),
        h('button', { class: 'link', type: 'button', onclick: () => compareFromClaim(id) }, '對照…'))));
}

function notebookView() {
  const witnesses = [...new Set(game.heard.map((id) => C.CLAIMS[id].witness))];
  if (!witnesses.length) return [h('p', { class: 'empty' }, '證人講到重要的說法，你會抄在這裡。')];
  const pages = witnesses.map((wid) => h('section', { class: 'page' },
    h('h3', {}, C.WITNESSES[wid].name),
    ...game.heard.filter((id) => C.CLAIMS[id].witness === wid).map(claimRow)));
  const borrowed = game.player.reasons.filter((r) => C.REASONS[r].from);
  if (borrowed.length) {
    pages.push(h('section', { class: 'page' }, h('h3', {}, '別人的理由'),
      ...borrowed.map((r) => h('p', { class: 'hand note' }, C.REASONS[r].note))));
  }
  return pages;
}

function exhibitsView() {
  if (!game.exhibits.length) return [h('p', { class: 'empty' }, '證物呈堂時，會放到你桌上。')];
  return game.exhibits.map((eid) => {
    const ex = C.EXHIBITS[eid];
    return h('section', { class: 'exhibit' },
      h('h3', {}, h('span', { class: 'code' }, ex.code), ex.name),
      h('p', {}, ex.text),
      ...E.visibleDetails(game, eid).map((d) => h('div', { class: 'detail' },
        h('p', {}, d.text),
        d.eye ? h('p', { class: 'hand note' }, d.eye) : null,
        h('button', { class: 'link', type: 'button', onclick: () => compareFromDetail(d.id, d.text) }, '對照…'))),
      E.canZoom(game, eid)
        ? h('button', { class: 'secondary', type: 'button', onclick: () => { E.zoom(game, eid); refreshSheet(); } }, '用放大鏡看')
        : null);
  });
}

function transcriptView() {
  if (!transcript.length) return [h('p', { class: 'empty' }, '庭上說過的每一句，都記在這裡。')];
  const items = [];
  let day = 0;
  for (const t of transcript) {
    if (t.day !== day) {
      day = t.day;
      items.push(h('li', { class: 'day' }, `第${CN[day]}天`));
    }
    items.push(h('li', {}, t.who ? [h('span', { class: 'who' }, `${t.who}：`), t.text] : t.text));
  }
  return [h('ol', { class: 'transcript' }, ...items)];
}

function rulesView() {
  return [h('ol', { class: 'rules' }, ...game.rules.map((r) => h('li', {}, C.RULEBOOK[r])))];
}

function renderSheet() {
  if (!openTab) return;
  $('#sheet-title').textContent = TAB_TITLES[openTab];
  const view = { notebook: notebookView, exhibits: exhibitsView, transcript: transcriptView, rules: rulesView }[openTab];
  const body = $('#sheet-body');
  const scroll = $('#sheet').scrollTop;
  body.replaceChildren(...view());
  $('#sheet').scrollTop = scroll;
}

function refreshSheet() {
  if (openTab) renderSheet();
}

function refreshAll() {
  refreshSheet();
  renderBoard();
}

function setTab(tab) {
  openTab = tab;
  $('#sheet').hidden = !tab;
  for (const button of document.querySelectorAll('.tab')) {
    button.setAttribute('aria-expanded', String(button.dataset.tab === tab));
    if (button.dataset.tab === tab) button.classList.remove('new');
  }
  if (tab) {
    $('#sheet').scrollTop = 0;
    renderSheet();
  }
  renderBoard();
}

for (const button of document.querySelectorAll('.tab')) {
  button.addEventListener('click', () => setTab(openTab === button.dataset.tab ? null : button.dataset.tab));
}
$('#sheet-close').addEventListener('click', () => setTab(null));
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('#modal').hidden) closeModal();
  else if (openTab) setTab(null);
});

// —— 設定 ——

function toggleRow(label, value, onChange) {
  const id = `toggle-${label.length}-${label.charCodeAt(0)}`;
  const input = h('input', { type: 'checkbox', id, onchange: (e) => onChange(e.target.checked) });
  input.checked = value;
  return h('div', { class: 'toggle' }, h('label', { for: id }, label), input);
}

$('#settings').addEventListener('click', () => {
  openModal('設定', [
    toggleRow('證詞自動推進', settings.auto, (v) => { settings.auto = v; saveSettings(); }),
    toggleRow('顯示陪審員的底牌（測試用）', settings.debug, (v) => { settings.debug = v; saveSettings(); renderBoard(); }),
    h('button', { class: 'secondary', type: 'button', onclick: () => location.reload() }, '重新開始'),
  ]);
});

// —— 結局 ——

function debrief(verdict, day, title) {
  const votes = E.conscience(game);
  const doubted = E.doubtedClaims(game).map((id) => C.CLAIMS[id].label);
  const mismatchText = votes.filter((v) => v.mismatch).map((v) => (v.vote === 'G'
    ? `第${CN[v.day]}天，按你的筆記本，證據未足以定罪${doubted.length ? `（你在「${doubted.join('」「')}」蓋了「疑」）` : ''}，但你投了有罪。`
    : `第${CN[v.day]}天，按你的筆記本，證據足以定罪，但你投了無罪。`));
  const struckCount = Object.values(game.player.stamps).filter((s) => s === 'struck').length;
  const found = game.player.reasons.filter((r) => !C.REASONS[r].from).length;
  const borrowed = game.player.reasons.length - found;
  const unheard = verdict ? C.SCHEDULE.filter((s) => s.day > day).flatMap((s) => s.names) : [];
  return h('div', { class: 'debrief' },
    h('h2', {}, title),
    h('section', {},
      h('h3', {}, '你的票'),
      h('ol', {}, ...votes.map((v) => h('li', {}, `第${CN[v.day]}天：你投了「${VOTE_WORD[v.vote]}」。按你的筆記本，${BELIEF_TEXT[v.belief]}。`))),
      mismatchText.length
        ? mismatchText.map((t) => h('p', { class: 'warn' }, t))
        : h('p', {}, '你投的，和你筆記本上寫的一致。')),
    h('section', {},
      h('h3', {}, '你的筆記本'),
      h('p', {}, `改過 ${game.player.history.length} 次印章；親手蓋了 ${struckCount} 個「不予採納」；自己找到 ${found} 個理由，借來 ${borrowed} 個。`)),
    unheard.length ? h('section', {},
      h('h3', {}, '法庭排期表'),
      h('p', {}, '以下證人不會再出庭：'),
      h('ul', { class: 'unheard' }, ...unheard.map((n) => h('li', {}, n)))) : null,
    h('section', {},
      h('h3', {}, '試玩問題'),
      h('ol', {}, ...C.PLAYTEST.map((q) => h('li', {}, q)))),
    h('button', { class: 'primary', type: 'button', onclick: () => location.reload() }, '再玩一次'));
}

async function endingScene(verdict, day) {
  const end = C.ending(verdict, day);
  setPlace(verdict ? '裁決' : `第${CN[day]}天　評議室`);
  courtScene();
  await playBeats(end.beats);
  stage.replaceChildren(debrief(verdict, day, end.title));
  stage.querySelector('.debrief button')?.focus({ preventScroll: true });
}

// —— 一局 ——

function titleScreen() {
  setPlace('第七席');
  return new Promise((resolve) => {
    const open = h('button', { class: 'primary', type: 'button', onclick: resolve }, '打開傳票');
    stage.replaceChildren(h('section', { class: 'summons' },
      h('span', { class: 'eyebrow' }, '霧港高等法院　陪審員傳票'),
      h('h1', {}, '第七席'),
      h('p', { class: 'lede' }, '你是七人陪審團的第七席。每天休庭後都要表決，任何一方夠五票，審判即時結束。'),
      h('p', { class: 'small' }, '原型：序幕和第一、二天，約二十分鐘。純文字，沒有美術。'),
      open));
    open.focus({ preventScroll: true });
  });
}

async function run() {
  document.documentElement.lang = 'zh-Hant-HK';
  game = E.createGame({ seed: Date.now() % 2147483647 });
  await titleScreen();
  $('#tabs').hidden = false;
  setPlace('序幕');
  courtScene();
  for (const beat of C.PROLOGUE) record(beat);
  await playBeats(C.PROLOGUE);
  for (const { day, witnesses, adjourn } of C.DAYS) {
    game.day = day;
    if (day > 1) {
      setPlace(`第${CN[day]}天　早上`);
      courtScene();
      await playBeats(C.morning(day, game.lastResult.tally));
    }
    for (const wid of witnesses) await witness(wid);
    for (const beat of adjourn) record(beat);
    await playBeats(adjourn);
    const result = await deliberate();
    if (result.verdict) return endingScene(result.verdict, day);
    if (C.NIGHT[day]) {
      setPlace(`第${CN[day]}天　夜晚`);
      courtScene();
      await playBeats(C.NIGHT[day]);
    }
  }
  return endingScene(null, game.day);
}

run();
