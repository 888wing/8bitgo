# 第七席 Godot 版（greybox）

完整一局的 greybox：傳票、序幕、五天（早晨、法庭、評議室、表決、夜晚）、第四天視察現場、第五天的最後表決和替代罪名，以及十個結局。流程照 [02 流程](../docs/02-flow.md)，案件照 [04 範例案件](../docs/04-case.md)。

- **美術：** 法庭桌面由網頁版（Phaser 3.90，最後一版在 commit `3a3a819`）搬過來，三件證物是風格定稿的畫法；其餘全部是佔位圖，評議室、夜晚、早晨、視察現場只用幾塊顏色交代地點。規格見 [06 美術規範](../docs/06-art.md)。
- **內容：** 第一、二天是文字原型試過的；第三至五天、提問紙條、夜晚的選擇、早晨和結局是初稿，在 `prototype/case.js` 標了「初稿」。
- **一局：** 一直投未決，約一小時；第一天投有罪，約十五分鐘。

## 怎樣玩

- 用 Godot 4.7 打開 `game/project.godot`，按 F5；或者在 repo 根目錄執行 `godot --path game`。
- 網頁版：`godot --headless --path game --export-release Web ../build/web/index.html`，然後 `python3 -m http.server -d build/web 8000`，打開 http://localhost:8000 。不用連網。
- 法庭：點左下角的對白框或按空白鍵聽下一句；拖證物、放大鏡和印章；「對照」「須知」◀ ▶；證人退庭前可以按「紙條」問一條問題（每天一張）；法官剔除說法時，印章盤只有紅色的「不予採納」。
- 評議室：按右邊的「出示理由」「追問」「指出違規」「提請表決」，再揀證物和人；三個動作之後投票。最後一天沒有「未決」，可能多一項「縱火」。
- 其他頁：按一下或按空白鍵聽下一句；夜晚揀一個選項。喇叭或 M 鍵靜音；桌面版另外有 F11 全螢幕。

## 檔案

