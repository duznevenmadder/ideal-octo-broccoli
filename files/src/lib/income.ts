import { prisma } from "@/lib/db";

// Aggregate income transactions for a calendar year, bucketed by the tax-relevant
// categories the Tax Planner cares about. Derived from real transactions so the
// planner can run on live data instead of manual entry.
export type YtdIncome = {
  w2: number;
  business1099: number;
  k1: number;
  iraDistribution: number;
  investment: number;
  edd: number;
  other: number;
  total: number;
};

const EMPTY: YtdIncome = {
  w2: 0,
  business1099: 0,
  k1: 0,
  iraDistribution: 0,
  investment: 0,
  edd: 0,
  other: 0,
  total: 0,
};

function yearRange(year: number) {
  return { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
}

export async function getYtdIncome(
  userId: string,
  year: number,
): Promise<YtdIncome> {
  const grouped = await prisma.transaction.groupBy({
    by: ["category"],
    where: { userId, isIncome: true, date: yearRange(year) },
    _sum: { amount: true },
  });

  const out: YtdIncome = { ...EMPTY };
  for (const g of grouped) {
    const amt = Number(g._sum.amount ?? 0);
    switch (g.category) {
      case "INCOME_W2":
        out.w2 += amt;
        break;
      case "INCOME_1099":
        out.business1099 += amt;
        break;
      case "INCOME_K1":
        out.k1 += amt;
        break;
      case "INCOME_IRA_DISTRIBUTION":
        out.iraDistribution += amt;
        break;
      case "INCOME_INVESTMENT":
        out.investment += amt;
        break;
      case "INCOME_EDD":
        out.edd += amt;
        break;
      default:
        // Any other income-flagged category (incl. INCOME_OTHER).
        out.other += amt;
    }
    out.total += amt;
  }
  return out;
}

// Total IRA distributions taken in a year, from transactions.
export async function getIraTakenYtd(
  userId: string,
  year: number,
): Promise<number> {
  const agg = await prisma.transaction.aggregate({
    where: {
      userId,
      isIncome: true,
      category: "INCOME_IRA_DISTRIBUTION",
      date: yearRange(year),
    },
    _sum: { amount: true },
  });
  return Number(agg._sum.amount ?? 0);
}
