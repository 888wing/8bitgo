// 桌面版的入口：先載入畫面要用到的字，再按螢幕的實際像素找最大的整數倍，開法庭。
import * as C from '../case.js';
import * as L from './layout.js';
import * as S from './sound.js';
import { CourtScene, UI } from './court.js';

const MUTE_KEY = 'seventh-seat:desk-muted';

// 網頁字型按字分成很多小檔；先把用得著的字全部載入，畫布上的字才不會用了後備字型。
async function loadFonts() {
  if (!document.fonts?.load) return;
  const used = JSON.stringify([C.WITNESSES, C.CLAIMS, C.EXHIBITS, C.REASONS, C.THOUGHTS, C.RULEBOOK, C.DAYS, UI]);
  const text = [...new Set(`${used}0123456789/`)].join('');
  const faces = ['400 12px "Noto Sans TC"', '500 13px "Noto Sans TC"', '700 12px "Noto Sans TC"', '700 12px "LXGW WenKai TC"'];
  const timeout = new Promise((resolve) => setTimeout(resolve, 8000));
  await Promise.race([Promise.allSettled(faces.map((f) => document.fonts.load(f, text))), timeout]);
}

// 畫布永遠是 480×270，按螢幕實際像素的整數倍放大：每一個像素都是同樣大小的方格。
// 高解像度的手機上，整數倍會浪費太多位置時，改用剛好放得下的倍數；
// 那時每個像素至少有三個實際像素，粗細不勻看不出來，但字和按鈕大得多。
function fit(game) {
  const dpr = window.devicePixelRatio || 1;
  const body = document.body;
  const style = getComputedStyle(body);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const rotate = document.getElementById('rotate');
  rotate.hidden = !(window.innerHeight > window.innerWidth && window.innerWidth < 700);
  const notice = rotate.hidden ? 0 : rotate.offsetHeight + 8;
  const fitW = ((body.clientWidth - padX) * dpr) / L.W;
  const fitH = ((body.clientHeight - padY - notice) * dpr) / L.H;
  const best = Math.min(fitW, fitH);
  let k = Math.max(1, Math.floor(best));
  const touch = window.matchMedia?.('(pointer: coarse)').matches;
  if (touch && best >= 3 && best / k > 1.15) k = best;
  game.scale.setZoom(k / dpr);
}

async function boot() {
  // 發佈時外框由平台提供，這裡補上語言，讀屏軟件才知道是香港繁體中文。
  if (!document.documentElement.lang) document.documentElement.lang = 'zh-Hant-HK';
  const mount = document.getElementById('game');
  if (!window.Phaser) {
    mount.textContent = '載入不到遊戲引擎 Phaser，請確認已經連上網絡，再重新整理。';
    return;
  }
  try {
    S.setMuted(localStorage.getItem(MUTE_KEY) === '1');
  } catch {
    // 私密瀏覽：預設有聲。
  }
  await loadFonts();
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: mount,
    width: L.W,
    height: L.H,
    pixelArt: true,
    backgroundColor: '#141716',
    banner: false,
    audio: { noAudio: true },
    input: { activePointers: 1 },
    disableContextMenu: true,
    scale: { mode: Phaser.Scale.NONE },
    scene: [CourtScene],
  });
  const refit = () => fit(game);
  game.events.once('ready', refit);
  window.addEventListener('resize', refit);
  // 自動測試用：讀狀態，不改規則。
  window.__desk = { game, scene: () => game.scene.getScene('court') };
}

boot();
