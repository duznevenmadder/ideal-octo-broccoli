// Idempotent seed — safe to re-run. Values from MEMORY.md / README seed block.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USER_EMAIL = "keeling.taylor@gmail.com";

// 11 accounts from README seed block (balances from MEMORY.md).
const accounts: Array<{
  name: string;
  type: string;
  balance: number;
  institution?: string;
  notes?: string;
}> = [
  { name: "Wells Fargo Savings", type: "SAVINGS", balance: 35000, institution: "Wells Fargo", notes: "~6 months emergency fund" },
  { name: "Barclays HYSA", type: "HYSA", balance: 180000, institution: "Barclays", notes: "Down payment reserve" },
  { name: "Business Checking (Consulting LLC)", type: "BUSINESS_CHECKING", balance: 45000, notes: "Reclaimable anytime" },
  { name: "IRA-BDA", type: "INHERITED_IRA", balance: 1149019, institution: "Fidelity", notes: "Acct #259033343 — must retitle; missed 2023+2024 RMDs" },
  { name: "Individual TOD", type: "BROKERAGE_TAXABLE", balance: 303563, institution: "Fidelity", notes: "Acct #Z26655496 — 67% WFC concentration" },
  { name: "401(k)", type: "TRADITIONAL_401K", balance: 1700, institution: "Human Interest / LPL", notes: "Contributing $83/mo; employer match $33/mo" },
  { name: "Simple IRA", type: "SIMPLE_IRA", balance: 43000, institution: "LPL", notes: "Status unknown — verify with LPL" },
  { name: "Wife Roth IRA", type: "ROTH_IRA", balance: 30000, notes: "Contributing, not maxed" },
  { name: "Disney Shares (DIS)", type: "DIRECT_STOCK", balance: 10300, institution: "Computershare", notes: "~100 shares, purchased 2001" },
  { name: "Crypto (BTC + IOTA)", type: "CRYPTO", balance: 3000, notes: "Long-term hold" },
  { name: "Loan Receivable — Business Partner", type: "LOAN_RECEIVABLE", balance: 75000, notes: "Illiquid/at-risk; 14+ mo no payments" },
];

const iraSchedule = [
  { year: 2025, recommendedAmt: 185000, taxEstimate: 42000, netToTOD: 143000 },
  { year: 2026, recommendedAmt: 175000, taxEstimate: 44000, netToTOD: 131000 },
  { year: 2027, recommendedAmt: 160000, taxEstimate: 42000, netToTOD: 118000 },
  { year: 2028, recommendedAmt: 155000, taxEstimate: 42000, netToTOD: 113000 },
  { year: 2029, recommendedAmt: 145000, taxEstimate: 42000, netToTOD: 103000 },
  { year: 2030, recommendedAmt: 135000, taxEstimate: 42000, netToTOD: 93000 },
  { year: 2031, recommendedAmt: 125000, taxEstimate: 42000, netToTOD: 83000 },
  { year: 2032, recommendedAmt: 438000, taxEstimate: 175000, netToTOD: 263000 },
];

const goals: Array<{
  type: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  monthlyTarget?: number;
}> = [
  { type: "HOME_PURCHASE", name: "Home Purchase", targetAmount: 180000, currentAmount: 180000, targetDate: "2028-01-01" },
  { type: "FIRE", name: "Financial Independence", targetAmount: 2125000, currentAmount: 1876000 },
  { type: "EDUCATION_529", name: "Child's Education", targetAmount: 200000, currentAmount: 0, monthlyTarget: 200 },
  { type: "BUSINESS_MILESTONE", name: "Replace W2 Income", targetAmount: 84000, currentAmount: 0 },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: USER_EMAIL },
    update: { name: "Keeling Taylor" },
    create: { email: USER_EMAIL, name: "Keeling Taylor" },
  });

  // Accounts — upsert on (userId, name). No unique constraint on that pair, so
  // emulate idempotency by find-then-create/update.
  for (const a of accounts) {
    const existing = await prisma.account.findFirst({
      where: { userId: user.id, name: a.name },
    });
    if (existing) {
      await prisma.account.update({
        where: { id: existing.id },
        data: { type: a.type, balance: a.balance, institution: a.institution, notes: a.notes },
      });
    } else {
      await prisma.account.create({
        data: { userId: user.id, name: a.name, type: a.type, balance: a.balance, institution: a.institution, notes: a.notes },
      });
    }
  }

  for (const s of iraSchedule) {
    await prisma.iRADistribution.upsert({
      where: { userId_year: { userId: user.id, year: s.year } },
      update: { recommendedAmt: s.recommendedAmt, taxEstimate: s.taxEstimate, netToTOD: s.netToTOD },
      create: { userId: user.id, ...s },
    });
  }

  for (const g of goals) {
    const existing = await prisma.goal.findFirst({
      where: { userId: user.id, name: g.name },
    });
    const data = {
      type: g.type,
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      targetDate: g.targetDate ? new Date(g.targetDate) : null,
      monthlyTarget: g.monthlyTarget ?? null,
    };
    if (existing) {
      await prisma.goal.update({ where: { id: existing.id }, data });
    } else {
      await prisma.goal.create({ data: { userId: user.id, ...data } });
    }
  }

  const accountCount = await prisma.account.count({ where: { userId: user.id } });
  console.log(`Seeded user ${user.email}: ${accountCount} accounts, ${iraSchedule.length} IRA years, ${goals.length} goals.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
