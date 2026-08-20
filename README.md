# OpenG2P Dashboard

A single-page dashboard showing OpenG2P's "Registered & disbursed" stats
(Countries, Programs, registration/cash/meals/transport figures). Built
with plain HTML/CSS/JS — no build step, no dependencies to install.

**The numbers are not hardcoded.** Every time the page loads (or you click
Refresh), it fetches the live **OpenG2P Country Dashboard** Google Sheet
and renders whatever is in it — so as the sheet gets updated, the
dashboard updates automatically, no code changes needed.

Sheet used: `https://docs.google.com/spreadsheets/d/177tN9JXNex-mbifRFAH9ccm85az7JGlGvmScthMNTO0`

## Files

```
openg2p-dashboard/
├── index.html      → page structure (hero + KPI grid, no hardcoded numbers)
├── style.css        → all styling (colors, type, layout)
├── script.js        → fetches & parses the sheet, renders the KPI cards
├── assets/
│   └── logo.svg      → placeholder OpenG2P mark (swap with your real logo)
└── README.md
```

## Run it locally

You don't need Node, npm, or any install step. Pick whichever is easiest:

### Option A — just open the file
Double-click `index.html`, or right-click → "Open with" → your browser.
This usually works, but a few browsers restrict `fetch()` calls made from a
`file://` page, which would stop the live sheet data from loading — if you
see "Live data unavailable," use Option B instead.

### Option B — run a tiny local server (recommended)
This avoids any browser file:// quirks around fetching the sheet, and is
closer to a real deployment.

**Python (already on most machines):**
```bash
cd openg2p-dashboard
python3 -m http.server 8000
```
Then open **http://localhost:8000** in your browser.

**Node (if you have it):**
```bash
cd openg2p-dashboard
npx serve .
```

**VS Code:**
Install the "Live Server" extension, right-click `index.html` →
"Open with Live Server."

## Editing the data

Don't edit numbers in `index.html` — they're generated at runtime from the
Google Sheet. **Update the sheet, and the dashboard follows automatically**
next time someone loads (or refreshes) the page.

The dashboard reads:
- **Summary block** (bottom of the sheet: Countries, Programs, Total
  Registration, Cash Transfer, Meals, Transport) → powers the hero numbers
  and the two big "Overall" cards.
- **Program table** (Country / Programs / Total / Cash Transfer / Meals /
  Transport columns) → powers the per-country/program cards. Add a new
  row for a new country or program and a matching card appears automatically.
- Rows under a **"Work In Progress"** marker are treated as pilots and
  excluded from the live totals — move a row above that marker (into the
  main table, ending at the "Total" row) once it goes live.

### Important: sheet must stay shared as "Anyone with the link – Viewer"

The dashboard fetches the sheet directly from the visitor's browser (no
backend, no API key), using Google's public CSV export endpoint. This only
works if the sheet's sharing setting allows anyone with the link to view it.
If you tighten sharing, the dashboard will show a "Live data unavailable"
message. To check/set this: open the sheet → **Share** (top right) →
**General access** → **Anyone with the link** → **Viewer**.

### Pointing it at a different sheet or tab

Edit these two constants at the top of `script.js`:
```js
const SHEET_ID = '177tN9JXNex-mbifRFAH9ccm85az7JGlGvmScthMNTO0';
const SHEET_GID = '1006734973'; // the tab's gid, from the sheet's URL
```

The two hero numbers (Countries / Programs) animate on load, driven by
whatever the sheet reports.

## Swapping in your real logo

Replace `assets/logo.svg` with your actual OpenG2P icon (SVG or PNG both
work — if you use PNG, update the two `<img src="assets/logo.svg">`
references in `index.html` to point at the new filename).

## Color palette used

| Name   | Hex       | Used for                |
|--------|-----------|--------------------------|
| Yellow | `#F4B41A` | Registered stats          |
| Orange | `#EE7D22` | Meals stats                |
| Purple | `#8B4A8F` | Cash stats                 |
| Blue   | `#1F4C81` | Transport stats            |
| Background | `#0B0B0C` | Page background      |

## Notes

- Fully responsive (desktop → tablet → mobile), tested down to 390px width.
- Respects `prefers-reduced-motion` (disables the count-up and node-line animation).
- No external JS frameworks — everything is vanilla HTML/CSS/JS, so it's easy
  to hand off, host anywhere (GitHub Pages, S3, Netlify, an internal server),
  or embed inside a larger site.
