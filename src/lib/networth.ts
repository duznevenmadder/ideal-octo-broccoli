import { prisma } from "@/lib/db";

// Net worth = sum(active account balances) - sum(active liability balances).
// Mirrors the README Net Worth rule.
export async function getNetWorth(userId: string) {
  const [accounts, liabilities] = await Promise.all([
    prisma.account.findMany({ where: { userId, isActive: true } }),
    prisma.liability.findMany({ where: { userId, isActive: true } }),
  ]);
  const totalAssets = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.balance), 0);
  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    accountCount: accounts.length,
    liabilityCount: liabilities.length,
  };
}
