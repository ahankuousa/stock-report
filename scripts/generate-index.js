#!/usr/bin/env node
/**
 * generate-index.js
 * Scans reports/ directory, builds report metadata,
 * then updates index.html with the actual report list.
 */
const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const INDEX_FILE  = path.join(__dirname, '..', 'index.html');

// ── Weekday helper ──────────────────────────────────────────────
const WEEKDAY = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
function getWeekday(dateStr) {
  // dateStr = 'YYYY-MM-DD'
  const [y,m,d] = dateStr.split('-').map(Number);
  const wd = new Date(y, m-1, d).getDay();
  return WEEKDAY[wd];
}

// ── Format date for display ─────────────────────────────────────
function formatDate(dateStr) {
  const [y,m,d] = dateStr.split('-');
  return `${y}.${m}.${d}`;
}

// ── Parse filename → { type, date } ────────────────────────────
// Accepts: morning-YYYY-MM-DD.html, evening-YYYY-MM-DD.html
function parseFilename(filename) {
  const m = filename.match(/^(morning|evening)-(\d{4}-\d{2}-\d{2})\.html$/);
  if (!m) return null;
  return { type: m[1], date: m[2] };
}

// ── Read reports dir ────────────────────────────────────────────
const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.html'));
const reports = files
  .map(f => { const p = parseFilename(f); return p ? { filename: f, ...p } : null; })
  .filter(Boolean)
  .sort((a, b) => b.date.localeCompare(a.date)); // newest first

// Separate morning / evening
const morning = reports.filter(r => r.type === 'morning');
const evening = reports.filter(r => r.type === 'evening');

// ── Build JS array string ──────────────────────────────────────
function buildMetaArray(items) {
  const entries = items.map(r => JSON.stringify({
    type:    r.type,
    date:    r.date,
    label:   formatDate(r.date),
    weekday: getWeekday(r.date),
  }));
  return `[${entries.join(',\n        ')}]`;
}

const morningMeta = buildMetaArray(morning);
const eveningMeta = buildMetaArray(evening);

// ── Read & patch index.html ─────────────────────────────────────
let html = fs.readFileSync(INDEX_FILE, 'utf8');

// Replace morning report metadata
html = html.replace(
  /const reportMeta = \[[\s\S]*?\];[\s\S]*?<\/script>/,
  `const reportMeta = ${morningMeta};\n    </script>`
);

// Inject counts into static counters (fallback)
html = html.replace(
  /id="total-count">--<\/div>/,
  `id="total-count">${reports.length}</div>`
);
html = html.replace(
  /id="morning-count">--<\/div>/,
  `id="morning-count">${morning.length}</div>`
);
html = html.replace(
  /id="evening-count">--<\/div>/,
  `id="evening-count">${evening.length}</div>`
);

fs.writeFileSync(INDEX_FILE, html, 'utf8');
console.log(`✅ index.html updated — morning: ${morning.length}, evening: ${evening.length}, total: ${reports.length}`);
