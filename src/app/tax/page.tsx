import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { formatUSD } from "@/lib/money";
import { CONFIG } from "@/lib/config";
import {
  federalTaxMFJ,
  marginalRateMFJ,
  roomBefore32,
} from "@/lib/tax";
import { setTaxEstimate, syncTaxFromTransactions } from "@/lib/actions/tax";
import { getYtdIncome } from "@/lib/income";
import RecordForm, { type FieldDef } from "@/components/RecordForm";

export const dynamic = "force-dynamic";

type Init = {
  year?: string;
  w2Income?: string;
  businessIncome?: string;
  k1Income?: string;
  iraDistributions?: string;
  deductions?: string;
  qtrPaid?: string;
};

function fields(init?: Init): FieldDef[] {
  return [
    { name: "year", label: "Year", type: "number", required: true, defaultValue: init?.year },
    { name: "w2Income", label: "W2 income (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.w2Income ?? "0" },
    { name: "businessIncome", label: "Business / 1099 income (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.businessIncome ?? "0" },
    { name: "k1Income", label: "K-1 income (USD, can be negative)", type: "number", step: "0.01", required: true, defaultValue: init?.k1Income ?? "0" },
    { name: "iraDistributions", label: "IRA distributions (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.iraDistributions ?? "0" },
    { name: "deductions", label: "Deductions (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.deductions ?? String(CONFIG.STANDARD_DEDUCTION_MFJ_2025) },
    { name: "qtrPaid", label: "Estimated tax paid YTD (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.qtrPaid ?? "0" },
  ];
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className={strong ? "font-medium" : "text-gray-500"}>{label}</span>
      <span className={`font-mono tabular-nums ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

export default async function TaxPage() {
  const user = await getCurrentUser();
  const estimates = await prisma.taxEstimate.findMany({
    where: { userId: user.id },
    orderBy: { year: "desc" },
  });
  const currentYear = new Date().getFullYear();

  // Live income for the current year (prefills the add form) and for each saved
  // year (shown as a live-vs-saved panel).
  const currentLive = await getYtdIncome(user.id, currentYear);
  const liveByYear = new Map(
    await Promise.all(
      estimates.map(
        async (e) => [e.year, await getYtdIncome(user.id, e.year)] as const,
      ),
    ),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold">Tax Planner</h1>
      <p className="mb-6 text-sm text-gray-500">
        MFJ {currentYear}. 32% bracket starts at {formatUSD(CONFIG.BRACKET_32_THRESHOLD_MFJ)} —
        the hard ceiling for IRA distributions. KY state tax estimated at{" "}
        {(CONFIG.KY_STATE_TAX_RATE * 100).toFixed(1)}%.
      </p>

      <div className="mb-8">
        <RecordForm
          mode="create"
          action={setTaxEstimate}
          fields={fields({
            year: String(currentYear),
            w2Income: String(currentLive.w2),
            businessIncome: String(
              currentLive.business1099 +
                currentLive.investment +
                currentLive.edd +
                currentLive.other,
            ),
            k1Income: String(currentLive.k1),
            iraDistributions: String(currentLive.iraDistribution),
          })}
          addLabel="+ Add / update a tax year"
        />
        <p className="mt-1 text-xs text-gray-500">
          Prefilled from {currentYear} transactions ({formatUSD(currentLive.total)}{" "}
          income recorded). Adding a year that already exists updates it.
        </p>
      </div>

      {estimates.length === 0 && (
        <p className="text-sm text-gray-500">No tax years entered yet.</p>
      )}

      <div className="grid gap-6">
        {estimates.map((e) => {
          const taxable = Number(e.taxableIncome);
          const fedTax = federalTaxMFJ(taxable);
          const stateTax = taxable * CONFIG.KY_STATE_TAX_RATE;
          const totalTax = fedTax + stateTax;
          const owed = Math.max(0, totalTax - Number(e.qtrPaid));
          const marginal = marginalRateMFJ(taxable);

          // IRA optimizer: baseline = taxable income excluding IRA distributions.
          const baseline = Math.max(0, taxable - Number(e.iraDistributions));
          const room = roomBefore32(baseline);

          return (
            <section
              key={e.id}
              className="rounded-lg border border-gray-200 p-5 dark:border-gray-800"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{e.year}</h2>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                  Marginal {(marginal * 100).toFixed(0)}%
                </span>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500">
                    Income
                  </h3>
                  <Row label="W2" value={formatUSD(e.w2Income)} />
                  <Row label="Business / 1099" value={formatUSD(e.businessIncome)} />
                  <Row label="K-1" value={formatUSD(e.k1Income)} />
                  <Row label="IRA distributions" value={formatUSD(e.iraDistributions)} />
                  <Row label="Deductions" value={`(${formatUSD(e.deductions)})`} />
                  <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                  <Row label="Taxable income" value={formatUSD(taxable)} strong />
                </div>

                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500">
                    Tax
                  </h3>
                  <Row label="Federal (MFJ)" value={formatUSD(fedTax)} />
                  <Row label={`KY state (${(CONFIG.KY_STATE_TAX_RATE * 100).toFixed(1)}%)`} value={formatUSD(stateTax)} />
                  <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                  <Row label="Total tax" value={formatUSD(totalTax)} strong />
                  <Row label="Paid YTD" value={formatUSD(e.qtrPaid)} />
                  <Row label="Outstanding" value={formatUSD(owed)} strong />
                </div>
              </div>

              <div className="mt-4 rounded bg-blue-50 p-3 text-sm dark:bg-blue-950/40">
                <h3 className="mb-1 text-xs font-semibold uppercase text-blue-700 dark:text-blue-300">
                  IRA distribution optimizer
                </h3>
                <p>
                  Baseline income excl. IRA distributions:{" "}
                  <span className="font-mono">{formatUSD(baseline)}</span>. Room before
                  the 32% bracket:{" "}
                  <span className="font-mono font-semibold">{formatUSD(room)}</span>.
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Taking up to {formatUSD(room)} more keeps you at/below 24%. KY tax on
                  that amount ≈ {formatUSD(room * CONFIG.KY_STATE_TAX_RATE)}.
                </p>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Quarterly due dates:{" "}
                {CONFIG.QUARTERLY_TAX_DUE_DATES.join(", ")}
              </div>

              {(() => {
                const live = liveByYear.get(e.year);
                if (!live || live.total === 0) return null;
                const savedIncome =
                  Number(e.w2Income) +
                  Number(e.businessIncome) +
                  Number(e.k1Income) +
                  Number(e.iraDistributions);
                const matches = Math.abs(savedIncome - live.total) < 0.5;
                return (
                  <div className="mt-3 rounded border border-dashed border-gray-300 p-3 text-xs dark:border-gray-700">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold uppercase text-gray-500">
                        Live from transactions
                      </span>
                      <span className="font-mono tabular-nums">
                        {formatUSD(live.total)} income
                      </span>
                    </div>
                    <div className="text-gray-500">
                      W2 {formatUSD(live.w2)} · 1099 {formatUSD(live.business1099)} ·
                      K-1 {formatUSD(live.k1)} · IRA {formatUSD(live.iraDistribution)}
                      {live.investment + live.edd + live.other > 0
                        ? ` · other ${formatUSD(live.investment + live.edd + live.other)}`
                        : ""}
                    </div>
                    {!matches && (
                      <form action={syncTaxFromTransactions} className="mt-2">
                        <input type="hidden" name="year" value={e.year} />
                        <button
                          type="submit"
                          className="rounded bg-blue-600 px-2 py-1 font-medium text-white hover:bg-blue-700"
                        >
                          Sync income from transactions
                        </button>
                      </form>
                    )}
                  </div>
                );
              })()}

              <div className="mt-3">
                <RecordForm
                  mode="edit"
                  action={setTaxEstimate}
                  editLabel="Edit"
                  fields={fields({
                    year: String(e.year),
                    w2Income: String(e.w2Income),
                    businessIncome: String(e.businessIncome),
                    k1Income: String(e.k1Income),
                    iraDistributions: String(e.iraDistributions),
                    deductions: String(e.deductions),
                    qtrPaid: String(e.qtrPaid),
                  })}
                />
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
