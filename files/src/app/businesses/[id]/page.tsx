import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { formatUSD } from "@/lib/money";
import { humanize } from "@/lib/labels";
import {
  createPLEntry,
  updatePLEntry,
  deletePLEntry,
} from "@/lib/actions/plentries";
import RecordForm, { type FieldDef } from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

function entryFields(init?: {
  month?: string;
  revenue?: string;
  expenses?: string;
  notes?: string;
}): FieldDef[] {
  return [
    { name: "month", label: "Month", type: "month", required: true, defaultValue: init?.month },
    { name: "revenue", label: "Revenue (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.revenue ?? "0" },
    { name: "expenses", label: "Expenses (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.expenses ?? "0" },
    { name: "notes", label: "Notes", type: "textarea", defaultValue: init?.notes },
  ];
}

export default async function BusinessPLPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const business = await prisma.business.findFirst({
    where: { id, userId: user.id },
    include: { plEntries: { orderBy: { month: "desc" } } },
  });
  if (!business) notFound();

  const entries = business.plEntries;
  const totalRevenue = entries.reduce((s, e) => s + Number(e.revenue), 0);
  const totalExpenses = entries.reduce((s, e) => s + Number(e.expenses), 0);
  const totalNet = totalRevenue - totalExpenses;

  const monthLabel = (d: Date) =>
    d.toLocaleString("en-US", { month: "short", year: "numeric" });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/businesses" className="text-sm text-blue-600 hover:underline">
        ← Businesses
      </Link>

      <div className="mt-2 mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{business.name}</h1>
          <div className="text-xs text-gray-500">
            {humanize(business.entityType)} · {business.state}
            {business.ein ? ` · EIN ${business.ein}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Net income (all time)
          </div>
          <div
            className={`font-mono text-xl font-semibold tabular-nums ${
              totalNet >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatUSD(totalNet)}
          </div>
        </div>
      </div>

      <section className="mb-6 grid grid-cols-3 gap-4 text-sm">
        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
          <div className="text-xs text-gray-500">Revenue</div>
          <div className="font-mono tabular-nums">{formatUSD(totalRevenue)}</div>
        </div>
        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
          <div className="text-xs text-gray-500">Expenses</div>
          <div className="font-mono tabular-nums">{formatUSD(totalExpenses)}</div>
        </div>
        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
          <div className="text-xs text-gray-500">Net</div>
          <div className="font-mono tabular-nums">{formatUSD(totalNet)}</div>
        </div>
      </section>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Monthly P&amp;L
      </h2>
      <div className="mb-4">
        <RecordForm
          mode="create"
          action={createPLEntry}
          hidden={{ businessId: business.id }}
          fields={entryFields()}
          addLabel="+ Add month"
        />
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">
          No P&amp;L entries yet. Add a month above as the numbers come in.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
                <th className="py-2 pr-3">Month</th>
                <th className="py-2 pr-3 text-right">Revenue</th>
                <th className="py-2 pr-3 text-right">Expenses</th>
                <th className="py-2 pr-3 text-right">Net</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const net = Number(e.revenue) - Number(e.expenses);
                return (
                  <tr key={e.id} className="border-b border-gray-100 align-top dark:border-gray-900">
                    <td className="py-2 pr-3 font-medium">{monthLabel(e.month)}</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatUSD(e.revenue)}</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatUSD(e.expenses)}</td>
                    <td
                      className={`py-2 pr-3 text-right font-mono tabular-nums ${
                        net >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatUSD(net)}
                    </td>
                    <td className="py-2">
                      <div className="flex justify-end gap-3">
                        <RecordForm
                          mode="edit"
                          action={updatePLEntry}
                          hidden={{ id: e.id }}
                          fields={entryFields({
                            month: e.month.toISOString().slice(0, 7),
                            revenue: String(e.revenue),
                            expenses: String(e.expenses),
                            notes: e.notes ?? "",
                          })}
                        />
                        <DeleteButton action={deletePLEntry} id={e.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
