# 第七席（8bitgo）

法庭版 *Papers, Please*：8-bit、劇情主導、多結局的裁決模擬遊戲，你是七人陪審團的第七席。設計寫在 `README.md` 和 `docs/`；已經定下來的事在 `docs/decisions.md`，除非原型推翻它，否則不重新討論。

## 語言

- 文件、程式註解、畫面上的字：香港繁體中文書面語，短句、直接。
- 角色的對白：粵語口語。
- commit 訊息：英文。

## 結構

| 位置 | 內容 |
|---|---|
| `prototype/case.js` | 案件資料：證人、說法、證物、理由、陪審員、對白。改內容只改這裡 |
| `prototype/engine.js` | 規則：純邏輯，不碰畫面；文字原型、桌面切片、測試和模擬都用它 |
| `prototype/main.js`、`prototype/index.html` | 文字原型的畫面 |
| `prototype/desk/` | 桌面手感切片：Phaser 3.90，480×270，佔位美術 |
| `art/style-frame/` | 風格定稿圖和證物樣板：美術的目標樣子 |

## 指令

- 測試：`cd prototype && npm test`
- 平衡模擬：`cd prototype && npm run sim`
- 打包：`node prototype/build.js`，產生 `prototype/dist/index.html` 和 `desk.html`，雙擊就可以玩（`desk.html` 要連網載入 Phaser 和字型）。
- 開發時 ES 模組要經伺服器載入：在 repo 根目錄執行 `python3 -m http.server 8000`，然後打開 http://localhost:8000/prototype/ （文字原型）、http://localhost:8000/prototype/desk/ （桌面）、http://localhost:8000/art/style-frame/ （定稿圖）。

## 規則

- 每個系統都要過一關：它令蓋章更難，還是更重？兩樣都不是，就不做。
- 故事在虛構的霧港：畫面上不寫真實的地名、機構和徽章（不寫「香港」「皇家」），用霧港、霧港警察、《霧港日報》這類虛構的名字。
- 美術照 `docs/06-art.md`：32 色、480×270 按整數倍放大、不旋轉、不用平滑的透明和漸變、紅色只表示矛盾和「不予採納」。
- 改了 `case.js` 或 `engine.js`，要跑測試；改了畫面，要在瀏覽器實際玩一次。
