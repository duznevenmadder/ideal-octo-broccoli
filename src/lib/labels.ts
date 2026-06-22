// Turn an ENUM_CONSTANT into a readable label, e.g. INCOME_W2 -> "Income W2".
export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Build <select> options from an enum array.
export function toOptions(
  values: readonly string[],
  labelFn: (v: string) => string = humanize,
): { value: string; label: string }[] {
  return values.map((v) => ({ value: v, label: labelFn(v) }));
}