| 檔案 | 內容 |
|---|---|
| `scenes/main.tscn`、`scripts/main.gd` | 入口：480×270 的子視窗、放大倍數、手機直放提示，以及給自動試玩讀的 `window.__desk.state()` |
| `scripts/game.gd` | 一局的流程：傳票、序幕、五天、夜晚、結局、回顧。同一時間只顯示一頁 |
| `scenes/desk.tscn` | 法庭桌面：固定的美術全部在這裡，用編輯器打開就看得到整張桌 |
| `scripts/desk/desk.gd` | 法庭的一天：對白、筆記本（每頁三個說法，多了開續頁）、證物、放大鏡、對照、蓋章、「不予採納」、紙條、須知 |
| `scripts/screens/story.gd` | 故事頁：傳票、序幕、早晨、夜晚的選擇、裁決和尾聲 |
| `scripts/screens/room.gd` | 評議室：黑板、鐘、四個動作、選票、唱票、延長評議 |
| `scripts/screens/site.gd` | 第四天視察現場：點一下想看清楚的地方 |
| `scripts/screens/ending.gd` | 結局之後的回顧：你的票、你的筆記本、排期表 |
| `scripts/ui/` | 對白框、選項框、說話的人（名字、字色、嗶聲、特寫） |
| `scripts/desk/layout.gd` | 版面上每一樣東西的位置和大小 |
| `scripts/desk/art.gd` | 美術的入口；另外即場做每一下都不同的印、鏡片的圓形、網點陰影 |
| `scripts/desk/fit.gd` | 放大倍數（[06 §2](../docs/06-art.md#2-畫布和放大)） |
| `scripts/desk/sound.gd` | 即場合成的音效 |
| `scripts/pixel/` | 32 色、在 Image 上畫點的工具、點陣字 |
| `scripts/rules/` | 規則和案件資料。`rules.gd` 由 `prototype/engine.js` 移植，`tests/test_rules_trace.gd` 逐步對照 JS 版的結果 |
| `data/case.json` | 案件資料，由 `prototype/case.js` 輸出：內容只改 `case.js`，然後在 repo 根目錄執行 `npm run case` |
| `data/ui.json` | 畫面上的字（介面、地點、選票、回顧） |
| `art/` | 美術，由 `npm run bake` 輸出（見下面） |
| `tests/` | 無頭測試 |
| `tools/capture.tscn` | 開發用：開一個視窗，推進到第一天證物送齊，截一張圖 |

## 美術

`game/art/` 裡的 PNG 全部由 `art/src/` 的程式畫法輸出：在 repo 根目錄執行 `npm run bake`（用本機的 Chrome，要連網載入字型）。跟現有檔案逐點相同的圖不會重寫。

| 資料夾 | 內容 | 畫法 |
|---|---|---|
| `court/` | 法庭、證人小人、頭頂的小三角 | `art/src/placeholder.js`（佔位） |
| `booth/` | 特寫框、名牌、對白框；人像每人一排三格：閉嘴、開口、眨眼 | 同上 |
| `desk/` | 桌面、筆記本、托盤、工具槽的按鈕、放大鏡 | 同上 |
| `rack/` | 印章盤、印章、印（缺墨在遊戲裡即場加） | 同上 |
| `evidence/` | 每件證物的原大、兩倍、小圖，以及 `evidence.json`（尺寸和細節位置） | `art/src/evidence.js`（定稿） |
| `fonts/` | 點陣字表：每款字一張圖和一個 `.json` | `art/bake/bake.js` |
| `palette.json` | 32 色 | `art/src/palette.js` |

換掉一張佔位圖有兩個方法：

1. 照 `art/style-frame/frame.js` 的做法改 `art/src/placeholder.js` 裡的畫法，再 `npm run bake`。
2. 直接畫一張 PNG，放在同一個位置、同一個尺寸，並把它從 `placeholder.js` 的 `TEXTURES` 表刪掉，免得下次輸出時被蓋過。

`tests/test_art.gd` 會檢查每張圖只用 32 色、每一點不是全透明就是全不透明、尺寸放得進版面上的位置。

**點陣字：** 遊戲裡即場排的字（對白、筆記、字幕）用 `fonts/` 的字表逐個字拼出來。字表由 Chrome 把網頁字型壓成全有或全無的點，每個字按 0、¼、½、¾ 像素的位置各畫一次；排字時用最接近的一格，所以結果跟網頁版整句畫的逐點相同。案件或介面加了新的字，要重新 `npm run bake`；`tests/test_art.gd` 會列出缺了的字。

**注意：** 不同系統的 Chrome 把同一個字壓成點陣，邊緣會有少數點不同（風格定稿圖在 cloud 的 Linux 畫，這裡用 macOS 重畫，字上有約 1,200 點不同，字以外逐點相同）。所以 `npm run bake` 只對照、不覆蓋定稿圖；字表要固定在同一部機器上輸出。正式版換成點陣字型（[06 §4](../docs/06-art.md#4-字)）之後，這個問題就沒有了。

## 測試

在 repo 根目錄：

- `npm run test:godot`：規則（第一、二天逐步對照 JS 版；第三至五天、夜晚、結局、每個結局都走得到）、美術規範、點陣字、放大倍數、桌面場景、整局冒煙測試。
- `npm run check`：自動試玩。先匯出網頁版（debug），再用本機的 Chrome 打開，用真的滑鼠玩完整一局：五天的證物、放大鏡、對照、蓋章、「不予採納」、紙條、評議室的四個動作、揭發羅生、四個夜晚、視察現場、最後表決、結局和回顧；另外玩一次「一日審判」和靜音，用觸控事件在手機尺寸玩一段，並檢查各種尺寸的放大倍數、直放提示、沒有橫向捲動、沒有任何錯誤。截圖在 `build/check/`。加 `-- --skip-export` 用上一次匯出的版本，加 `-- --only=full`（或 oneday、touch、sizes）只跑一段。

## 已知的限制

- greybox：除了三件證物，美術和音效都是佔位的；沒有環境聲和音樂。評議室沒有陪審員的頭像，只有黑板上的名字。
- 第三至五天的內容是初稿；平衡只確認了每個結局都走得到，未做大量模擬。
- 真結局（要其他席位的知識）未做。
- 證物、放大鏡和印章只可以用滑鼠或手指操作；鍵盤只可以聽下一句（空白鍵、Enter）、退出對照（Esc）和靜音（M）。
- 減少動態：網頁版跟系統設定；桌面版要加 `-- --reduce-motion`。
- 手機要橫放；直放時畫面只有 ×2。
