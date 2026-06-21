// FIRE projection: grow current net worth by a monthly return plus monthly
// contributions until it reaches the FIRE target.
export type ProjectionPoint = { month: number; value: number };

export type FireProjection = {
  reachedMonth: number | null; // months until target (0 if already there)
  reachedDate: Date | null;
  series: ProjectionPoint[];
};

export function projectFire(
  current: number,
  monthlyContribution: number,
  annualReturn: number,
  target: number,
  maxMonths = 600,
): FireProjection {
  const monthlyReturn = annualReturn / 12;
  let value = current;
  const series: ProjectionPoint[] = [{ month: 0, value }];

  if (value >= target) {
    return { reachedMonth: 0, reachedDate: new Date(), series };
  }

  let reachedMonth: number | null = null;
  for (let m = 1; m <= maxMonths; m++) {
    value = value * (1 + monthlyReturn) + monthlyContribution;
    series.push({ month: m, value });
    if (value >= target) {
      reachedMonth = m;
      break;
    }
  }

  const reachedDate =
    reachedMonth === null
      ? null
      : new Date(
          new Date().getFullYear(),
          new Date().getMonth() + reachedMonth,
          1,
        );

  return { reachedMonth, reachedDate, series };
}
