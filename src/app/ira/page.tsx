import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { formatUSD } from "@/lib/money";
import { CONFIG } from "@/lib/config";
import { setIraYear, deleteIraYear } from "@/lib/actions/ira";
import { getIraTakenYtd } from "@/lib/income";
import RecordForm, { type FieldDef } from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

type Init = {
  year?: string;
  recommendedAmt?: string;
  takenAmt?: string;
  taxEstimate?: string;
  netToTOD?: string;
  notes?: string;
};

function fields(init?: Init): FieldDef[] {
  return [
    { name: "year", label: "Year", type: "number", required: true, defaultValue: init?.year },
    { name: "recommendedAmt", label: "Recommended distribution (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.recommendedAmt },
    { name: "takenAmt", label: "Taken YTD (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.takenAmt ?? "0" },
    { name: "taxEstimate", label: "Tax estimate (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.taxEstimate },
    { name: "netToTOD", label: "Net to TOD (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.netToTOD },
    { name: "notes", label: "Notes", type: "textarea", defaultValue: init?.notes },
  ];
}

export default async function IraPage() {
  const user = await getCurrentUser();
  const rows = await prisma.iRADistribution.findMany({
    where: { userId: user.id },
    orderBy: { year: "asc" },
  });
  // Live taken-YTD per year, from INCOME_IRA_DISTRIBUTION transactions.
  const takenLiveByYear = new Map(
    await Promise.all(
      rows.map(
        async (r) => [r.year, await getIraTakenYtd(user.id, r.year)] as const,
      ),
    ),
  );

  const totalRecommended = rows.reduce((s, r) => s + Number(r.recommendedAmt), 0);
  const totalTaken = rows.reduce(
    (s, r) => s + (takenLiveByYear.get(r.year) ?? 0),
    0,
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-2 flex items-end justify-between">
        <h1 className="text-2xl font-semibold">IRA-BDA Schedule</h1>
        <div className="text-right text-sm">
          <div className="text-gray-500">
            Must empty by {CONFIG.IRA_BDA_DEADLINE}
          </div>
          <div className="font-mono">
            Taken {formatUSD(totalTaken)} / {formatUSD(totalRecommended)} planned
          </div>
        </div>
      </div>

      <div className="my-6">
        <RecordForm mode="create" action={setIraYear} fields={fields()} addLabel="+ Add / set year" />
        <p className="mt-1 text-xs text-gray-500">
          Adding a year that already exists updates it.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
              <th className="py-2 pr-3">Year</th>
              <th className="py-2 pr-3 text-right">Recommended</th>
              <th className="py-2 pr-3 text-right">Taken (live)</th>
              <th className="py-2 pr-3 text-right">Tax est.</th>
              <th className="py-2 pr-3 text-right">Net to TOD</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 align-top dark:border-gray-900">
                <td className="py-2 pr-3 font-medium">{r.year}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatUSD(r.recommendedAmt)}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatUSD(takenLiveByYear.get(r.year) ?? 0)}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatUSD(r.taxEstimate)}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatUSD(r.netToTOD)}</td>
                <td className="py-2">
                  <div className="flex justify-end gap-3">
                    <RecordForm
                      mode="edit"
                      action={setIraYear}
                      fields={fields({
                        year: String(r.year),
                        recommendedAmt: String(r.recommendedAmt),
                        takenAmt: String(r.takenAmt),
                        taxEstimate: String(r.taxEstimate),
                        netToTOD: String(r.netToTOD),
                        notes: r.notes ?? "",
                      })}
                    />
                    <DeleteButton action={deleteIraYear} id={r.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
