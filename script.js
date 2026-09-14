// OpenG2P Dashboard — live data edition
// Pulls the "Registered & disbursed" figures straight from the
// OpenG2P Country Dashboard Google Sheet on every page load.

// ---- CONFIG -----------------------------------------------------------
// Sheet must be shared as "Anyone with the link – Viewer" for this to work,
// since the fetch happens from the visitor's own browser (no server/API key).
const SHEET_ID = '177tN9JXNex-mbifRFAH9ccm85az7JGlGvmScthMNTO0';
const SHEET_GID = '1006734973';
const SHEET_CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;

// Labels used in the sheet's summary block (rows ~19-24, column C/D).
// Matched case-insensitively so small edits to the sheet don't break this.
const SUMMARY_LABELS = {
  countries: 'countries',
  programs: 'programs',
  totalRegistration: 'total registration',
  cashTransfer: 'cash transfer',
  meals: 'meals',
  transport: 'transport',
};

// ---- CSV PARSING --------------------------------------------------------

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') { field += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { field += char; }
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ',') { row.push(field); field = ''; }
      else if (char === '\r') { /* skip */ }
      else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += char;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ---- VALUE HELPERS --------------------------------------------------------

function cleanNumber(str) {
  if (!str) return null;
  const n = parseFloat(String(str).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function isMoney(str) {
  return typeof str === 'string' && str.trim().startsWith('$');
}

function formatCount(n) {
  if (n === null) return '–';
  if (Math.abs(n) >= 1_000_000) return trimZero((n / 1_000_000).toFixed(2)) + 'M';
  if (Math.abs(n) >= 1_000) return trimZero((n / 1_000).toFixed(1)) + 'K';
  return n.toLocaleString('en-US');
}

function formatMoney(n) {
  if (n === null) return '–';
  if (Math.abs(n) >= 1) return trimZero(n.toFixed(2)) + 'M'; // sheet already stores $ millions
  return n.toLocaleString('en-US');
}

function trimZero(str) {
  return str.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

// paper-currency (banknote) icon, used instead of a plain "$" wherever a
// cash figure is shown — inherits the surrounding text color.
const CURRENCY_ICON = `<svg class="currency-icon" viewBox="0 0 32 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="1" y="1" width="30" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="16" cy="10" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="6" cy="10" r="1.6" fill="currentColor"/>
  <circle cx="26" cy="10" r="1.6" fill="currentColor"/>
</svg>`;

function moneyValueHTML(n) {
  return `${CURRENCY_ICON}<span>${formatMoney(n)}</span>`;
}

// registration (ID card + person) icon, used next to every "Registered" figure
const REGISTER_ICON = `<svg class="register-icon" viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="1" y="1" width="22" height="26" rx="3.5" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="12" cy="10" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M5 21c0-3.6 3.1-6.4 7-6.4s7 2.8 7 6.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;

function registeredValueHTML(text) {
  return `${REGISTER_ICON}<span>${text}</span>`;
}

// fork + spoon icon, used next to every "Meals" figure
const MEALS_ICON = `<svg class="meals-icon" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <line x1="9" y1="3" x2="9" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <line x1="5.5" y1="3" x2="5.5" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <line x1="12.5" y1="3" x2="12.5" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M5.5 10 Q5.5 13 9 13" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M12.5 10 Q12.5 13 9 13" fill="none" stroke="currentColor" stroke-width="2"/>
  <line x1="9" y1="13" x2="9" y2="29" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <ellipse cx="23" cy="8" rx="4.5" ry="6" fill="none" stroke="currentColor" stroke-width="2"/>
  <line x1="23" y1="14" x2="23" y2="29" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;

function mealsValueHTML(text) {
  return `${MEALS_ICON}<span>${text}</span>`;
}

// van/truck icon, used next to every "Transport" figure
const TRANSPORT_ICON = `<svg class="transport-icon" viewBox="0 0 34 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="1" y="5" width="20" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M21 10h6l4 4v4h-10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  <circle cx="9" cy="20" r="2.6" fill="currentColor"/>
  <circle cx="25" cy="20" r="2.6" fill="currentColor"/>
</svg>`;

function transportValueHTML(text) {
  return `${TRANSPORT_ICON}<span>${text}</span>`;
}


// globe icon, shown next to the Countries figure
const GLOBE_ICON = `<svg class="globe-icon" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" stroke-width="2"/>
  <ellipse cx="14" cy="14" rx="5" ry="12" fill="none" stroke="currentColor" stroke-width="2"/>
  <line x1="2" y1="14" x2="26" y2="14" stroke="currentColor" stroke-width="2"/>
  <path d="M4.4 7.2c2.6 1.7 5.9 2.7 9.6 2.7s7-1 9.6-2.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M4.4 20.8c2.6-1.7 5.9-2.7 9.6-2.7s7 1 9.6 2.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;

// stacked-modules icon, shown next to the Programs figure
const PROGRAM_ICON = `<svg class="program-icon" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="2" y="2" width="10.5" height="10.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/>
  <rect x="15.5" y="2" width="10.5" height="10.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/>
  <rect x="2" y="15.5" width="10.5" height="10.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/>
  <rect x="15.5" y="15.5" width="10.5" height="10.5" rx="2.5" fill="currentColor"/>
</svg>`;


// ---- SHEET → DATA MODEL --------------------------------------------------

function extractData(rows) {
  const summary = {};
  const programRows = [];
  let lastUpdated = null;
  let currentCountry = '';
  let inLiveSection = false;
  let headerSeen = false;

  rows.forEach((r) => {
    const c1 = (r[1] || '').trim();  // Country
    const c2 = (r[2] || '').trim();  // Programs / summary label
    const c5 = (r[5] || '').trim();  // Total
    const c7 = (r[7] || '').trim();  // Cash Transfer
    const c8 = (r[8] || '').trim();  // Meals
    const c9 = (r[9] || '').trim();  // Transport

    const c1Lower = c1.toLowerCase();
    const c2Lower = c2.toLowerCase();

    // capture "Last updated: ..." note from the top of the sheet — the header
    // cell sometimes has "Country" appended on the same line (e.g. "Last
    // updated: 20 Aug 2026 Country"), so only pull out the date-ish part.
    if (!lastUpdated && c1Lower.startsWith('last updated')) {
      const rest = c1.replace(/^last updated:?\s*/i, '').replace(/\s*country\s*$/i, '').trim();
      lastUpdated = rest;
    }

    // header row marks the start of the live program table. Use `includes`
    // for the country cell since it may carry the "Last updated" note too.
    if (!headerSeen && c1Lower.includes('country') && c2Lower.startsWith('program')) {
      headerSeen = true;
      inLiveSection = true;
      return;
    }

    if (inLiveSection) {
      if (c1Lower === 'total') { inLiveSection = false; return; }
      if (c1Lower.includes('work in progress')) { inLiveSection = false; return; }

      if (c1) currentCountry = c1; // forward-fill merged country cells
      if (c2 && currentCountry) {
        programRows.push({
          country: currentCountry,
          program: c2,
          total: cleanNumber(c5),
          cash: c7 ? cleanNumber(c7) : null,
          meals: c8 ? cleanNumber(c8) : null,
          transport: c9 ? cleanNumber(c9) : null,
        });
      }
      return;
    }

    // before the header row is seen, or after the table ends: summary block
    if (headerSeen) {
      const label = c2Lower;
      const value = (r[3] || '').trim();
      Object.entries(SUMMARY_LABELS).forEach(([key, needle]) => {
        if (label.includes(needle) && value) summary[key] = value;
      });
    }
  });

  return { summary, programRows, lastUpdated };
}

// combine these four Ethiopia program rows into a single "EDRMC" figure
const EDRMC_PROGRAMS = ['Permanent Resident', 'Internally Displaced Persons', 'Returnee', 'Urban Destitute'];

function sumNullable(a, b) {
  if (a === null && b === null) return null;
  return (a || 0) + (b || 0);
}

function mergeEdrmcPrograms(programRows) {
  const merged = [];
  const edrmcByCountry = new Map();

  programRows.forEach((r) => {
    if (!EDRMC_PROGRAMS.includes(r.program)) {
      merged.push(r);
      return;
    }
    const existing = edrmcByCountry.get(r.country);
    if (!existing) {
      edrmcByCountry.set(r.country, { country: r.country, program: 'EDRMC', total: r.total, cash: r.cash, meals: r.meals, transport: r.transport });
    } else {
      existing.total = sumNullable(existing.total, r.total);
      existing.cash = sumNullable(existing.cash, r.cash);
      existing.meals = sumNullable(existing.meals, r.meals);
      existing.transport = sumNullable(existing.transport, r.transport);
    }
  });
  edrmcByCountry.forEach((row) => merged.push(row));
  return merged;
}

// ---- RENDERING --------------------------------------------------------
// Board layout: top banner (title + Countries/Programs stat boxes), then
// a "Registered" row of cards, a "Meals/Cash/Transport" row of cards, and
// two big "Overall" panels on the right — mirroring the sheet mockup.

function renderBoardStats(summary) {
  const countriesEl = document.getElementById('statCountries');
  const programsEl = document.getElementById('statPrograms');
  const countries = cleanNumber(summary.countries);
  const programs = cleanNumber(summary.programs);
  if (countriesEl) animateCount(countriesEl, countries ?? 0, GLOBE_ICON);
  if (programsEl) animateCount(programsEl, programs ?? 0, PROGRAM_ICON);
}

const CARD_PALETTE = ['yellow', 'orange', 'purple', 'blue'];
let cardColorIndex = 0;
function nextCardColor() {
  const color = CARD_PALETTE[cardColorIndex % CARD_PALETTE.length];
  cardColorIndex++;
  return color;
}

const GRID_COLUMNS = 4;

// fixed display order: Ethiopia (Farmer Registry, then EDRMC), Zambia, Zanzibar
function countryPriority(r) {
  if (r.country === 'Ethiopia' && r.program === 'Farmer Registry') return 0;
  if (r.country === 'Ethiopia' && r.program === 'EDRMC') return 1;
  if (r.country === 'Zambia') return 2;
  if (r.country === 'Zanzibar') return 3;
  return 99;
}

function sortByCountryPriority(programRows) {
  return [...programRows].sort((a, b) => countryPriority(a) - countryPriority(b));
}

// manual card order: everything next to the Ethiopia/EDRMC registered total
// (457.0K) — Zambia, Zanzibar, and the rest of EDRMC's own figures — grouped
// together, right after it. Anything not listed here (e.g. Farmer Registry)
// keeps its normal position.
const CUSTOM_CARD_ORDER = [
  { country: 'Ethiopia', program: 'EDRMC', tag: 'Registered' },
  { country: 'Zambia', program: 'Cash For Work', tag: 'Registered' },
  { country: 'Zanzibar', program: 'Pension Program', tag: 'Registered' },
  { country: 'Zanzibar', program: 'Pension Program', tag: 'Cash' },
  { country: 'Ethiopia', program: 'EDRMC', tag: 'Cash' },
  { country: 'Ethiopia', program: 'EDRMC - Returnee', tag: 'Meals' },
  { country: 'Ethiopia', program: 'EDRMC - Returnee', tag: 'Transport' },
];

function cardOrderRank(cfg) {
  return CUSTOM_CARD_ORDER.findIndex(
    (o) => o.country === cfg.name && o.program === cfg.program && o.tag === cfg.tag
  );
}

// Walks the configs in their normal order; the moment it reaches the first
// card that belongs to CUSTOM_CARD_ORDER, it drops in the whole group
// (in that fixed order) and skips the rest of the group as it passes them.
// Every other card (e.g. Farmer Registry) keeps its original position.
function applyCustomCardOrder(configs) {
  const groupedBlock = CUSTOM_CARD_ORDER
    .map((_, rank) => configs.find((cfg) => cardOrderRank(cfg) === rank))
    .filter(Boolean);

  const result = [];
  let inserted = false;
  configs.forEach((cfg) => {
    if (cardOrderRank(cfg) !== -1) {
      if (!inserted) { result.push(...groupedBlock); inserted = true; }
    } else {
      result.push(cfg);
    }
  });
  return result;
}

function boardCellHTML({ tag, name, program, value, color, span }) {
  const spanStyle = span && span > 1 ? ` style="grid-column: span ${span}"` : '';
  return `
    <div class="board-cell cell-${color}"${spanStyle}>
      <span class="cell-name">${name}</span>
      ${program ? `<span class="cell-program">${program}</span>` : ''}
      <span class="cell-value">${value}</span>
      <span class="cell-tag">${tag}</span>
    </div>`;
}

// spreads the leftover columns in an incomplete last grid row evenly across
// that row's cards, so the row is never left with a gap of empty cells
function applyRowSpans(configs) {
  const remainder = configs.length % GRID_COLUMNS;
  if (remainder === 0) return configs;
  const tailStart = configs.length - remainder;
  const base = Math.floor(GRID_COLUMNS / remainder);
  const extra = GRID_COLUMNS % remainder;
  return configs.map((cfg, i) => {
    if (i < tailStart) return cfg;
    const tailIndex = i - tailStart;
    return { ...cfg, span: base + (tailIndex < extra ? 1 : 0) };
  });
}

// one combined grid: for each country/program (in priority order) its
// "Registered" card is immediately followed by its Cash/Meals/Transport cards
function renderCardsRow(programRows) {
  const row = document.getElementById('cardsRow');
  const configs = [];
  programRows.forEach((r) => {
    if (r.total !== null) {
      configs.push({
        tag: 'Registered',
        name: r.country,
        program: r.program,
        value: registeredValueHTML(formatCount(r.total)),
      });
    }
    const disbursedProgram = r.program === 'EDRMC' ? 'EDRMC - Returnee' : r.program;
    if (r.cash !== null) {
      // Ethiopia's cash box drops the "- Returnee" suffix, unlike meals/transport
      const program = r.program === 'EDRMC' ? 'EDRMC' : disbursedProgram;
      configs.push({ tag: 'Cash', name: r.country, program, value: moneyValueHTML(r.cash) });
    }
    if (r.meals !== null) {
      configs.push({ tag: 'Meals', name: r.country, program: disbursedProgram, value: mealsValueHTML(r.meals.toLocaleString('en-US')) });
    }
    if (r.transport !== null) {
      configs.push({ tag: 'Transport', name: r.country, program: disbursedProgram, value: transportValueHTML(String(r.transport)) });
    }
  });
  const ordered = applyCustomCardOrder(configs);
  ordered.forEach((cfg) => { cfg.color = nextCardColor(); });
  const cells = applyRowSpans(ordered).map(boardCellHTML);
  row.innerHTML = cells.length
    ? cells.join('')
    : '<div class="board-cell board-cell-loading">No figures found.</div>';
}

function renderOverall(summary) {
  const registeredEl = document.getElementById('overallRegistered');
  const cashEl = document.getElementById('overallCash');
  const totalRegistration = cleanNumber(summary.totalRegistration);
  const cashTransfer = cleanNumber(summary.cashTransfer);

  registeredEl.innerHTML = totalRegistration !== null ? registeredValueHTML(formatCount(totalRegistration)) : '–';
  cashEl.innerHTML = cashTransfer !== null
    ? (isMoney(summary.cashTransfer) ? moneyValueHTML(cashTransfer) : formatCount(cashTransfer))
    : '–';
}

// counts up into a nested span so the leading icon isn't wiped on every frame
function animateCount(el, target, iconHTML) {
  el.innerHTML = `${iconHTML || ''}<span class="count-text"></span>`;
  const out = el.querySelector('.count-text');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) { out.textContent = target; return; }
  const duration = 900;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    out.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ---- LOAD / REFRESH FLOW --------------------------------------------------------

async function loadDashboard() {
  const statusEl = document.getElementById('dataStatus');
  const errorEl = document.getElementById('dataError');
  const refreshBtn = document.getElementById('refreshBtn');
  const registeredRow = document.getElementById('cardsRow');

  statusEl.textContent = 'Loading live data…';
  statusEl.className = 'data-status-text';
  errorEl.hidden = true;
  refreshBtn.disabled = true;
  cardColorIndex = 0;
  registeredRow.innerHTML = '<div class="board-cell board-cell-loading">Fetching latest figures…</div>';

  try {
    const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csvText = await res.text();
    const rows = parseCSV(csvText);
    const data = extractData(rows);
    const programRows = sortByCountryPriority(mergeEdrmcPrograms(data.programRows));

    renderBoardStats(data.summary);
    renderCardsRow(programRows);
    renderOverall(data.summary);

    const stamp = data.lastUpdated || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    statusEl.textContent = `Live · Last updated ${stamp}`;
    statusEl.className = 'data-status-text is-live';
  } catch (err) {
    console.error('OpenG2P dashboard: failed to load sheet data', err);
    statusEl.textContent = 'Live data unavailable';
    statusEl.className = 'data-status-text is-error';
    errorEl.hidden = false;
    registeredRow.innerHTML = '<div class="board-cell board-cell-loading">Couldn\'t load figures from the sheet.</div>';
  } finally {
    refreshBtn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const todayEl = document.getElementById('today');
  if (todayEl) {
    todayEl.textContent = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  loadDashboard();
  document.getElementById('refreshBtn').addEventListener('click', loadDashboard);
});
