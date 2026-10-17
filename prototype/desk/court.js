// 第一天的法庭桌面（手感切片）：試四種手感——拖證物、放大鏡、對照紅線、蓋章。
// 規則全部交給 engine.js；這裡只管畫面、輸入和時間。
import * as E from '../engine.js';
import { CLAIMS, DAYS, EXHIBITS, REASONS, RULEBOOK, THOUGHTS, WITNESSES } from '../case.js';
import * as P from './pixels.js';
import * as L from './layout.js';
import * as S from './sound.js';
import { DOCS, PAL, disc, imprint, registerAll } from './art.js';

// 畫面上出現的字全部在這裡；main.js 開場前先把用到的字型載入。
export const UI = {
  title: '第七席',
  subtitle: '陪審桌・手感切片',
  controls: '拖動證物、放大鏡和印章。點左下角的對白，或按空白鍵，聽下一句。',
  start: '按一下開始',
  intro: [
    { who: '旁白', text: '高等法院第七號法庭。你坐在陪審席最後一個位。' },
    { who: '旁白', text: '證人講到重要的說法，你會抄進右邊的筆記本。' },
  ],
  speakers: { 庭警: '庭警', 控方: '控方大律師', 辯方: '辯方大律師', 法官: '法官', 鄭督察: '鄭督察', 鍾永發: '鍾永發', 你: '你（心想）' },
  hints: {
    drag: '把托盤上的證物拖到桌上。',
    loupe: '拿起放大鏡，在證物上慢慢移動。',
    inspect: '按「對照」，把一個說法和一個細節連起來。',
    pickFirst: '點一個說法，再點一個細節。',
    pickSecond: '再點一樣，拉一條紅線。',
    stamp: '把印章拖到每個說法上。蓋完，按「退庭」。',
  },
  stepDown: '{name}走下證人台之前，印章盤滑到你面前。',
  blank: '留空的說法，當作未決。',
  delivered: '證物 {code}：{name}',
  known: '這一點你已經寫低了。',
  booklet: '陪審員須知',
  close: '按一下合上',
  numbers: ['一', '二', '三', '四', '五'],
  end: {
    title: '手感切片完',
    stats: '你發現了 {found} 個細節，寫了 {notes} 句批註，蓋了 {stamps} 個印。',
    belief: '照你的印章，你此刻的判斷：{belief}。',
    missed: '（放大鏡下，有兩件證物藏著細節。）',
    ask: '請試玩的人答：',
    questions: [
      '把證物由托盤拖到桌上，感覺像拿起一件實物嗎？',
      '放大鏡找到細節時，有沒有「被我發現了」的感覺？',
      '對照拉出紅線、筆記多了一行批註，夠不夠爽快？',
      '蓋章夠不夠重？',
      '480×270 的字，看得清楚嗎？',
    ],
    again: '再玩一次',
    beliefs: { G: '證據足以定罪', NG: '有合理疑點', U: '證據未足以定罪' },
  },
};

const VOICES = {
  庭警: { portrait: 'usher', head: 'usher', pitch: 400 },
  控方: { portrait: 'prosecutor', head: 'prosecutor', pitch: 470 },
  辯方: { portrait: 'defense', head: 'defense', pitch: 520 },
  法官: { portrait: 'judge', head: 'judge', pitch: 300 },
  鄭督察: { portrait: 'cheng', head: 'witness', pitch: 360 },
  鍾永發: { portrait: 'chung', head: 'witness', pitch: 330 },
  旁白: { color: PAL.wallLight, speed: 0.045 },
  你: { color: PAL.brassLight, speed: 0.04 },
};

const voiceOf = (who) => ({
  portrait: null, head: null, pitch: 0, color: PAL.white, speed: 0.032, ...VOICES[who], name: UI.speakers[who] ?? '',
});

const STYLE = {
  dialogue: { size: 13, weight: 500, width: 124, lineHeight: 16, threshold: 110 },
  name: { size: 12, weight: 400, lineHeight: 13, color: PAL.ink, threshold: 120 },
  header: { size: 12, weight: 400, lineHeight: 14, color: PAL.ink, threshold: 120 },
  claim: { font: 'hand', size: 12, weight: 700, width: 134, lineHeight: 14, color: PAL.ink, threshold: 110 },
  reason: { font: 'hand', size: 12, weight: 700, width: 132, lineHeight: 13, color: PAL.red, threshold: 110 },
  thought: { font: 'hand', size: 12, weight: 700, width: 132, lineHeight: 13, color: PAL.grey, threshold: 110 },
  caption: { size: 12, weight: 500, width: 300, lineHeight: 14, threshold: 110 },
  body: { size: 12, weight: 500, lineHeight: 15, color: PAL.white, threshold: 110 },
  bold: { size: 12, weight: 700, lineHeight: 15, color: PAL.ink, threshold: 120 },
  title: { size: 24, weight: 700, lineHeight: 28, color: PAL.white, threshold: 120 },
  heading: { size: 16, weight: 700, lineHeight: 20, color: PAL.white, threshold: 120 },
  small: { size: 8, color: PAL.brassLight, threshold: 90 },
};

// 字幕的字色和框色。
const CAPTION = {
  hint: [PAL.white, PAL.brass],
  info: [PAL.white, PAL.wall],
  you: [PAL.brassLight, PAL.brassDark],
  note: [PAL.white, PAL.red],
};

const Z = {
  court: 0, witness: 1, booth: 2, portrait: 3, desk: 10, notebook: 11, page: 12, tray: 13, tools: 14,
  docs: 100, lens: 300, loupe: 301, rack: 310, stamp: 311, held: 320, overlay: 400, line: 410, bang: 420, caption: 430, modal: 500,
};

const ZOOM_DWELL = 350; // 放大鏡要停留多久才算看清楚（毫秒）
const WRITE_SPEED = 0.15; // 筆記本寫字的速度（像素／毫秒）
const PUNCT = '，。、；：？！「」『』（）…—';

const sum = (list) => list.reduce((a, b) => a + b, 0);
const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const centerOf = (r) => [Math.floor(r.x + r.w / 2), Math.floor(r.y + r.h / 2)];
const grow = (r, n) => ({ x: r.x - n, y: r.y - n, w: r.w + n * 2, h: r.h + n * 2 });
const stripRect = (r) => ({ x: r.x, y: L.STRIP.y, w: r.w, h: L.STRIP.h });
const TOOLS = { inspect: L.INSPECT, booklet: L.BOOKLET, prev: L.PAGE_PREV, next: L.PAGE_NEXT };

