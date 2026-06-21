import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { formatUSD } from "@/lib/money";
import { toOptions, humanize } from "@/lib/labels";
import { CONFIG } from "@/lib/config";
import {
  ASSET_CLASSES,
  INVESTMENT_ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  type AccountType,
} from "@/lib/enums";
import {
  createHolding,
  updateHolding,
  deleteHolding,
} from "@/lib/actions/holdings";
import RecordForm, { type FieldDef } from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

type HoldingInit = {
  symbol?: string;
  name?: string;
  assetClass?: string;
  shares?: string;
  costBasis?: string;
  currentPrice?: string;
};

function holdingFields(init?: HoldingInit): FieldDef[] {
  return [
    { name: "symbol", label: "Symbol", type: "text", required: true, defaultValue: init?.symbol },
    { name: "name", label: "Name", type: "text", required: true, defaultValue: init?.name },
    { name: "assetClass", label: "Asset class", type: "select", required: true, options: toOptions(ASSET_CLASSES), defaultValue: init?.assetClass ?? "STOCK" },
    { name: "shares", label: "Shares", type: "number", step: "0.000001", required: true, defaultValue: init?.shares },
    { name: "costBasis", label: "Cost basis / share (USD)", type: "number", step: "0.0001", required: true, defaultValue: init?.costBasis },
    { name: "currentPrice", label: "Current price / share (USD)", type: "number", step: "0.0001", required: true, defaultValue: init?.currentPrice },
  ];
}

export default async function InvestmentsPage() {
  const user = await getCurrentUser();
  const accounts = await prisma.account.findMany({
    where: {
      userId: user.id,
      isActive: true,
      type: { in: INVESTMENT_ACCOUNT_TYPES as unknown as string[] },
    },
    include: { holdings: true },
    orderBy: { balance: "desc" },
  });

  // Asset-class allocation across all holdings.
  const allocation: Record<string, number> = {};
  let grandValue = 0;
  for (const a of accounts) {
    for (const h of a.holdings) {
      const value = Number(h.shares) * Number(h.currentPrice);
      allocation[h.assetClass] = (allocation[h.assetClass] ?? 0) + value;
      grandValue += value;
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Investments</h1>

      {/* Allocation summary */}
      <section className="mb-8 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Net allocation
          </h2>
          <span className="font-mono text-sm tabular-nums">{formatUSD(grandValue)}</span>
        </div>
        {grandValue === 0 ? (
          <p className="text-sm text-gray-500">
            No holdings yet. Add positions to an investment account below.
          </p>
        ) : (
          <div className="space-y-1">
            {ASSET_CLASSES.filter((c) => allocation[c]).map((c) => {
              const pct = (allocation[c] / grandValue) * 100;
              return (
                <div key={c}>
                  <div className="flex justify-between text-sm">
                    <span>{humanize(c)}</span>
                    <span className="font-mono tabular-nums text-gray-500">
                      {formatUSD(allocation[c])} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                    <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {accounts.length === 0 && (
        <p className="text-sm text-gray-500">
          No investment accounts. Add one on the Accounts page (e.g. a brokerage or IRA).
        </p>
      )}

      <div className="space-y-8">
        {accounts.map((a) => {
          const holdingsValue = a.holdings.reduce(
            (s, h) => s + Number(h.shares) * Number(h.currentPrice),
            0,
          );
          return (
            <section key={a.id}>
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <h2 className="font-semibold">{a.name}</h2>
                  <div className="text-xs text-gray-500">
                    {ACCOUNT_TYPE_LABELS[a.type as AccountType] ?? a.type}
                    {a.institution ? ` · ${a.institution}` : ""}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-mono tabular-nums">{formatUSD(holdingsValue)}</div>
                  <div className="text-xs text-gray-500">holdings value</div>
                </div>
              </div>

              {a.holdings.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
                        <th className="py-1 pr-2">Symbol</th>
                        <th className="py-1 pr-2 text-right">Shares</th>
                        <th className="py-1 pr-2 text-right">Value</th>
                        <th className="py-1 pr-2 text-right">Gain/Loss</th>
                        <th className="py-1 pr-2 text-right">% acct</th>
                        <th className="py-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.holdings.map((h) => {
                        const value = Number(h.shares) * Number(h.currentPrice);
                        const cost = Number(h.shares) * Number(h.costBasis);
                        const gain = value - cost;
                        const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
                        const pctAcct = holdingsValue > 0 ? value / holdingsValue : 0;
                        const concentrated =
                          pctAcct > CONFIG.WFC_CONCENTRATION_WARNING_THRESHOLD;
                        return (
                          <tr key={h.id} className="border-b border-gray-100 dark:border-gray-900">
                            <td className="py-1.5 pr-2">
                              <div className="font-medium">{h.symbol}</div>
                              <div className="text-xs text-gray-500">
                                {humanize(h.assetClass)}
                              </div>
                            </td>
                            <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                              {Number(h.shares).toLocaleString()}
                            </td>
                            <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                              {formatUSD(value)}
                            </td>
                            <td
                              className={`py-1.5 pr-2 text-right font-mono tabular-nums ${
                                gain >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {gain >= 0 ? "+" : "−"}
                              {formatUSD(Math.abs(gain))} ({gainPct.toFixed(0)}%)
                            </td>
                            <td
                              className={`py-1.5 pr-2 text-right font-mono tabular-nums ${
                                concentrated ? "font-semibold text-amber-600" : ""
                              }`}
                            >
                              {(pctAcct * 100).toFixed(0)}%
                              {concentrated ? " ⚠" : ""}
                            </td>
                            <td className="py-1.5">
                              <div className="flex justify-end gap-2">
                                <RecordForm
                                  mode="edit"
                                  action={updateHolding}
                                  hidden={{ id: h.id }}
                                  fields={holdingFields({
                                    symbol: h.symbol,
                                    name: h.name,
                                    assetClass: h.assetClass,
                                    shares: String(h.shares),
                                    costBasis: String(h.costBasis),
                                    currentPrice: String(h.currentPrice),
                                  })}
                                />
                                <DeleteButton action={deleteHolding} id={h.id} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {a.holdings.some((h) => {
                const value = Number(h.shares) * Number(h.currentPrice);
                return (
                  holdingsValue > 0 &&
                  value / holdingsValue > CONFIG.WFC_CONCENTRATION_WARNING_THRESHOLD
                );
              }) && (
                <p className="mt-1 text-xs text-amber-600">
                  ⚠ A holding exceeds{" "}
                  {(CONFIG.WFC_CONCENTRATION_WARNING_THRESHOLD * 100).toFixed(0)}% of this
                  account — consider diversifying.
                </p>
              )}

              <div className="mt-2">
                <RecordForm
                  mode="create"
                  action={createHolding}
                  hidden={{ accountId: a.id }}
                  fields={holdingFields()}
                  addLabel="+ Add holding"
                />
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
