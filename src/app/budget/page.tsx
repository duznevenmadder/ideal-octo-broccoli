import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { formatUSD } from "@/lib/money";
import { toOptions, humanize } from "@/lib/labels";
import { TRANSACTION_CATEGORIES } from "@/lib/enums";
import { setBudget, deleteBudget } from "@/lib/actions/budgets";
import RecordForm, { type FieldDef } from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const user = await getCurrentUser();
  const budgets = await prisma.budget.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { category: "asc" },
  });

  const total = budgets.reduce((s, b) => s + Number(b.monthlyTarget), 0);

  const addFields: FieldDef[] = [
    { name: "category", label: "Category", type: "select", required: true, options: toOptions(TRANSACTION_CATEGORIES) },
    { name: "monthlyTarget", label: "Monthly target (USD)", type: "number", step: "0.01", required: true },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Budget</h1>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Monthly total
          </div>
          <div className="font-mono text-xl font-semibold tabular-nums">
            {formatUSD(total)}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <RecordForm
          mode="create"
          action={setBudget}
          fields={addFields}
          addLabel="+ Set category target"
        />
        <p className="mt-1 text-xs text-gray-500">
          Setting a target for an existing category updates it.
        </p>
      </div>

      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {budgets.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-4 py-3">
            <div>
              <div className="font-medium">{humanize(b.category)}</div>
              <div className="mt-1 flex gap-3">
                <RecordForm
                  mode="edit"
                  action={setBudget}
                  editLabel="Edit"
                  fields={[
                    { name: "category", label: "Category", type: "select", required: true, options: toOptions(TRANSACTION_CATEGORIES), defaultValue: b.category },
                    { name: "monthlyTarget", label: "Monthly target (USD)", type: "number", step: "0.01", required: true, defaultValue: String(b.monthlyTarget) },
                  ]}
                />
                <DeleteButton action={deleteBudget} id={b.id} />
              </div>
            </div>
            <div className="font-mono tabular-nums">{formatUSD(b.monthlyTarget)}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
