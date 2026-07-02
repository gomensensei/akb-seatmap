# AKB48 Theater Seat Memo | 劇場座位備忘 | 劇場座席メモ

![Version](https://img.shields.io/badge/Version-2026.07.03-pink)
![License](https://img.shields.io/badge/License-Non--Commercial-blue)
![Platform](https://img.shields.io/badge/Platform-Web-orange)
![Cloud Save](https://img.shields.io/badge/Cloud%20Save-Optional-lightblue)
![Mobile](https://img.shields.io/badge/Mobile-Optimized-ff69b4)

---

## Project Overview | 專案簡介 | プロジェクト概要

**[ZH]** AKB48 Theater Seat Memo 是一個非官方劇場座位與入場抽選紀錄工具。它可以保存座位、立見位置、公演日期、公演名稱、入場番號、巡目與抽選順序，並輸出成圖片，方便保存劇場回憶。

**[EN]** AKB48 Theater Seat Memo is an unofficial fan-made tool for recording theater seats, standing spots, and entry lottery notes. Save seat position, performance details, entry number, round, and lottery order, then export a polished memo image.

**[JP]** AKB48 Theater Seat Memo は、劇場の座席、立見位置、入場抽選記録を残すための非公式ファンツールです。座席、公演日、公演名、入場番号、巡目、抽選順を保存し、記録画像として出力できます。

---

## Main Features | 功能說明 | 主な機能

### 1. Interactive Seat Map
* **[ZH]** 點選座位或立見位置，即時生成座位 label 與備忘內容。
* **[EN]** Select seats or standing spots and generate seat labels plus memo content instantly.
* **[JP]** 座席や立見位置を選択し、座席 label とメモ内容を作成できます。

### 2. Entry Lottery Record
* **[ZH]** 可記錄入場抽選範圍、巡目、自己的號碼位置與當日排序。
* **[EN]** Record entry lottery ranges, rounds, personal range, and call order.
* **[JP]** 入場抽選の番号範囲、巡目、自分の番号位置、呼び出し順を記録できます。

### 3. Distribution Dashboard
* **[ZH]** 支援 range x called order heatmap、前中後段平均、月份/日期分析與相鄰 range gap。
* **[EN]** Includes range x called order heatmap, segment averages, date/month views, and adjacent range gap analysis.
* **[JP]** range x called order heatmap、前中後段平均、日付/月別分析、隣接 range gap 分析に対応します。

### 4. Image Export
* **[ZH]** 座位備忘與入場抽選紀錄都可以輸出成圖片。
* **[EN]** Seat memos and lottery records can both be exported as images.
* **[JP]** 座席メモと入場抽選記録を画像として出力できます。

### 5. Optional Tool48 Account / Cloud Save
* **[ZH]** 不登入也可完整使用；登入後可保存、讀取、更新、刪除 cloud records。
* **[EN]** Fully usable without login; signed-in users can save, load, update, and delete cloud records.
* **[JP]** ログインなしで利用可能です。ログイン後は cloud records の保存、読み込み、更新、削除ができます。

---

## Technical Highlights | 技術亮點 | 技術的特徴

* **SVG Seat Overlay**: Seat positions are handled with structured coordinate data.
* **Chart-style Analytics**: Lottery data is transformed into heatmaps and segment summaries.
* **Local-first Workflow**: Seat memo and lottery tools remain usable without account login.
* **Supabase RLS-ready Cloud Save**: Cloud records are owner-scoped and optional.
* **Privacy-first Design**: We will not disclose personal data without explicit consent.

---

## Cloud Database Notes | 雲端資料表 | クラウドデータ

Cloud save uses:

```text
public.seat_memo_records
```

Recommended columns include:

```text
user_id
event_date
performance_id
performance_title
seat_label
payload
public_consent
public_status
created_at
updated_at
```

If cloud save returns a permission error, review:

```text
SUPABASE_SEAT_MEMO_CLOUD_FIX.sql
```

---

## Quick Start | 快速開始 | クイックスタート

1. Keep all files in the same folder.
2. Open `index.html`, or start a local server if browser restrictions apply.
3. Select a language, choose a seat or lottery tab, then save/export.

```bash
python -m http.server 4180
```

Open:

```text
http://127.0.0.1:4180/
```

---

## File Structure | 檔案結構 | ファイル構成

* `index.html` - Main UI, tabs, account popover, seat memo, lottery dashboard.
* `style.css` - Seat UI, responsive rules, account popover, dashboard layout.
* `script.js` - Seat selection, export, cloud save, lottery analytics.
* `langs.json` - Multilingual UI copy.
* `seatmap-data.js` - Seat and standing-position coordinates.
* `core.css` / `core.js` - Shared visual and interaction helpers.
* `assets/seatmap.svg` - Seat map artwork.
* `SUPABASE_SEAT_MEMO_CLOUD_FIX.sql` - Database grants / RLS helper.

---

## Maintenance | 維護 | メンテナンス

* Update visible text in `langs.json`.
* Update map coordinates in `seatmap-data.js`.
* Keep the mobile comfort pass around narrow widths such as `390x844`.
* Keep Tool48 Account optional and local save available.
* When adding cloud tables, check both RLS policies and explicit grants.

---

## Disclaimer | 免責聲明 | 免責事項

**[ZH]** 本專案為非官方、非商業粉絲工具，只供個人紀錄、fan 交流與保存回憶使用。它與 AKB48、DH、劇場營運或任何官方機構無關。所有名稱、商標、座位圖素材及相關權利屬各自權利持有人。

**[EN]** This is an unofficial, non-commercial fan-made tool for personal records, fan communication, and preserving memories only. It is not affiliated with AKB48, DH, theater management, or any official organisation. All names, trademarks, seat-map materials, and related rights belong to their respective holders.

**[JP]** 本プロジェクトは、個人記録、ファン交流、思い出保存を目的とした非公式・非商用ファンツールです。AKB48、DH、劇場運営、その他公式団体とは関係ありません。名称、商標、座席図素材、関連する権利は各権利者に帰属します。

---

## Created by | 製作 | 制作

**ゴメン先生 (gomensensei)**
