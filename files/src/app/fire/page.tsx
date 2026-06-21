import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { formatUSD } from "@/lib/money";
import { CONFIG } from "@/lib/config";
import { getNetWorth } from "@/lib/networth";
import { projectFire } from "@/lib/projection";
import {
  captureSnapshot,
  addSnapshot,
  deleteSnapshot,
} from "@/lib/actions/snapshots";
import LineChart from "@/components/LineChart";
import RecordForm, { type FieldDef } from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

// Compact axis label, e.g. $1.9M / $250K.
function compactUSD(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export default async function FirePage({
  searchParams,
}: {
  searchParams: Promise<{ monthly?: string; ret?: string }>;
}) {
  const sp = await searchParams;
  const monthly = Number(sp.monthly ?? CONFIG.MONTHLY_SURPLUS_ESTIMATE);
  const returnPct = Number(sp.ret ?? "7");
  const monthlyContribution = Number.isFinite(monthly)
    ? monthly
    : CONFIG.MONTHLY_SURPLUS_ESTIMATE;
  const annualReturn = (Number.isFinite(returnPct) ? returnPct : 7) / 100;

  const user = await getCurrentUser();
  const [nw, snapshots] = await Promise.all([
    getNetWorth(user.id),
    prisma.netWorthSnapshot.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
    }),
  ]);

  const proj = projectFire(
    nw.netWorth,
    monthlyContribution,
    annualReturn,
    CONFIG.FIRE_TARGET,
  );
  const gap = CONFIG.FIRE_TARGET - nw.netWorth;
  const pct = Math.min(100, (nw.netWorth / CONFIG.FIRE_TARGET) * 100);

  const projSeries = [
    {
      color: "#2563eb",
      points: proj.series.map((p) => ({ x: p.month, y: p.value })),
    },
  ];
  const trendSeries = [
    {
      color: "#2563eb",
      points: snapshots.map((s) => ({
        x: s.date.getTime(),
        y: Number(s.netWorth),
      })),
    },
  ];

  const snapshotFields: FieldDef[] = [
    { name: "date", label: "Date", type: "date", required: true },
    { name: "totalAssets", label: "Total assets (USD)", type: "number", step: "0.01", required: true },
    { name: "totalLiab", label: "Total liabilities (USD)", type: "number", step: "0.01", required: true, defaultValue: "0" },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">FIRE Projection</h1>

      {/* Summary */}
      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <div className="text-xs uppercase tracking-wide text-gray-500">Current net worth</div>
          <div className="font-mono text-xl font-semibold tabular-nums">{formatUSD(nw.netWorth)}</div>
          <div className="text-xs text-gray-500">{pct.toFixed(0)}% of FIRE</div>
        </div>
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <div className="text-xs uppercase tracking-wide text-gray-500">FIRE number</div>
          <div className="font-mono text-xl font-semibold tabular-nums">{formatUSD(CONFIG.FIRE_TARGET)}</div>
          <div className="text-xs text-gray-500">{formatUSD(gap)} to go</div>
        </div>
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <div className="text-xs uppercase tracking-wide text-gray-500">Projected FI</div>
          <div className="font-mono text-xl font-semibold tabular-nums">
            {proj.reachedMonth === 0
              ? "Reached 🎉"
              : proj.reachedMonth == null
                ? "50+ yrs"
                : `${(proj.reachedMonth / 12).toFixed(1)} yrs`}
          </div>
          <div className="text-xs text-gray-500">
            {proj.reachedDate
              ? proj.reachedDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
              : "raise savings/return"}
          </div>
        </div>
      </section>

      {/* Assumptions (GET form — no storage needed) */}
      <form method="get" className="mb-8 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
        <label className="grid gap-1">
          <span className="text-xs text-gray-500">Monthly contribution (USD)</span>
          <input
            name="monthly"
            type="number"
            step="50"
            defaultValue={monthlyContribution}
            className="w-44 rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-gray-500">Annual return (%)</span>
          <input
            name="ret"
            type="number"
            step="0.5"
            defaultValue={returnPct}
            className="w-28 rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
          />
        </label>
        <button type="submit" className="rounded bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700">
          Recalculate
        </button>
      </form>

      {/* Projection chart */}
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Projected net worth → FIRE
      </h2>
      <div className="mb-2 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
        <LineChart
          series={projSeries}
          target={CONFIG.FIRE_TARGET}
          targetLabel={`FIRE ${compactUSD(CONFIG.FIRE_TARGET)}`}
          yFormat={compactUSD}
          xLabels={[
            "now",
            proj.reachedMonth
              ? `${(proj.reachedMonth / 12).toFixed(1)} yrs`
              : "50 yrs",
          ]}
        />
      </div>
      <p className="mb-8 text-xs text-gray-500">
        Assumes {formatUSD(monthlyContribution)}/mo contributions compounding at{" "}
        {returnPct}% annually from today&apos;s net worth.
      </p>

      {/* Net worth trend (historical snapshots) */}
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Net worth trend
      </h2>
      <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
        {snapshots.length >= 2 ? (
          <LineChart
            series={trendSeries}
            yFormat={compactUSD}
            xLabels={[
              snapshots[0].date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
              snapshots[snapshots.length - 1].date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            ]}
          />
        ) : (
          <p className="text-sm text-gray-500">
            Need at least two snapshots to chart a trend. Capture one now, or backfill history below.
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <form action={captureSnapshot}>
          <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700">
            Capture snapshot now
          </button>
        </form>
        <RecordForm
          mode="create"
          action={addSnapshot}
          fields={snapshotFields}
          addLabel="+ Backfill a historical snapshot"
        />
      </div>

      {snapshots.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-200 text-sm dark:divide-gray-800">
          {[...snapshots].reverse().map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <span className="text-gray-500">
                {s.date.toLocaleDateString()}
              </span>
              <span className="flex items-center gap-3">
                <span className="font-mono tabular-nums">{formatUSD(s.netWorth)}</span>
                <DeleteButton action={deleteSnapshot} id={s.id} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
