# AKB48 Seat Memo Website

A static Vanilla JS website for selecting an AKB48 theatre seat / standing position and exporting a pink concert-style arrow image.

## Files

- `index.html` — main page
- `style.css` — app-specific UI
- `core.css` — Gomensensei Core UI v3.0 base style
- `core.js` — Gomensensei Core JS v3.0 utilities
- `seatmap-data.js` — selectable seat / standing area coordinates
- `langs.json` — Japanese / Traditional Chinese / English UI text
- `assets/seatmap-reference.png` — base seat map image

## Standing area subdivision

- Area A: 3 rows × 9 slots
- Area B: 3 rows × 14 slots
- Area C: 2 rows × 5 slots
- Area D: 2 rows × 7 slots
- Area E: 1 row × 6 slots

## Deployment

Upload all files to the same GitHub Pages repository folder. The site does not require a backend.

## Notes

- Desktop browsers download PNG directly.
- iPhone / Safari opens a preview modal so users can long-press and save the image.
- Language is detected from the browser language, then remembered in `localStorage`.
- Selection state is saved in the URL hash for sharing.