// 逐行把字露出來，像筆在寫。
function revealText(ctx, t, shown, x, y) {
  let left = shown;
  t.widths.forEach((w, i) => {
    const visible = Math.min(w, Math.max(0, Math.ceil(left)));
    left -= w;
    if (visible > 0) ctx.drawImage(t.canvas, 0, i * t.lineHeight, visible, t.lineHeight, x, y + i * t.lineHeight, visible, t.lineHeight);
  });
}

function dottedLine(ctx, x, y, w, color) {
  for (let i = 0; i < w; i += 2) P.px(ctx, x + i, y, color);
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

function panel(ctx, x, y, w, h) {
  P.rect(ctx, x, y, w, h, PAL.panel);
  P.frame(ctx, x, y, w, h, PAL.brass);
  P.frame(ctx, x + 1, y + 1, w - 2, h - 2, PAL.black);
}

export class CourtScene extends Phaser.Scene {
  constructor() {
    super('court');
    this.run = 0;
  }

  create() {
    registerAll(this);
    this.run += 1;
    this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.trial = E.createGame({ seed: (Math.random() * 2 ** 31) >>> 0 });
    this.pages = [];
    this.pageIndex = 0;
    this.entryRects = [];
    this.docs = [];
    this.mode = 'normal';
    this.selection = [];
    this.items = [];
    this.drag = null;
    this.press = null;
    this.modal = null;
    this.busy = false;
    this.stamping = null;
    this.leaveResolve = null;
    this.rack = { x: L.RACK.hiddenX, ready: false };
    this.stampTarget = null;
    this.stampBusy = {};
    this.typing = null;
    this.waiting = null;
    this.voice = voiceOf('旁白');
    this.writing = [];
    this.captions = [];
    this.caption = null;
    this.captionKey = null;
    this.notesAdded = new Set();
    this.stats = { found: 0, notes: 0, stamps: 0, checks: 0 };
    this.loupe = { x: L.LOUPE_HOME.x, y: L.LOUPE_HOME.y, dwell: null };
    this.lensKey = null;
    this.onStand = null;
    this.walking = false;
    this.line = null;
    this.textCache = new Map();
    this.cursor = '';
    this.pageDirty = true;
    this.buildScene();
    this.bindInput();
    this.play(this.run);
  }

  // —— 畫面 ——

  buildScene() {
    const img = (x, y, key, depth) => this.add.image(x, y, key).setOrigin(0).setDepth(depth);
    img(0, 0, 'court', Z.court);
    this.witnessImg = img(-26, 25, 'witness-cheng', Z.witness).setVisible(false);
    this.tickImg = img(0, 0, 'tick', Z.witness).setVisible(false);
    this.soundImg = img(L.SOUND.x, L.SOUND.y, S.isMuted() ? 'sound-off' : 'sound-on', Z.witness);
    img(L.BOOTH.x, L.BOOTH.y, 'booth', Z.booth);
    this.portraitImg = img(L.PORTRAIT.x + 4, L.PORTRAIT.y + 3, 'pt-empty', Z.portrait);
    this.nameTex = this.canvasTex('name', L.NAME.w - 6, 13);
    img(L.NAME.x + 3, L.NAME.y + 1, 'name', Z.portrait);
    this.dialogueTex = this.canvasTex('dialogue', 132, 66);
    img(L.DIALOGUE.x + 4, L.DIALOGUE.y + 6, 'dialogue', Z.portrait);
    this.moreImg = img(L.DIALOGUE.x + L.DIALOGUE.w - 12, L.DIALOGUE.y + L.DIALOGUE.h - 8, 'more', Z.portrait).setVisible(false);

    img(L.DESK.x, L.DESK.y, 'desk', Z.desk);
    img(L.NOTEBOOK.x, L.NOTEBOOK.y, 'nb-base', Z.notebook);
    this.pageTex = this.canvasTex('page', L.PAGE.w, L.PAGE.h);
    img(L.PAGE.x, L.PAGE.y, 'page', Z.page);
    this.pageNoTex = this.canvasTex('page-no', L.PAGE_NO.w, L.PAGE_NO.h);
    img(L.PAGE_NO.x, L.PAGE_NO.y, 'page-no', Z.tools);
    img(L.TRAY.x, L.TRAY.y, 'tray', Z.tray);
    this.tools = {
      inspect: img(L.INSPECT.x, L.INSPECT.y, 'plaque-inspect', Z.tools),
      booklet: img(L.BOOKLET.x, L.BOOKLET.y, 'plaque-booklet', Z.tools),
      prev: img(L.PAGE_PREV.x, L.PAGE_PREV.y, 'arrow-left', Z.tools),
      next: img(L.PAGE_NEXT.x, L.PAGE_NEXT.y, 'arrow-right', Z.tools),
    };

    const lens = L.LENS_R * 2 + 1;
    this.lensTex = this.canvasTex('lens', lens, lens);
    this.lensImg = img(0, 0, 'lens', Z.lens);
    this.loupeImg = img(0, 0, 'loupe', Z.loupe);
    this.lensMask = disc(L.LENS_R);

    this.rackImg = img(L.RACK.hiddenX, L.RACK.y, 'rack', Z.rack);
    this.stampImgs = { trust: img(0, 0, 'stamp-trust', Z.stamp), doubt: img(0, 0, 'stamp-doubt', Z.stamp) };
    this.stampShadow = img(0, 0, 'shadow-stamp', Z.held - 1).setVisible(false);

    this.overlayTex = this.canvasTex('overlay', L.DOC_AREA.w, L.DOC_AREA.h);
    this.overlayImg = img(L.DOC_AREA.x, L.DOC_AREA.y, 'overlay', Z.overlay).setVisible(false);
    this.lineTex = this.canvasTex('red-line', L.W, L.H);
    this.lineImg = img(0, 0, 'red-line', Z.line);
    this.bangImg = img(0, 0, 'bang', Z.bang).setVisible(false);
    this.captionTex = this.canvasTex('caption', L.CAPTION.w, L.CAPTION.h);
    img(L.CAPTION.x, L.CAPTION.y, 'caption', Z.caption);
    this.modalTex = this.canvasTex('modal', L.W, L.H);
    this.modalImg = img(0, 0, 'modal', Z.modal).setVisible(false);

    // 半格網點：對照模式和彈出視窗用它把背景壓暗，不用半透明。
    const shade = P.canvas(2, 2);
    P.px(shade.ctx, 0, 0, PAL.black);
    P.px(shade.ctx, 1, 1, PAL.black);
    this.shade = shade.c;

    this.placeLoupe();
    this.layoutRack();
    this.drawName('');
    this.drawDialogue('', PAL.white);
  }

  canvasTex(key, w, h) {
    const tex = this.textures.exists(key) ? this.textures.get(key) : this.textures.createCanvas(key, w, h);
    tex.context.imageSmoothingEnabled = false;
    tex.context.clearRect(0, 0, w, h);
    tex.refresh();
    return tex;
  }

  textOf(str, style, extra = {}) {
    const key = `${style}|${JSON.stringify(extra)}|${str}`;
    if (!this.textCache.has(key)) this.textCache.set(key, P.text(str, { ...STYLE[style], ...extra }));
    return this.textCache.get(key);
  }

  drawName(name) {
    const ctx = this.nameTex.context;
    ctx.clearRect(0, 0, this.nameTex.width, this.nameTex.height);
    if (name) ctx.drawImage(this.textOf(name, 'name').canvas, 2, 0);
    this.nameTex.refresh();
  }

  drawDialogue(text, color) {
    const ctx = this.dialogueTex.context;
    ctx.clearRect(0, 0, this.dialogueTex.width, this.dialogueTex.height);
    if (text) ctx.drawImage(P.text(text, { ...STYLE.dialogue, color }).canvas, 0, 0);
    this.dialogueTex.refresh();
  }

  // —— 流程：一條 async 的時間線 ——

  async play(run) {
    await this.openModal('title');
    for (const beat of UI.intro) await this.say(beat, run);
    for (const wid of DAYS[0].witnesses) {
      for (const [i, beat] of WITNESSES[wid].script.entries()) {
        if (beat.claim) {
          E.hearClaim(this.trial, beat.claim);
          this.writeClaim(wid, beat.claim);
        }
        if (beat.exhibit) {
          E.addExhibit(this.trial, beat.exhibit);
          this.deliver(beat.exhibit);
        }
        await this.say(beat, run);
        if (i === 0) this.callWitness(wid);
      }
      await this.stampPhase(wid, run);
      await this.dismissWitness(run);
    }
    for (const beat of DAYS[0].adjourn) await this.say(beat, run);
    this.openModal('end');
  }

  // 重新開始之後，舊的時間線停在原地，不再碰畫面。
  stale(run) {
    return run !== this.run ? new Promise(() => {}) : null;
  }

  wait(ms) {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  tweenTo(target, props, duration, ease = 'Quad.easeOut') {
    return new Promise((resolve) => this.tweens.add({ targets: target, ...props, duration, ease, onComplete: () => resolve() }));
  }

  async say(beat, run) {
    const stale = this.stale(run);
    if (stale) return stale;
    await new Promise((resolve) => this.speak(beat, resolve));
    await new Promise((resolve) => {
      this.waiting = resolve;
    });
  }

  // 開始打字，不等玩家按。
  speak(beat, resolve = null) {
    const voice = voiceOf(beat.who);
    this.voice = voice;
    this.waiting = null;
    this.drawName(voice.name);
    this.drawDialogue('', voice.color);
    this.typing = { text: beat.text, shown: 0, voice, resolve };
  }

  advance() {
    if (this.typing) {
      this.typing.shown = this.typing.text.length;
      return;
    }
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = null;
      resolve();
    }
  }

  callWitness(wid) {
    this.turnTo(this.pages.indexOf(this.pageFor(wid)));
    this.witnessImg.setTexture(`witness-${wid}`).setPosition(-26, 25).setVisible(true);
    this.walking = true;
    this.tweens.add({
      targets: this.witnessImg, x: 78, duration: 1100, ease: 'Linear',
      onComplete: () => {
        this.walking = false;
        this.witnessImg.y = 25;
        this.onStand = wid;
      },
    });
  }

  async dismissWitness(run) {
    const stale = this.stale(run);
    if (stale) return stale;
    this.onStand = null;
    this.walking = true;
    await this.tweenTo(this.witnessImg, { x: -26 }, 1000, 'Linear');
    this.walking = false;
    this.witnessImg.setVisible(false);
  }

  // —— 筆記本 ——

  pageFor(wid) {
    let page = this.pages.find((p) => p.wid === wid);
    if (!page) {
      const w = WITNESSES[wid];
      page = { wid, header: this.textOf(`${w.name}（${w.side}）`, 'header'), entries: [] };
      this.pages.push(page);
    }
    return page;
  }

  entryOf(claim) {
    for (const page of this.pages) {
      const entry = page.entries.find((e) => e.claim === claim);
      if (entry) return entry;
    }
    return null;
  }

  turnTo(index) {
    if (index < 0 || index >= this.pages.length) return;
    if (index !== this.pageIndex) S.paper();
    this.pageIndex = index;
    this.pageDirty = true;
  }

  writeClaim(wid, claim) {
    const page = this.pageFor(wid);
    const text = this.textOf(CLAIMS[claim].text, 'claim');
    const entry = { claim, text, shown: 0, notes: [], imprints: [] };
    page.entries.push(entry);
    this.writing.push({ item: entry, total: sum(text.widths) });
    this.turnTo(this.pages.indexOf(page));
  }

  addNote(claim, str, style) {
    const entry = this.entryOf(claim);
    if (!entry) return;
    const text = this.textOf(str, style);
    const note = { text, shown: 0 };
    entry.notes.push(note);
    this.writing.push({ item: note, total: sum(text.widths) });
    this.stats.notes += 1;
    this.turnTo(this.pages.findIndex((p) => p.entries.includes(entry)));
  }

  drawPage() {
    const ctx = this.pageTex.context;
    ctx.clearRect(0, 0, L.PAGE.w, L.PAGE.h);
    this.entryRects = [];
    const page = this.pages[this.pageIndex];
    if (page) {
      ctx.drawImage(page.header.canvas, 0, 0);
      dottedLine(ctx, 0, 15, L.PAGE.w, PAL.paperLine);
      let y = 18;
      for (const e of page.entries) {
        const top = y;
        revealText(ctx, e.text, e.shown, 26, y);
        y += e.text.height;
        for (const n of e.notes) {
          revealText(ctx, n.text, n.shown, 26, y);
          y += n.text.height;
        }
        const h = Math.max(24, y - top);
        // 舊的印劃一筆，新的印蓋在上面：印章蓋了就擦不走。
        for (const imp of e.imprints) {
          const ix = 1 + imp.dx;
          const iy = top + imp.dy;
          ctx.drawImage(imp.canvas, ix, iy);
          if (imp.crossed) P.line(ctx, ix, iy + 21, ix + 21, iy, PAL.ink);
        }
        if (this.stampTarget === e.claim) dottedFrame(ctx, 0, top - 1, L.PAGE.w, h + 2, PAL.ink);
        this.entryRects.push({
          claim: e.claim,
          row: { x: L.PAGE.x, y: L.PAGE.y + top - 1, w: L.PAGE.w, h: h + 2 },
          text: { x: L.PAGE.x + 25, y: L.PAGE.y + top - 1, w: Math.max(...e.text.widths) + 2, h: e.text.height + 1 },
        });
        y = top + h + 2;
        dottedLine(ctx, 26, y - 1, L.PAGE.w - 26, PAL.paperLine);
      }
    }
    this.pageTex.refresh();

    const no = this.pageNoTex.context;
    no.clearRect(0, 0, L.PAGE_NO.w, L.PAGE_NO.h);
    if (this.pages.length) no.drawImage(this.textOf(`${this.pageIndex + 1}/${this.pages.length}`, 'small').canvas, 0, 0);
    this.pageNoTex.refresh();
    if (this.mode === 'inspect') this.drawOverlay();
  }

  // —— 證物 ——

  slotPos(slot) {
    return [L.SLOTS.x + slot * L.SLOTS.step, L.SLOTS.y];
  }

  sizeOf(doc, form = doc.form) {
    return form === 'icon' ? [24, 18] : [DOCS[doc.id].w, DOCS[doc.id].h];
  }

  deliver(id) {
    const doc = { id, slot: this.docs.length, form: 'icon', onDesk: false, x: 0, y: 0, lift: false, arriving: true };
    doc.shadow = this.add.image(0, 0, 'shadow-icon').setOrigin(0).setVisible(false);
    doc.img = this.add.image(0, 0, `doc-${id}-icon`).setOrigin(0);
    this.docs.push(doc);
    this.restack();
    const [sx, sy] = this.slotPos(doc.slot);
    this.setDoc(doc, 'icon', sx, sy - 16);
    this.tweens.add({
      targets: doc.img, y: sy, duration: 220, ease: 'Quad.easeIn',
      onComplete: () => {
        doc.arriving = false;
        doc.shadow.setVisible(true);
        this.setDoc(doc, 'icon', sx, sy);
        S.paper();
      },
    });
    this.queueCaption(fill(UI.delivered, EXHIBITS[id]), 'info');
  }

  setDoc(doc, form, x, y) {
    doc.form = form;
    doc.x = Math.round(x);
    doc.y = Math.round(y);
    const key = `doc-${doc.id}-${form}`;
    if (doc.img.texture.key !== key) doc.img.setTexture(key);
    doc.img.setPosition(doc.x, doc.y);
    const shadowKey = form === 'icon' ? 'shadow-icon' : `shadow-${doc.id}`;
    if (doc.shadow.texture.key !== shadowKey) doc.shadow.setTexture(shadowKey);
    const off = doc.lift ? 3 : 1;
    doc.shadow.setPosition(doc.x + off, doc.y + off);
  }

  restack() {
    this.docs.forEach((d, i) => {
      d.shadow.setDepth(Z.docs + i * 2);
      d.img.setDepth(Z.docs + i * 2 + 1);
    });
  }

  docAt(x, y, filter = () => true) {
    for (let i = this.docs.length - 1; i >= 0; i -= 1) {
      const d = this.docs[i];
      if (d.arriving || !filter(d)) continue;
      const [w, h] = this.sizeOf(d);
      if (L.inside({ x: d.x, y: d.y, w, h }, x, y)) return d;
    }
    return null;
  }

  grabDoc(doc, x, y) {
    const [w, h] = this.sizeOf(doc);
    this.docs.splice(this.docs.indexOf(doc), 1);
    this.docs.push(doc);
    this.restack();
    doc.lift = true;
    this.drag = { kind: 'doc', doc, fx: (x - doc.x) / w, fy: (y - doc.y) / h, sx: x, sy: y, moved: false };
    this.setDoc(doc, doc.form, doc.x, doc.y);
    S.paper();
  }

  // 拖到托盤上就縮成小圖，拖出來就攤開；手指捏住的位置保持不變。
  moveDoc(x, y) {
    const d = this.drag;
    if (!d.moved && Math.abs(x - d.sx) + Math.abs(y - d.sy) < 3) return;
    d.moved = true;
    const form = L.inside(L.TRAY, x, y) ? 'icon' : 'full';
    const [w, h] = this.sizeOf(d.doc, form);
    let nx = x - d.fx * w;
    let ny = y - d.fy * h;
    if (form === 'full') {
      const A = L.DOC_AREA;
      nx = clamp(nx, A.x, A.x + A.w - w);
      ny = clamp(ny, A.y, A.y + A.h - h);
    }
    this.setDoc(d.doc, form, nx, ny);
  }

  dropDoc() {
    const { doc, moved } = this.drag;
    this.drag = null;
    doc.lift = false;
    if (!moved && !doc.onDesk) {
      // 只點一下托盤上的小圖：替你攤到桌上。
      const [w, h] = this.sizeOf(doc, 'full');
      const A = L.DOC_AREA;
      doc.onDesk = true;
      this.setDoc(doc, 'full', clamp(L.TRAY.x + 4 + doc.slot * 10, A.x, A.x + A.w - w), clamp(L.TRAY.y + 34 + doc.slot * 6, A.y, A.y + A.h - h));
    } else if (doc.form === 'icon') {
      doc.onDesk = false;
      const [sx, sy] = this.slotPos(doc.slot);
      this.setDoc(doc, 'icon', sx, sy);
    } else {
      doc.onDesk = true;
      this.setDoc(doc, 'full', doc.x, doc.y);
    }
    S.paper();
  }

  // —— 放大鏡 ——

  placeLoupe() {
    const { x, y } = this.loupe;
    this.loupeImg.setPosition(x - 22, y - 22);
    this.lensImg.setPosition(x - L.LENS_R, y - L.LENS_R);
    if (this.bangImg.visible) this.bangImg.setPosition(x + 12, y - 36);
  }

  onLoupe(x, y) {
    const dx = x - this.loupe.x;
    const dy = y - this.loupe.y;
    if (dx * dx + dy * dy <= 22 * 22) return true;
    return dx >= 12 && dx <= 38 && dy >= 12 && dy <= 38 && Math.abs(dx - dy) <= 4;
  }

  grabLoupe(x, y) {
    this.drag = { kind: 'loupe', ox: x - this.loupe.x, oy: y - this.loupe.y };
  }

  moveLoupe(x, y) {
    const B = L.LOUPE_BOUNDS;
    this.loupe.x = clamp(x - this.drag.ox, B.x, B.x + B.w - 1);
    this.loupe.y = clamp(y - this.drag.oy, B.y, B.y + B.h - 1);
    this.placeLoupe();
  }

  // 鏡片裡畫的是證物的兩倍圖，用一個圓形遮罩剪出來。
  drawLens(doc) {
    const { x, y } = this.loupe;
    const key = doc ? `${x},${y},${doc.id},${doc.x},${doc.y}` : '';
    if (key === this.lensKey) return;
    this.lensKey = key;
    const size = L.LENS_R * 2 + 1;
    const ctx = this.lensTex.context;
    ctx.clearRect(0, 0, size, size);
    if (doc) {
      ctx.fillStyle = PAL.leatherDark;
      ctx.fillRect(0, 0, size, size);
      const zoom = this.textures.get(`doc-${doc.id}-zoom`).getSourceImage();
      ctx.drawImage(zoom, L.LENS_R - 2 * (x - doc.x), L.LENS_R - 2 * (y - doc.y));
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(this.lensMask, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    }
    this.lensTex.refresh();
  }

  tickLoupe(delta) {
    const { x, y } = this.loupe;
    const doc = this.docAt(x, y, (d) => d.form === 'full');
    this.drawLens(doc);
    if (this.drag?.kind !== 'loupe' || !doc) {
      this.loupe.dwell = null;
      return;
    }
    const u = x - doc.x;
    const v = y - doc.y;
    const spot = EXHIBITS[doc.id].details.find((d) => {
      const r = DOCS[doc.id].hotspots[d.id];
      return d.zoom && !this.trial.zoomed[d.id] && r && L.inside({ x: r[0], y: r[1], w: r[2], h: r[3] }, u, v);
    });
    if (!spot) {
      this.loupe.dwell = null;
      return;
    }
    if (this.loupe.dwell?.id !== spot.id) this.loupe.dwell = { id: spot.id, t: 0 };
    this.loupe.dwell.t += delta;
    if (this.loupe.dwell.t >= ZOOM_DWELL) {
      this.loupe.dwell = null;
      this.discover(spot);
    }
  }

  discover(spot) {
    if (!E.revealDetail(this.trial, spot.id)) return;
    this.stats.found += 1;
    S.found();
    this.bangImg.setVisible(true);
    this.placeLoupe();
    this.time.delayedCall(1000, () => this.bangImg.setVisible(false));
    this.queueCaption(spot.text, 'info', true);
    if (spot.eye) this.queueCaption(spot.eye, 'you');
  }

  // —— 對照 ——

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.selection = [];
    this.tools.inspect.setTexture(mode === 'inspect' ? 'plaque-inspect-on' : 'plaque-inspect');
    this.overlayImg.setVisible(mode === 'inspect');
    if (mode === 'inspect') this.drawOverlay();
  }

  // 可以點的東西：這一頁上沒被證物蓋住的說法，以及桌上證物已經看得見的細節。
  selectables() {
    const items = [];
    for (const r of this.entryRects) {
      if (!this.docAt(...centerOf(r.text))) items.push({ kind: 'claim', id: r.claim, rect: r.text });
    }
    for (const doc of this.docs) {
      if (doc.form !== 'full') continue;
      for (const d of E.visibleDetails(this.trial, doc.id)) {
        const spot = DOCS[doc.id].hotspots[d.id];
        if (!spot) continue;
        const rect = { x: doc.x + spot[0], y: doc.y + spot[1], w: spot[2], h: spot[3] };
        if (this.docAt(...centerOf(rect)) === doc) items.push({ kind: 'detail', id: d.id, rect, doc });
      }
    }
    return items;
  }

  drawOverlay() {
    this.items = this.selectables();
    const A = L.DOC_AREA;
    const ctx = this.overlayTex.context;
    ctx.clearRect(0, 0, A.w, A.h);
    ctx.fillStyle = ctx.createPattern(this.shade, 'repeat');
    ctx.fillRect(0, 0, A.w, A.h);
    for (const it of this.items) {
      const x = it.rect.x - A.x;
      const y = it.rect.y - A.y;
      ctx.clearRect(x - 1, y - 1, it.rect.w + 2, it.rect.h + 2);
      if (this.selection.some((s) => s.id === it.id)) {
        P.frame(ctx, x - 2, y - 2, it.rect.w + 4, it.rect.h + 4, PAL.red);
        P.frame(ctx, x - 1, y - 1, it.rect.w + 2, it.rect.h + 2, PAL.red);
      } else {
        dottedFrame(ctx, x - 2, y - 2, it.rect.w + 4, it.rect.h + 4, PAL.brassLight);
      }
    }
    this.overlayTex.refresh();
  }

  pick(x, y) {
    const doc = this.docAt(x, y, (d) => d.form === 'full');
    const it = this.items.find((i) => L.inside(grow(i.rect, 2), x, y) && (doc ? i.doc === doc : i.kind === 'claim'));
    if (!it) return;
    const at = this.selection.findIndex((s) => s.id === it.id);
    if (at >= 0) this.selection.splice(at, 1);
    else this.selection.push(it);
    S.pen();
    this.drawOverlay();
    if (this.selection.length === 2) this.check(...this.selection);
  }

  async check(a, b) {
    this.busy = true;
    await this.drawRedLine(...centerOf(a.rect), ...centerOf(b.rect));
    const res = E.crossCheck(this.trial, a.id, b.id);
    this.stats.checks += 1;
    const claim = [a, b].find((it) => it.kind === 'claim')?.id;
    if (res.kind === 'reason') {
      const r = REASONS[res.reason];
      this.addNote(claim ?? r.claims[0], r.jot, 'reason');
      S.found();
      this.queueCaption(r.note, 'note', true);
    } else if (res.kind === 'known') {
      this.queueCaption(UI.known, 'info', true);
    } else if (res.kind === 'thought') {
      const t = THOUGHTS.find((th) => th.pair.includes(a.id) && th.pair.includes(b.id));
      const key = t.pair.join('+');
      if (!this.notesAdded.has(key)) {
        this.notesAdded.add(key);
        this.addNote(claim ?? t.pair.find((id) => CLAIMS[id]), t.jot, 'thought');
      }
      this.queueCaption(res.text, 'you', true);
    }
    // 對不上的話，紅線收回，甚麼都不寫：遊戲不判對錯。
    await this.wait(res.kind === 'none' ? 450 : 800);
    this.fadeLine();
    this.selection = [];
    this.busy = false;
    if (res.kind === 'none') this.drawOverlay();
    else this.setMode('normal');
  }

  drawRedLine(x0, y0, x1, y1) {
    S.pen();
    this.lineImg.setAlpha(1);
    return new Promise((resolve) => {
      this.line = { pts: P.linePoints(x0, y0, x1, y1), shown: 0, resolve };
    });
  }

  tickLine(delta) {
    const l = this.line;
    if (!l || l.shown >= l.pts.length) return;
    l.shown = Math.min(l.pts.length, l.shown + delta * 1.2);
    const ctx = this.lineTex.context;
    ctx.clearRect(0, 0, L.W, L.H);
    const n = Math.floor(l.shown);
    for (let i = 0; i < n; i += 1) P.rect(ctx, l.pts[i][0], l.pts[i][1], 2, 2, PAL.red);
    const [sx, sy] = l.pts[0];
    P.ring(ctx, sx, sy, 3, PAL.red);
    if (n >= l.pts.length) {
      const [ex, ey] = l.pts[l.pts.length - 1];
      P.ring(ctx, ex, ey, 3, PAL.red);
    }
    this.lineTex.refresh();
    if (n >= l.pts.length) l.resolve();
  }

  // 一格一格地淡出，不用平滑的透明度。
  fadeLine() {
    let step = 0;
    this.time.addEvent({
      delay: 90, repeat: 3,
      callback: () => {
        step += 1;
        this.lineImg.setAlpha(1 - step / 3);
        if (step >= 3) {
          this.lineTex.context.clearRect(0, 0, L.W, L.H);
          this.lineTex.refresh();
          this.line = null;
        }
      },
    });
  }

  // —— 蓋章 ——

  async stampPhase(wid, run) {
    const stale = this.stale(run);
    if (stale) return stale;
    this.stamping = { wid };
    this.turnTo(this.pages.findIndex((p) => p.wid === wid));
    this.speak({ who: '旁白', text: fill(UI.stepDown, { name: WITNESSES[wid].name }) });
    await this.slideRack(true);
    await new Promise((resolve) => {
      this.leaveResolve = resolve;
    });
    await this.slideRack(false);
    this.stamping = null;
  }

  slideRack(show) {
    this.rack.ready = false;
    S.clack();
    return new Promise((resolve) => this.tweens.add({
      targets: this.rack, x: show ? L.RACK.shownX : L.RACK.hiddenX, duration: 260, ease: 'Cubic.easeOut',
      onUpdate: () => this.layoutRack(),
      onComplete: () => {
        this.rack.ready = show;
        this.layoutRack();
        resolve();
      },
    }));
  }

  stampHome(kind) {
    const [dx, dy] = L.RACK_SLOTS[kind];
    return [Math.round(this.rack.x) + dx, L.RACK.y + dy];
  }

  rackRect() {
    return { x: Math.round(this.rack.x), y: L.RACK.y, w: L.RACK.w, h: L.RACK.h };
  }

  layoutRack() {
    this.rackImg.x = Math.round(this.rack.x);
    for (const kind of ['trust', 'doubt']) {
      if ((this.drag?.kind === 'stamp' && this.drag.which === kind) || this.stampBusy[kind]) continue;
      this.stampImgs[kind].setPosition(...this.stampHome(kind));
    }
  }

  stampAt(x, y) {
    for (const kind of ['trust', 'doubt']) {
      const s = this.stampImgs[kind];
      if (!this.stampBusy[kind] && L.inside({ x: s.x, y: s.y, w: 26, h: 34 }, x, y)) return kind;
    }
    return null;
  }

  grabStamp(kind, x, y) {
    const s = this.stampImgs[kind];
    this.drag = { kind: 'stamp', which: kind, ox: x - s.x, oy: y - s.y };
    s.setDepth(Z.held);
    this.stampShadow.setVisible(true);
    S.clack();
    this.moveStamp(x, y);
  }

  // 印章底部的中點對準哪一條說法，就蓋在哪一條。
  moveStamp(x, y) {
    const d = this.drag;
    const s = this.stampImgs[d.which];
    s.setPosition(clamp(x - d.ox, 0, L.W - 26), clamp(y - d.oy, 0, L.H - 34));
    this.stampShadow.setPosition(s.x + 3, s.y + 3);
    const fx = s.x + 13;
    const fy = s.y + 31;
    const row = this.docAt(fx, fy) ? null : this.entryRects.find((r) => L.inside(r.row, fx, fy));
    const target = row?.claim ?? null;
    if (target !== this.stampTarget) {
      this.stampTarget = target;
      this.pageDirty = true;
    }
  }

  async dropStamp() {
    const kind = this.drag.which;
    const s = this.stampImgs[kind];
    this.drag = null;
    this.stampShadow.setVisible(false);
    const claim = this.stampTarget;
    this.stampTarget = null;
    this.pageDirty = true;
    this.stampBusy[kind] = true;
    if (claim) {
      await this.tweenTo(s, { y: s.y + 3 }, 50, 'Quad.easeIn');
      this.stampClaim(claim, kind);
      await this.wait(80);
    }
    await this.tweenTo(s, { x: this.stampHome(kind)[0], y: this.stampHome(kind)[1] }, 170);
    s.setDepth(Z.stamp);
    this.stampBusy[kind] = false;
    this.layoutRack();
  }

  stampClaim(claim, kind) {
    const entry = this.entryOf(claim);
    // 證人還在台上時改印章不算改主意；翻回前一頁改，就會記下來。
    const current = this.stamping && CLAIMS[claim].witness === this.stamping.wid;
    const changed = E.setPlayerStamp(this.trial, claim, kind, { record: !current });
    S.thud();
    if (!this.reduced) this.cameras.main.shake(90, 0.006);
    if (!changed || !entry) return;
    for (const imp of entry.imprints) imp.crossed = true;
    entry.imprints.push({ canvas: imprint(kind), dx: Phaser.Math.Between(-1, 1), dy: Phaser.Math.Between(-1, 1) });
    this.stats.stamps += 1;
    this.pageDirty = true;
  }

  leave() {
    if (!this.stamping || !this.rack.ready || this.drag) return;
    const blank = WITNESSES[this.stamping.wid].claims.filter((id) => this.trial.heard.includes(id) && !this.trial.player.stamps[id]);
    if (blank.length) this.queueCaption(UI.blank, 'info', true);
    const resolve = this.leaveResolve;
    this.leaveResolve = null;
    resolve?.();
  }

  // —— 字幕和提示 ——

  queueCaption(text, kind = 'info', now = false) {
    const c = { text, kind, t: 0, life: 1800 + [...text].length * 90 };
    if (now) {
      this.captions = [c];
      this.caption = null;
    } else {
      this.captions.push(c);
    }
  }

  // 提示跟著你做了甚麼自己更新；做過一次就不再出現。
  hint() {
    if (this.modal) return null;
    const h = UI.hints;
    if (this.stamping) return h.stamp;
    if (this.mode === 'inspect') return this.selection.length ? h.pickSecond : h.pickFirst;
    if (!this.docs.length) return null;
    if (!this.docs.some((d) => d.onDesk)) return h.drag;
    if (!this.stats.found) return h.loupe;
    if (!this.stats.checks) return h.inspect;
    return null;
  }

  tickCaption(delta) {
    if (this.caption) {
      this.caption.t += delta;
      if (this.caption.t >= this.caption.life) this.caption = null;
    }
    if (!this.caption && this.captions.length) this.caption = this.captions.shift();
    const hint = this.hint();
    const show = this.caption ?? (hint ? { text: hint, kind: 'hint' } : null);
    const key = show ? `${show.kind}|${show.text}` : '';
    if (key === this.captionKey) return;
    this.captionKey = key;
    const ctx = this.captionTex.context;
    ctx.clearRect(0, 0, L.CAPTION.w, L.CAPTION.h);
    if (show) {
      const [color, border] = CAPTION[show.kind];
      const t = this.textOf(show.text, 'caption', { color });
      const w = Math.max(...t.widths) + 12;
      const h = t.height + 5;
      const x = Math.floor((L.CAPTION.w - w) / 2);
      const y = L.CAPTION.h - h;
      P.rect(ctx, x, y, w, h, PAL.black);
      P.frame(ctx, x, y, w, h, border);
      ctx.drawImage(t.canvas, x + 6, y + 3);
    }
    this.captionTex.refresh();
  }

  // —— 彈出視窗：開場、須知、完結 ——

  openModal(kind) {
    return new Promise((resolve) => {
      this.modal = { kind, resolve, again: null };
      const ctx = this.modalTex.context;
      ctx.clearRect(0, 0, L.W, L.H);
      ctx.fillStyle = ctx.createPattern(this.shade, 'repeat');
      ctx.fillRect(0, 0, L.W, L.H);
      if (kind === 'title') this.drawTitle(ctx);
      else if (kind === 'booklet') this.drawBooklet(ctx);
      else this.drawEnd(ctx);
      this.modalTex.refresh();
      this.modalImg.setVisible(true);
    });
  }

  closeModal() {
    const m = this.modal;
    if (!m || m.kind === 'end') return;
    this.modal = null;
    this.modalImg.setVisible(false);
    m.resolve();
  }

  centered(ctx, t, y) {
    ctx.drawImage(t.canvas, Math.floor((L.W - t.width) / 2), y);
  }

  drawTitle(ctx) {
    panel(ctx, 110, 62, 260, 140);
    this.centered(ctx, this.textOf(UI.title, 'title'), 76);
    this.centered(ctx, this.textOf(UI.subtitle, 'body', { color: PAL.wallLight }), 110);
    this.centered(ctx, this.textOf(UI.controls, 'body', { width: 228, color: PAL.wallLight }), 134);
    this.centered(ctx, this.textOf(UI.start, 'bold', { color: PAL.brassLight }), 176);
  }

  drawBooklet(ctx) {
    const x = 70;
    const y = 28;
    const w = 340;
    const h = 214;
    P.dither(ctx, x + 3, y + 3, w, h, PAL.black);
    P.rect(ctx, x, y, w, h, PAL.paper);
    P.frame(ctx, x, y, w, h, PAL.paperShade);
    ctx.drawImage(this.textOf(UI.booklet, 'bold').canvas, x + 12, y + 8);
    P.rect(ctx, x + 12, y + 24, w - 24, 1, PAL.ink);
    let ty = y + 30;
    this.trial.rules.forEach((id, i) => {
      const t = this.textOf(`${UI.numbers[i]}、${RULEBOOK[id]}`, 'body', { width: w - 24, color: PAL.ink });
      ctx.drawImage(t.canvas, x + 12, ty);
      ty += t.height + 4;
    });
    const close = this.textOf(UI.close, 'body', { color: PAL.grey });
    ctx.drawImage(close.canvas, x + w - close.width - 10, y + h - 20);
  }

  drawEnd(ctx) {
    panel(ctx, 24, 12, 432, 246);
    let y = 22;
    const line = (t, gap = 0) => {
      ctx.drawImage(t.canvas, 40, y);
      y += t.height + gap;
    };
    this.centered(ctx, this.textOf(UI.end.title, 'heading'), y);
    y += 28;
    line(this.textOf(fill(UI.end.stats, this.stats), 'body'));
    const belief = UI.end.beliefs[E.beliefOf(this.trial, 'you')];
    line(this.textOf(fill(UI.end.belief, { belief }), 'body', { color: PAL.brassLight }));
    if (!this.stats.found) line(this.textOf(UI.end.missed, 'body', { color: PAL.grey }));
    y += 8;
    line(this.textOf(UI.end.ask, 'body', { color: PAL.brass }), 2);
    UI.end.questions.forEach((q, i) => line(this.textOf(`${i + 1}. ${q}`, 'body', { width: 396 })));
    const again = this.textOf(UI.end.again, 'bold');
    const bw = again.width + 20;
    const bx = Math.floor((L.W - bw) / 2);
    const by = 232;
    P.rect(ctx, bx, by, bw, 17, PAL.brass);
    P.frame(ctx, bx, by, bw, 17, PAL.brassDark);
    P.rect(ctx, bx + 1, by + 1, bw - 2, 1, PAL.brassLight);
    ctx.drawImage(again.canvas, bx + 10, by + 1);
    this.modal.again = { x: bx, y: by, w: bw, h: 17 };
  }

  // —— 輸入 ——

  bindInput() {
    const at = (p) => [Math.floor(p.x), Math.floor(p.y)];
    this.input.on('pointerdown', (p) => this.onDown(...at(p)));
    this.input.on('pointermove', (p) => this.onMove(...at(p)));
    this.input.on('pointerup', (p) => this.onUp(...at(p)));
    this.input.on('pointerupoutside', (p) => this.onUp(...at(p)));
    this.input.keyboard?.on('keydown', (e) => this.onKey(e));
    this.input.keyboard?.addCapture('SPACE,ENTER');
  }

  toolAt(x, y) {
    for (const [id, r] of Object.entries(TOOLS)) if (L.inside(stripRect(r), x, y)) return id;
    if (this.stamping && this.rack.ready && this.mode === 'normal') {
      const r = this.rackRect();
      if (L.inside({ ...L.RACK_LEAVE, x: r.x + L.RACK_LEAVE.x, y: r.y + L.RACK_LEAVE.y }, x, y)) return 'leave';
    }
    return null;
  }

  pressTool(id, down) {
    const img = this.tools[id];
    if (img) img.y = TOOLS[id].y + (down ? 1 : 0);
    if (down) S.clack();
  }

  useTool(id) {
    if (id === 'inspect') this.setMode(this.mode === 'inspect' ? 'normal' : 'inspect');
    else if (id === 'booklet') this.openModal('booklet');
    else if (id === 'prev') this.turnTo(this.pageIndex - 1);
    else if (id === 'next') this.turnTo(this.pageIndex + 1);
    else if (id === 'leave') this.leave();
  }

  toggleSound() {
    S.setMuted(!S.isMuted());
    this.soundImg.setTexture(S.isMuted() ? 'sound-off' : 'sound-on');
    try {
      localStorage.setItem('seventh-seat:desk-muted', S.isMuted() ? '1' : '0');
    } catch {
      // 私密瀏覽時，設定只在今次有效。
    }
  }

  onDown(x, y) {
    S.unlock();
    if (this.modal) {
      if (this.modal.kind !== 'end') this.closeModal();
      else if (L.inside(this.modal.again, x, y)) this.scene.restart();
      return;
    }
    if (this.busy || this.drag) return;
    if (L.inside(L.SOUND, x, y)) {
      this.toggleSound();
      return;
    }
    const tool = this.toolAt(x, y);
    if (tool) {
      this.press = { kind: 'tool', id: tool };
      this.pressTool(tool, true);
      return;
    }
    const onDesk = x >= L.DESK.x && y >= L.DESK.y;
    if (this.mode === 'inspect') {
      if (L.inside(L.DOC_AREA, x, y)) this.pick(x, y);
      else if (!onDesk) this.press = { kind: 'advance', x, y };
      return;
    }
    if (this.stamping && this.rack.ready) {
      const kind = this.stampAt(x, y);
      if (kind) {
        this.grabStamp(kind, x, y);
        return;
      }
      if (L.inside(this.rackRect(), x, y)) return;
    }
    if (this.onLoupe(x, y)) {
      this.grabLoupe(x, y);
      return;
    }
    const doc = this.docAt(x, y);
    if (doc) {
      this.grabDoc(doc, x, y);
      return;
    }
    if (!onDesk) this.press = { kind: 'advance', x, y };
  }

  onMove(x, y) {
    const kind = this.drag?.kind;
    if (kind === 'doc') this.moveDoc(x, y);
    else if (kind === 'loupe') this.moveLoupe(x, y);
    else if (kind === 'stamp') this.moveStamp(x, y);
    this.updateCursor(x, y);
  }

  onUp(px, py) {
    const x = clamp(px, 0, L.W - 1);
    const y = clamp(py, 0, L.H - 1);
    const press = this.press;
    if (press) {
      this.press = null;
      if (press.kind === 'tool') {
        this.pressTool(press.id, false);
        if (this.toolAt(x, y) === press.id) this.useTool(press.id);
      } else if (Math.abs(x - press.x) + Math.abs(y - press.y) < 8) {
        this.advance();
      }
      return;
    }
    const kind = this.drag?.kind;
    if (kind === 'doc') this.dropDoc();
    else if (kind === 'loupe') this.drag = null;
    else if (kind === 'stamp') this.dropStamp();
    this.updateCursor(x, y);
  }

  onKey(e) {
    if (e.repeat) return;
    const k = e.key;
    if (k === 'm' || k === 'M') {
      this.toggleSound();
      return;
    }
    if (this.modal) {
      S.unlock();
      if (this.modal.kind !== 'end' && [' ', 'Enter', 'Escape'].includes(k)) this.closeModal();
      else if (this.modal.kind === 'end' && k === 'Enter') this.scene.restart();
      return;
    }
    if (k === 'Escape' && this.mode === 'inspect') this.setMode('normal');
    else if (k === ' ' || k === 'Enter' || k === 'ArrowRight') this.advance();
  }

  updateCursor(x, y) {
    let c = 'default';
    if (this.drag) c = 'grabbing';
    else if (this.modal) c = this.modal.kind !== 'end' || L.inside(this.modal.again, x, y) ? 'pointer' : 'default';
    else if (L.inside(L.SOUND, x, y) || this.toolAt(x, y)) c = 'pointer';
    else if (this.mode === 'inspect') c = this.items.some((i) => L.inside(grow(i.rect, 2), x, y)) ? 'pointer' : 'default';
    else if ((this.stamping && this.rack.ready && this.stampAt(x, y)) || this.onLoupe(x, y) || this.docAt(x, y)) c = 'grab';
    else if (x < L.DESK.x || y < L.DESK.y) c = 'pointer';
    if (c !== this.cursor) {
      this.cursor = c;
      this.game.canvas.style.cursor = c;
    }
  }

  // —— 每一格 ——

  update(time, delta) {
    this.tickTyping(delta);
    this.tickWriting(delta);
    this.tickPortrait(time);
    this.tickLoupe(delta);
    this.tickLine(delta);
    this.tickCaption(delta);
    this.moreImg.setVisible(!!this.waiting && !this.typing && Math.floor(time / 400) % 2 === 0);
    if (this.walking) this.witnessImg.y = 25 - (Math.floor(this.witnessImg.x / 4) % 2);
    if (this.pageDirty) {
      this.pageDirty = false;
      this.drawPage();
    }
  }

  tickTyping(delta) {
    const t = this.typing;
    if (!t) return;
    const before = Math.floor(t.shown);
    t.shown = Math.min(t.text.length, t.shown + delta * t.voice.speed);
    const now = Math.floor(t.shown);
    if (now !== before) {
      this.drawDialogue(t.text.slice(0, now), t.voice.color);
      if (t.voice.pitch && now % 2 === 0 && !PUNCT.includes(t.text[now - 1])) S.blip(t.voice.pitch * (0.94 + Math.random() * 0.12));
    }
    if (t.shown >= t.text.length) {
      this.typing = null;
      t.resolve?.();
    }
  }

  tickWriting(delta) {
    const w = this.writing[0];
    if (!w) return;
    const before = w.item.shown;
    w.item.shown = Math.min(w.total, before + delta * WRITE_SPEED);
    if (Math.floor(w.item.shown / 16) !== Math.floor(before / 16)) S.pen();
    if (w.item.shown >= w.total) this.writing.shift();
    this.pageDirty = true;
  }

  tickPortrait(time) {
    const v = this.voice;
    let key = 'pt-empty';
    if (v.portrait) {
      const talking = this.typing?.voice === v;
      const frame = talking ? Math.floor(time / 110) % 2 : time % 3600 < 140 ? 2 : 0;
      key = `pt-${v.portrait}-${frame}`;
    }
    if (this.portraitImg.texture.key !== key) this.portraitImg.setTexture(key);
    const head = v.head && (v.head !== 'witness' || this.onStand) ? L.HEADS[v.head] : null;
    this.tickImg.setVisible(!!head);
    if (head) this.tickImg.setPosition(head[0] - 2, head[1] - 8 - (Math.floor(time / 320) % 2));
  }
}
