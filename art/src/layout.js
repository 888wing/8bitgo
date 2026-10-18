// 480×270 的版面。上面是法庭，左下是證人特寫和對白，右下是你的陪審桌。

export const W = 480;
export const H = 270;

export const COURT = { x: 0, y: 0, w: 480, h: 96 };
export const SOUND = { x: 463, y: 3, w: 14, h: 12 };
export const CAPTION = { x: 152, y: 56, w: 326, h: 38 };

export const BOOTH = { x: 0, y: 96, w: 150, h: 174 };
export const PORTRAIT = { x: 43, y: 101, w: 64, h: 66 };
export const NAME = { x: 6, y: 170, w: 138, h: 14 };
export const DIALOGUE = { x: 6, y: 186, w: 138, h: 80 };

export const DESK = { x: 150, y: 96, w: 330, h: 174 };
export const NOTEBOOK = { x: 154, y: 100, w: 172, h: 148 };
export const PAGE = { x: 160, y: 110, w: 160, h: 130 };
export const TRAY = { x: 330, y: 100, w: 146, h: 28 };
export const SLOTS = { x: 364, y: 105, step: 28 };
export const DOC_AREA = { x: 150, y: 96, w: 330, h: 154 };

// 桌邊的工具槽：按鈕的感應範圍是整條槽的高度。
export const STRIP = { y: 250, h: 20 };
export const INSPECT = { x: 154, y: 253, w: 44, h: 15 };
export const BOOKLET = { x: 202, y: 253, w: 44, h: 15 };
export const PAGE_PREV = { x: 250, y: 253, w: 18, h: 15 };
export const PAGE_NEXT = { x: 270, y: 253, w: 18, h: 15 };
export const PAGE_NO = { x: 292, y: 256, w: 24, h: 10 };

// 放大鏡：LOUPE_HOME 是鏡片中心；鏡片中心只可以在 LOUPE_BOUNDS 裡移動。
export const LOUPE_HOME = { x: 352, y: 228 };
export const LOUPE_R = 20;
export const LENS_R = 19;
export const LOUPE_BOUNDS = { x: 171, y: 117, w: 289, h: 133 };

export const RACK = { y: 134, w: 52, h: 104, shownX: 426, hiddenX: 484 };
export const RACK_SLOTS = { trust: [13, 6], doubt: [13, 46] };
export const RACK_LEAVE = { x: 4, y: 85, w: 44, h: 15 };

// 法庭裡各人的頭頂，說話時在這裡閃一下。
export const HEADS = {
  judge: [240, 12], witness: [90, 27], prosecutor: [184, 53], defense: [296, 53], usher: [131, 43], defendant: [396, 43],
};

export const inside = (r, x, y) => !!r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
