import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { formatUSD } from "@/lib/money";
import { toOptions, humanize } from "@/lib/labels";
import { LIABILITY_TYPES } from "@/lib/enums";
import {
  createLiability,
  updateLiability,
  deleteLiability,
} from "@/lib/actions/liabilities";
import RecordForm, { type FieldDef } from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

function fields(init?: {
  name?: string;
  type?: string;
  balance?: string;
  notes?: string;
}): FieldDef[] {
  return [
    { name: "name", label: "Name", type: "text", required: true, defaultValue: init?.name },
    { name: "type", label: "Type", type: "select", required: true, options: toOptions(LIABILITY_TYPES), defaultValue: init?.type },
    { name: "balance", label: "Balance owed (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.balance },
    { name: "notes", label: "Notes", type: "textarea", defaultValue: init?.notes },
  ];
}

export default async function LiabilitiesPage() {
  const user = await getCurrentUser();
  const liabilities = await prisma.liability.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { balance: "desc" },
  });

  const total = liabilities.reduce((s, l) => s + Number(l.balance), 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Liabilities</h1>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Total owed
          </div>
          <div className="font-mono text-xl font-semibold tabular-nums text-red-600">
            {formatUSD(total)}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <RecordForm mode="create" action={createLiability} fields={fields()} addLabel="+ Add liability" />
      </div>

      {liabilities.length === 0 ? (
        <p className="text-sm text-gray-500">No liabilities recorded.</p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-800">
          {liabilities.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="font-medium">{l.name}</div>
                <div className="text-xs text-gray-500">{humanize(l.type)}</div>
                {l.notes && <div className="mt-0.5 text-xs text-gray-500">{l.notes}</div>}
                <div className="mt-1 flex gap-3">
                  <RecordForm
                    mode="edit"
                    action={updateLiability}
                    hidden={{ id: l.id }}
                    fields={fields({
                      name: l.name,
                      type: l.type,
                      balance: String(l.balance),
                      notes: l.notes ?? "",
                    })}
                  />
                  <DeleteButton action={deleteLiability} id={l.id} />
                </div>
              </div>
              <div className="shrink-0 font-mono tabular-nums text-red-600">
                {formatUSD(l.balance)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
