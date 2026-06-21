// Federal MFJ 2025 brackets (from README TAX section). Each entry: rate + lower
// bound (inclusive). Bounds match the README thresholds.
export const MFJ_2025_BRACKETS = [
  { rate: 0.1, from: 0 },
  { rate: 0.12, from: 23200 },
  { rate: 0.22, from: 94300 },
  { rate: 0.24, from: 201050 },
  { rate: 0.32, from: 383900 },
  { rate: 0.35, from: 487450 },
  { rate: 0.37, from: 731200 },
] as const;

// Upper edge of each bracket (the next bracket's `from`), or Infinity for top.
function upperBound(i: number): number {
  return i + 1 < MFJ_2025_BRACKETS.length
    ? MFJ_2025_BRACKETS[i + 1].from
    : Infinity;
}

// Progressive federal tax on a taxable income (MFJ 2025).
export function federalTaxMFJ(taxableIncome: number): number {
  const ti = Math.max(0, taxableIncome);
  let tax = 0;
  for (let i = 0; i < MFJ_2025_BRACKETS.length; i++) {
    const { rate, from } = MFJ_2025_BRACKETS[i];
    if (ti <= from) break;
    const upper = upperBound(i);
    const inBracket = Math.min(ti, upper) - from;
    tax += inBracket * rate;
  }
  return tax;
}

// Marginal rate the next dollar of income would be taxed at.
export function marginalRateMFJ(taxableIncome: number): number {
  const ti = Math.max(0, taxableIncome);
  let rate: number = MFJ_2025_BRACKETS[0].rate;
  for (const b of MFJ_2025_BRACKETS) {
    if (ti >= b.from) rate = b.rate;
  }
  return rate;
}

// Headroom (in income) before crossing into the 32% bracket.
export function roomBefore32(taxableIncome: number): number {
  return Math.max(0, 383900 - Math.max(0, taxableIncome));
}
