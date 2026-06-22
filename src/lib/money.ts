import { Prisma } from "@prisma/client";

// Format a Decimal/number/string as USD.
export function formatUSD(
  value: Prisma.Decimal | number | string,
  opts: { cents?: boolean } = {},
): string {
  const n = typeof value === "object" ? Number(value) : Number(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  }).format(n);
}
