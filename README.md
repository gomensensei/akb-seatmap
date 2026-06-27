# AKB48 Theater Seat Memo

## 繁體中文

AKB48 Theater Seat Memo 是一個非官方的粉絲小工具，用來快速記錄 AKB48 劇場座位或站位。使用者可以在座位圖上選擇位置，加入公演名稱、活動日期、顯示名稱、號碼及巡回/入場輪次，然後輸出成圖片或複製分享連結。

### 主要功能

- 互動式座位圖，可點選座位或站位。
- 粉紅箭咀標示目前選擇的位置。
- 支援地圖縮放，方便手機及桌面查看。
- 可填寫公演名稱、活動日期及可選個人資料。
- 可輸出座位記錄圖片。
- 支援分享連結，方便保留或傳送選擇結果。
- 支援多語言介面，包括繁體中文、英文、日文等。
- 手機版已針對標題區、座位圖及表單密度作優化。

### 使用方法

1. 開啟 `index.html`。
2. 選擇介面語言。
3. 在座位圖上點選座位或站位。
4. 填寫公演、日期、名稱、號碼或輪次等資料。
5. 按「儲存圖片」輸出座位記錄，或按「複製分享連結」保留目前狀態。

如瀏覽器阻止本機檔案功能，可用簡單的本地伺服器開啟：

```bash
python -m http.server 4179
```

然後前往 `http://127.0.0.1:4179/`。

### 檔案結構

- `index.html`：主頁面。
- `style.css`：主要畫面樣式及手機版調整。
- `core.css`：共用 UI 基礎樣式。
- `script.js`：座位互動、輸出圖片及分享連結邏輯。
- `core.js`：共用互動效果。
- `seatmap-data.js`：座位資料。
- `langs.json`：多語言文字。
- `assets/seatmap.svg`：座位圖。
- `assets/seatmap-reference.png`：座位圖參考圖片。

### 聲明

本工具為粉絲製作的非官方網站，與 AKB48 營運或相關公司沒有從屬、授權或合作關係。所有名稱、標誌及相關權利均屬其各自權利持有人。

---

## English

AKB48 Theater Seat Memo is an unofficial fan-made tool for recording an AKB48 Theater seat or standing position. You can select a position on the seat map, add performance details, event date, display name, number, and entry round, then export the result as an image or copy a share link.

### Features

- Interactive seat map for seats and standing-area slots.
- Pink arrow marker for the selected position.
- Map zoom controls for both desktop and mobile use.
- Optional fields for performance, event date, display name, number, and entry round.
- Image export for saving your seat memo.
- Share-link support for preserving or sending the current selection.
- Multilingual UI, including Traditional Chinese, English, Japanese, and more.
- Mobile-friendly layout with a compact header, clearer map area, and denser form spacing.

### How to Use

1. Open `index.html`.
2. Choose your language.
3. Tap or click a seat or standing position on the map.
4. Fill in the performance, date, name, number, or round fields if needed.
5. Select "Save image" to export your memo, or "Copy share link" to keep the current state.

If your browser blocks local-file behavior, serve the folder locally:

```bash
python -m http.server 4179
```

Then open `http://127.0.0.1:4179/`.

### File Structure

- `index.html`: Main page.
- `style.css`: Main layout styles and mobile refinements.
- `core.css`: Shared UI base styles.
- `script.js`: Seat interaction, image export, and share-link logic.
- `core.js`: Shared interaction effects.
- `seatmap-data.js`: Seat data.
- `langs.json`: Multilingual UI strings.
- `assets/seatmap.svg`: Seat map artwork.
- `assets/seatmap-reference.png`: Reference seat map image.

### Disclaimer

This is an unofficial fan-made website. It is not affiliated with, endorsed by, or operated by AKB48 management or related companies. All names, marks, and related rights belong to their respective rights holders.

---

## 日本語

AKB48 Theater Seat Memo は、AKB48 劇場の座席または立ち見位置を記録するための非公式ファンツールです。座席表から位置を選び、公演名、日時、表示名、番号、入場順などを入力して、画像として保存したり、共有リンクをコピーしたりできます。

### 主な機能

- 座席および立ち見エリアを選択できるインタラクティブな座席表。
- 選択した位置をピンクの矢印で表示。
- デスクトップとスマートフォンの両方で使いやすいズーム操作。
- 公演名、日時、表示名、番号、入場順などの任意入力欄。
- 座席メモを画像として保存。
- 現在の選択状態を共有リンクとしてコピー。
- 繁体字中国語、英語、日本語などに対応した多言語 UI。
- スマートフォン向けに、ヘッダー、座席表、フォームの表示密度を調整済み。

### 使い方

1. `index.html` を開きます。
2. 表示言語を選択します。
3. 座席表上の座席または立ち見位置を選択します。
4. 必要に応じて、公演名、日時、名前、番号、入場順などを入力します。
5. 「画像を保存」で座席メモを出力するか、「共有リンクをコピー」で現在の状態を保存します。

ブラウザでローカルファイルの動作が制限される場合は、フォルダ内で簡易ローカルサーバーを起動してください。

```bash
python -m http.server 4179
```

その後、`http://127.0.0.1:4179/` を開きます。

### ファイル構成

- `index.html`：メインページ。
- `style.css`：主要レイアウトとスマートフォン向け調整。
- `core.css`：共通 UI ベーススタイル。
- `script.js`：座席選択、画像出力、共有リンク処理。
- `core.js`：共通インタラクション効果。
- `seatmap-data.js`：座席データ。
- `langs.json`：多言語 UI テキスト。
- `assets/seatmap.svg`：座席表画像。
- `assets/seatmap-reference.png`：座席表の参考画像。

### 免責事項

このツールはファン制作の非公式サイトです。AKB48 の運営または関連会社とは関係がなく、承認・提携・運営されているものではありません。名称、ロゴ、その他の権利はそれぞれの権利者に帰属します。
