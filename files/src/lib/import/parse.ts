// Pure parsing helpers (no I/O, no FormData) — usable on client and server.

// Stable fingerprint for a set of CSV headers: sort + lowercase + join.
export function headerKey(headers: string[]): string {
  return headers
    .map((h) => h.toLowerCase().trim())
    .sort()
    .join("|");
}

// Resolve a saved column name back to its index in the current headers array.
// Returns -1 if not found.
export function resolveCol(headers: string[], colName: string | null | undefined): number {
  if (!colName) return -1;
  const idx = headers.findIndex((h) => h.toLowerCase().trim() === colName.toLowerCase().trim());
  return idx;
}

// Given saved column names and current headers, build a ColumnMap by resolving
// names → indices. Returns null if date or description can't be resolved.
export function resolveMapping(
  headers: string[],
  dateCol: string | null | undefined,
  descriptionCol: string | null | undefined,
  amountCol: string | null | undefined,
  debitCol: string | null | undefined,
  creditCol: string | null | undefined,
): ColumnMap | null {
  const date = resolveCol(headers, dateCol);
  const description = resolveCol(headers, descriptionCol);
  if (date < 0 || description < 0) return null;
  return {
    date,
    description,
    amount: resolveCol(headers, amountCol),
    debit: resolveCol(headers, debitCol),
    credit: resolveCol(headers, creditCol),
  };
}

// Compare saved header key to current headers.
// Returns "exact" | "partial" | "none".
export function matchQuality(
  savedKey: string,
  currentHeaders: string[],
): "exact" | "partial" | "none" {
  const currentKey = headerKey(currentHeaders);
  if (savedKey === currentKey) return "exact";
  // Check if enough overlap to be worth suggesting
  const savedParts = new Set(savedKey.split("|"));
  const currentParts = new Set(currentHeaders.map((h) => h.toLowerCase().trim()));
  const overlap = [...savedParts].filter((p) => currentParts.has(p)).length;
  if (overlap >= 2) return "partial";
  return "none";
}

export type StagedRow = {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positive
  isIncome: boolean;
  category: string; // TransactionCategory
};

export type ColumnMap = {
  date: number;
  description: number;
  amount: number; // index of signed amount column, or -1 if using debit/credit
  debit: number; // -1 if unused
  credit: number; // -1 if unused
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// Normalize many date shapes to YYYY-MM-DD. Returns null if unparseable.
export function normalizeDate(raw: string): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;

  // ISO: 2026-06-21 (with optional time)
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // US: M/D/YYYY or M/D/YY  (also accepts - or .)
  m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(s);
  if (m) {
    let [, mo, da, yr] = m;
    let y = Number(yr);
    if (yr.length === 2) y = y >= 70 ? 1900 + y : 2000 + y;
    return `${y}-${mo.padStart(2, "0")}-${da.padStart(2, "0")}`;
  }

  // "Jun 21, 2026" / "21 Jun 2026"
  m = /([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(s);
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
    return `${m[3]}-${String(mo).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  m = /(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})/.exec(s);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    return `${m[3]}-${String(mo).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

// Parse a money string to a number. Handles $, commas, and (parens) = negative.
export function parseAmount(raw: string): number | null {
  let s = (raw ?? "").trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith("-")) {
    neg = true;
    s = s.slice(0, -1);
  }
  s = s.replace(/[$,\s]/g, "");
  if (s.startsWith("-")) {
    neg = true;
    s = s.slice(1);
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

function findHeader(headers: string[], patterns: RegExp[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim();
    if (patterns.some((p) => p.test(h))) return i;
  }
  return -1;
}

// Best-effort column detection from CSV headers.
export function detectColumns(headers: string[]): ColumnMap {
  const date = findHeader(headers, [/date|posted|transaction date/]);
  const description = findHeader(headers, [/description|payee|name|memo|details|merchant/]);
  const debit = findHeader(headers, [/debit|withdrawal/]);
  const credit = findHeader(headers, [/credit|deposit/]);
  // A single signed amount column (avoid matching debit/credit columns).
  let amount = findHeader(headers, [/^amount$|amount|value/]);
  if (amount === debit || amount === credit) amount = -1;
  return { date, description, amount, debit, credit };
}

// Build a staged row from a raw CSV row + mapping + category guesser.
export function rowToStaged(
  cells: string[],
  map: ColumnMap,
  guess: (desc: string, isIncome: boolean) => string,
): StagedRow | null {
  const date = normalizeDate(cells[map.date] ?? "");
  if (!date) return null;
  const description = (cells[map.description] ?? "").trim() || "(no description)";

  let signed: number | null = null;
  if (map.amount >= 0) {
    signed = parseAmount(cells[map.amount] ?? "");
  } else {
    const debit = map.debit >= 0 ? parseAmount(cells[map.debit] ?? "") : null;
    const credit = map.credit >= 0 ? parseAmount(cells[map.credit] ?? "") : null;
    if (debit) signed = -Math.abs(debit);
    else if (credit) signed = Math.abs(credit);
  }
  if (signed == null || signed === 0) return null;

  const isIncome = signed > 0;
  const amount = Math.abs(signed);
  return { date, description, amount, isIncome, category: guess(description, isIncome) };
}
