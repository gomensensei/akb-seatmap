# AKB48 Theater Seat Memo / Tool48 Seat Memo

![Version](https://img.shields.io/badge/Version-2026.06.29-pink)
![Platform](https://img.shields.io/badge/Platform-Web-orange)
![Cloud Save](https://img.shields.io/badge/Cloud%20Save-Optional-blue)
![Mobile](https://img.shields.io/badge/Mobile-Optimized-ff69b4)
![License](https://img.shields.io/badge/License-Non--Commercial-lightgrey)

---

## Project Overview

### 繁體中文

AKB48 Theater Seat Memo 是一個非官方、非商業的劇場座位與入場紀錄工具。  
它可以用來記錄劇場座位、立見位置、公演日期、公演名稱、入場番號與巡目，並輸出成圖片，方便保留或分享劇場回憶。

本工具仍然保持本機可用：不登入也可以正常使用座位圖、抽選入場紀錄、圖片輸出與分享連結。  
Tool48 Account / Cloud Save 只是可選功能，用戶登入後可以把座位 memo 或抽選入場紀錄保存到 Supabase 雲端。

### English

AKB48 Theater Seat Memo is an unofficial, non-commercial fan tool for recording theater seats, standing positions, and entry lottery notes.  
Users can select a seat on the map, add performance details, date, display name, ticket number, and entry round, then export a polished memo image.

The app remains fully usable without login. Tool48 Account / Cloud Save is an optional enhancement for users who want to save seat memos and entry lottery records to Supabase.

### 日本語

AKB48 Theater Seat Memo は、劇場の座席・立見位置・入場抽選記録を残すための非公式・非商用ファンツールです。  
座席を選択し、公演名、日付、表示名、番号、巡目を入力して、記録用画像として出力できます。

ログインしなくても通常利用できます。Tool48 Account / Cloud Save は任意機能で、ログインしたユーザーのみクラウド保存を利用できます。

---

## Main Features

### Seat Memo

- Interactive AKB48 Theater seat map.
- Seat and standing-position selection.
- Performance, event date, display name, entry number, and tour round fields.
- Image export for sharing or saving memories.
- Share-link support for the selected state.
- Mobile-friendly layout with compact controls.

### Tool48 Account / Cloud Save

- Optional login via Tool48 Account.
- Uses Supabase public client only: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
- No service role key, database password, or backend secret is used.
- Private by default.
- Existing no-login workflow remains available.
- Cloud records can be saved, loaded, updated, and deleted by the logged-in owner.

### Entry Lottery Record

- Records theater entry lottery call order by number range.
- Number ranges follow the UI:
  `1~9`, `10~19`, `20~29`, ... `250~259`.
- Single click marks / unmarks a range.
- Double click marks the selected range as `自分`.
- Can export the lottery record as an image.
- Can optionally consent to anonymous public statistics.

### Entry Lottery Distribution Dashboard

The distribution dashboard is designed around the actual lottery UI and the common fan questions around number ranges.

- Range x called order heatmap.
- Average called order by range.
- Front / middle / back segment averages.
- Day-of-month x segment heatmap.
- Month x segment heatmap.
- Adjacent range gap histogram.
- Consecutive adjacent range streak analysis.
- My landing analysis using the `自分` marker.

Filters include:

- Year, starting from 2026 and moving forward.
- Month.
- Early / middle / late month.
- Weekday.
- Performance.
- Performance type.
- Mine / anonymous community data.

---

## Cloud Database Notes

Cloud save uses the Supabase table:

```text
public.seat_memo_records
```

Recommended columns include:

```text
user_id
event_date
performance_id
performance_title
seat_block
seat_row
seat_number
seat_label
lottery_order
entry_order
view_rating
view_note
private_note
payload
public_consent
public_status
source
```

The app stores structured fields in dedicated columns where possible and stores the full app state in `payload`, so existing local data is not lost.

If cloud save fails with a Supabase permission error, run:

```text
SUPABASE_SEAT_MEMO_CLOUD_FIX.sql
```

This file adds the required grants and RLS policies for `seat_memo_records`.

---

## Quick Start

### Open Directly

1. Keep all project files in the same folder.
2. Open `index.html` in a browser.
3. Select a language and start using the tool.

### Local Server

If the browser blocks local file behavior, run a simple server inside the project folder:

```bash
python -m http.server 4179
```

Then open:

```text
http://127.0.0.1:4179/
```

---

## Files

- `index.html`  
  Main UI structure, tabs, account popover, seat memo, lottery record, and distribution dashboard.

- `style.css`  
  App layout, mobile refinements, account popover styles, lottery UI, and chart layout.

- `script.js`  
  Seat map logic, export logic, Supabase auth/cloud save, lottery record state, and distribution chart calculations.

- `langs.json`  
  Multilingual UI text for Japanese, Traditional Chinese, Simplified Chinese, Korean, Thai, Indonesian, and English.

- `seatmap-data.js`  
  Seat and standing-position coordinate data.

- `core.css` / `core.js`  
  Shared visual and interaction helpers.

- `assets/seatmap.svg`  
  Theater seat map artwork.

- `TOOL48_ACCOUNT_POPOVER_SNIPPET.md`  
  Reusable Tool48 Account login popover code for Garapon and future Tool48 tools.

- `SUPABASE_SEAT_MEMO_CLOUD_FIX.sql`  
  Supabase SQL fix for `seat_memo_records` grants and RLS policies.

---

## Maintenance Notes

- Update visible UI text in `langs.json`.
- Keep account buttons and popup messages multilingual.
- Keep cloud save optional and progressive.
- Do not introduce backend-only Supabase secrets into the frontend.
- Keep mobile checks around `390x844` or similar narrow widths.
- If adding new cloud tables, remember that RLS policies and explicit grants are both required.

---

## Disclaimer

### 繁體中文

本項目為非官方、非商業的粉絲製作工具，只供個人紀錄、交流與保存回憶使用。  
本項目與 AKB48、DH、劇場營運或任何官方機構沒有從屬、合作、授權或代表關係。所有名稱、商標、標誌及相關權利均屬其權利持有人。

### English

This project is an unofficial, non-commercial fan-made tool for personal records and fan communication only.  
It is not affiliated with, endorsed by, partnered with, or representative of AKB48, DH, theater management, or any official organization. All names, trademarks, logos, and related rights belong to their respective rights holders.

### 日本語

本プロジェクトは、個人記録とファン交流のための非公式・非商用ファンメイドツールです。  
AKB48、DH、劇場運営、その他公式団体とは提携・承認・代表関係にありません。名称、商標、ロゴおよび関連する権利は、それぞれの権利者に帰属します。

---

Created by gomensensei.
