// Shared FormData parsing helpers for server actions.

export function str(raw: FormDataEntryValue | null): string {
  return String(raw ?? "").trim();
}

export function optStr(raw: FormDataEntryValue | null): string | null {
  const s = str(raw);
  return s === "" ? null : s;
}

export function num(raw: FormDataEntryValue | null): number {
  const n = Number(str(raw).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n)) throw new Error("Invalid number");
  return n;
}

export function optNum(raw: FormDataEntryValue | null): number | null {
  const s = str(raw).replace(/[$,\s]/g, "");
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error("Invalid number");
  return n;
}

export function int(raw: FormDataEntryValue | null): number {
  const n = parseInt(str(raw), 10);
  if (!Number.isInteger(n)) throw new Error("Invalid integer");
  return n;
}

export function bool(raw: FormDataEntryValue | null): boolean {
  const s = str(raw).toLowerCase();
  return s === "on" || s === "true" || s === "1";
}

export function date(raw: FormDataEntryValue | null): Date {
  const s = str(raw);
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new Error("Invalid date");
  return d;
}

export function optDate(raw: FormDataEntryValue | null): Date | null {
  const s = str(raw);
  if (s === "") return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new Error("Invalid date");
  return d;
}

// Parse an <input type="month"> value ("YYYY-MM") to the first of that month.
export function monthDate(raw: FormDataEntryValue | null): Date {
  const s = str(raw);
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) throw new Error("Invalid month (expected YYYY-MM)");
  return new Date(Number(m[1]), Number(m[2]) - 1, 1);
}

// Enforce a value is one of an allowed enum list.
export function oneOf<T extends string>(
  raw: FormDataEntryValue | null,
  allowed: readonly T[],
): T {
  const s = str(raw);
  if (!(allowed as readonly string[]).includes(s)) {
    throw new Error(`Invalid value: ${s}`);
  }
  return s as T;
}
