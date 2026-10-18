# 第七席（8bitgo）

法庭版 *Papers, Please*：8-bit、劇情主導、多結局的裁決模擬遊戲，你是七人陪審團的第七席。設計寫在 `README.md` 和 `docs/`；已經定下來的事在 `docs/decisions.md`，除非原型推翻它，否則不重新討論。

## 語言

- 文件、程式註解、畫面上的字：香港繁體中文書面語，短句、直接。
- 角色的對白：粵語口語。
- commit 訊息：英文。

## 結構

| 位置 | 內容 |
|---|---|
| `prototype/case.js` | 案件資料：證人、說法、證物、理由、陪審員、對白。改內容只改這裡，然後 `npm run case` 寫成 `game/data/case.json` |
| `prototype/engine.js` | 規則（JS 版）：純邏輯，不碰畫面；文字原型、測試和模擬用它 |
| `prototype/main.js`、`prototype/index.html` | 文字原型的畫面 |
| `game/` | Godot 4.7 版：第一天的法庭桌面，480×270。說明見 `game/README.md` |
| `game/scripts/rules/` | 規則（Godot 版）：由 `engine.js` 移植，測試逐步對照 JS 版的結果 |
| `art/src/` | 美術的程式畫法：32 色、畫點工具、版面、佔位圖、證物。證物只有這一份畫法 |
| `art/style-frame/` | 風格定稿圖和證物樣板：美術的目標樣子 |
| `art/bake/`、`tools/` | 美術輸出（`npm run bake`）、案件資料輸出、自動試玩（`npm run check`） |

## 指令

以下在 repo 根目錄執行（第一次先 `npm install`）：

- 測試：`npm test`（規則、內容、美術規範的 JS 測試）和 `npm run test:godot`（Godot 版）。
- 自動試玩：`npm run check`。匯出 Godot 網頁版，用本機的 Chrome 玩第一天；截圖在 `build/check/`。
- 美術輸出：`npm run bake`。把 `art/src` 畫成 `game/art/` 的 PNG 和點陣字表；要連網載入字型。
- 案件資料：改了 `prototype/case.js`，執行 `npm run case`。
- 玩 Godot 版：`godot --path game`，或用 Godot 4.7 打開 `game/project.godot`。
- 平衡模擬：`cd prototype && npm run sim`
- 文字原型：`node prototype/build.js`，產生 `prototype/dist/index.html`，雙擊就可以玩。
- 開發時 ES 模組要經伺服器載入：在 repo 根目錄執行 `python3 -m http.server 8000`，然後打開 http://localhost:8000/prototype/ （文字原型）、http://localhost:8000/art/style-frame/ （定稿圖）、http://localhost:8000/art/style-frame/evidence.html （證物樣板）。

## 規則

- 每個系統都要過一關：它令蓋章更難，還是更重？兩樣都不是，就不做。
- 故事在虛構的霧港：畫面上不寫真實的地名、機構和徽章（不寫「香港」「皇家」），用霧港、霧港警察、《霧港日報》這類虛構的名字。
- 美術照 `docs/06-art.md`：32 色、480×270 按整數倍放大、不旋轉、不用平滑的透明和漸變、紅色只表示矛盾和「不予採納」。
- 美術只用 `art/src/palette.js` 的 32 色；Godot 版的圖全部由 `npm run bake` 輸出，或者照同一規格手畫（見 `game/README.md`）。
- 改了 `case.js` 或 `engine.js`，要跑測試；改了 Godot 的畫面，要跑 `npm run check`，並看過截圖。
