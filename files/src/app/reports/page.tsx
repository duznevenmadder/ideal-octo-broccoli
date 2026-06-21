import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { formatUSD } from "@/lib/money";
import { humanize } from "@/lib/labels";
import { CONFIG } from "@/lib/config";
import { getNetWorth } from "@/lib/networth";
import { getYtdIncome } from "@/lib/income";
import { federalTaxMFJ, roomBefore32 } from "@/lib/tax";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-semibold uppercase tracking-wide text-gray-600">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

export default async function ReportsPage() {
  const user = await getCurrentUser();
  const now = new Date();
  const year = now.getFullYear();
  const monthStart = new Date(year, now.getMonth(), 1);
  const monthEnd = new Date(year, now.getMonth() + 1, 1);

  const [nw, monthTxns, budgets, goals, accounts, liabilities, iraYear, ytd] =
    await Promise.all([
      getNetWorth(user.id),
      prisma.transaction.findMany({
        where: { userId: user.id, date: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.budget.findMany({ where: { userId: user.id, isActive: true } }),
      prisma.goal.findMany({ where: { userId: user.id, isActive: true }, orderBy: { createdAt: "asc" } }),
      prisma.account.findMany({ where: { userId: user.id, isActive: true }, orderBy: { balance: "desc" } }),
      prisma.liability.findMany({ where: { userId: user.id, isActive: true } }),
      prisma.iRADistribution.findUnique({ where: { userId_year: { userId: user.id, year } } }),
      getYtdIncome(user.id, year),
    ]);

  const income = monthTxns.filter((t) => t.isIncome).reduce((s, t) => s + Number(t.amount), 0);
  const expenses = monthTxns.filter((t) => !t.isIncome).reduce((s, t) => s + Number(t.amount), 0);
  const room = roomBefore32(ytd.total);
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  const spentByCat = new Map<string, number>();
  for (const t of monthTxns) {
    if (t.isIncome) continue;
    spentByCat.set(t.category, (spentByCat.get(t.category) ?? 0) + Number(t.amount));
  }
  const budgetByCat = new Map(budgets.map((b) => [b.category, Number(b.monthlyTarget)]));

  return (
    <main className="report-page mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Monthly Report</h1>
          <p className="text-sm text-gray-500">
            {user.name} · {monthLabel} · generated {now.toLocaleDateString()}
          </p>
        </div>
        <PrintButton />
      </div>

      <Section title="Net Worth">
        <Line label="Total assets" value={formatUSD(nw.totalAssets)} />
        <Line label="Total liabilities" value={formatUSD(nw.totalLiabilities)} />
        <Line label="Net worth" value={formatUSD(nw.netWorth)} />
        <Line
          label={`FIRE gap (target ${formatUSD(CONFIG.FIRE_TARGET)})`}
          value={formatUSD(CONFIG.FIRE_TARGET - nw.netWorth)}
        />
      </Section>

      <Section title={`Cash Flow — ${monthLabel}`}>
        <Line label="Income" value={formatUSD(income)} />
        <Line label="Expenses" value={formatUSD(expenses)} />
        <Line label="Surplus" value={formatUSD(income - expenses)} />
        {spentByCat.size > 0 && (
          <div className="mt-2">
            {[...spentByCat.entries()].map(([cat, spent]) => {
              const target = budgetByCat.get(cat);
              return (
                <Line
                  key={cat}
                  label={`  ${humanize(cat)}${target != null ? ` (budget ${formatUSD(target)})` : ""}`}
                  value={formatUSD(spent)}
                />
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Accounts">
        {accounts.map((a) => (
          <Line key={a.id} label={a.name} value={formatUSD(a.balance)} />
        ))}
        {liabilities.map((l) => (
          <Line key={l.id} label={`${l.name} (liability)`} value={`(${formatUSD(l.balance)})`} />
        ))}
      </Section>

      <Section title={`Tax & IRA-BDA — ${year}`}>
        <Line label="YTD income (from transactions)" value={formatUSD(ytd.total)} />
        <Line label="Est. federal tax (MFJ, on YTD)" value={formatUSD(federalTaxMFJ(ytd.total))} />
        <Line label="Room before 32% bracket" value={formatUSD(room)} />
        {iraYear && (
          <>
            <Line label="IRA recommended distribution" value={formatUSD(iraYear.recommendedAmt)} />
            <Line label="IRA taken YTD" value={formatUSD(ytd.iraDistribution)} />
          </>
        )}
      </Section>

      <Section title="Goals">
        {goals.map((g) => {
          const target = Number(g.targetAmount);
          const current = Number(g.currentAmount);
          const pct = target > 0 ? ((current / target) * 100).toFixed(0) : "0";
          return (
            <Line
              key={g.id}
              label={`${g.name} (${pct}%)`}
              value={`${formatUSD(current)} / ${formatUSD(target)}`}
            />
          );
        })}
      </Section>

      <p className="mt-8 text-xs text-gray-400">
        Generated by Personal Finance App. Figures reflect data entered as of{" "}
        {now.toLocaleString()}.
      </p>
    </main>
  );
}
