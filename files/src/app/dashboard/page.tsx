import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { formatUSD } from "@/lib/money";
import { CONFIG } from "@/lib/config";
import { getNetWorth } from "@/lib/networth";
import { getIraTakenYtd } from "@/lib/income";

export const dynamic = "force-dynamic";

// Top urgent items from MEMORY.md (not DB-backed — advisory checklist).
const URGENT_ITEMS = [
  "Call Fidelity — retitle IRA-BDA; get 2023 + 2024 RMD amounts",
  "Hire CPA — inherited IRA, multi-state CA/KY, self-employment",
  "File Form 5329 (2023 + 2024) — request penalty waiver",
  "Take 2025 IRA distribution (~$185,000)",
  "Formal action on $75k partner loan",
];

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${accent ?? ""}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [nw, goals, monthTxns, iraYear, iraTakenLive] = await Promise.all([
    getNetWorth(user.id),
    prisma.goal.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.iRADistribution.findUnique({
      where: { userId_year: { userId: user.id, year: now.getFullYear() } },
    }),
    getIraTakenYtd(user.id, now.getFullYear()),
  ]);

  const netWorth = nw.netWorth;

  // Monthly cash flow from this month's transactions.
  const income = monthTxns
    .filter((t) => t.isIncome)
    .reduce((s, t) => s + Number(t.amount), 0);
  const expenses = monthTxns
    .filter((t) => !t.isIncome)
    .reduce((s, t) => s + Number(t.amount), 0);
  const surplus = income - expenses;

  const fireGap = CONFIG.FIRE_TARGET - netWorth;
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      <section className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="Net worth"
          value={formatUSD(netWorth)}
          sub={`${formatUSD(nw.totalAssets)} assets − ${formatUSD(nw.totalLiabilities)} liabilities`}
        />
        <Stat
          label="FIRE progress"
          value={`${Math.min(100, (netWorth / CONFIG.FIRE_TARGET) * 100).toFixed(0)}%`}
          sub={`${formatUSD(fireGap)} to ${formatUSD(CONFIG.FIRE_TARGET)}`}
        />
      </section>

      <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Cash flow — {monthLabel}
      </h2>
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Income" value={formatUSD(income)} accent="text-green-600" />
        <Stat label="Expenses" value={formatUSD(expenses)} />
        <Stat
          label="Surplus"
          value={formatUSD(surplus)}
          accent={surplus >= 0 ? "text-green-600" : "text-red-600"}
        />
      </section>
      {monthTxns.length === 0 && (
        <p className="mt-2 text-xs text-gray-500">
          No transactions recorded this month yet —{" "}
          <Link href="/transactions" className="text-blue-600 hover:underline">
            add some
          </Link>
          .
        </p>
      )}

      <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Goals
      </h2>
      <section className="grid gap-3">
        {goals.length === 0 && (
          <p className="text-sm text-gray-500">No goals yet.</p>
        )}
        {goals.map((g) => {
          const target = Number(g.targetAmount);
          const current = Number(g.currentAmount);
          const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
          return (
            <div key={g.id}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{g.name}</span>
                <span className="font-mono tabular-nums text-gray-500">
                  {formatUSD(current)} / {formatUSD(target)} ({pct.toFixed(0)}%)
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </section>

      <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
        IRA-BDA tracker — {now.getFullYear()}
      </h2>
      <section className="rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800">
        {iraYear ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500">Recommended</div>
              <div className="font-mono tabular-nums">{formatUSD(iraYear.recommendedAmt)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Taken YTD (live)</div>
              <div className="font-mono tabular-nums">{formatUSD(iraTakenLive)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Remaining</div>
              <div className="font-mono tabular-nums">
                {formatUSD(Math.max(0, Number(iraYear.recommendedAmt) - iraTakenLive))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">
            No {now.getFullYear()} distribution row —{" "}
            <Link href="/ira" className="text-blue-600 hover:underline">
              set one
            </Link>
            . Must empty by {CONFIG.IRA_BDA_DEADLINE}.
          </p>
        )}
      </section>

      <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Urgent action items
      </h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {URGENT_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-gray-500">Source: MEMORY.md.</p>
    </main>
  );
}
