import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { formatUSD } from "@/lib/money";
import { toOptions, humanize } from "@/lib/labels";
import { GOAL_TYPES } from "@/lib/enums";
import { createGoal, updateGoal, deleteGoal } from "@/lib/actions/goals";
import RecordForm, { type FieldDef } from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

type Init = {
  type?: string;
  name?: string;
  targetAmount?: string;
  currentAmount?: string;
  targetDate?: string;
  monthlyTarget?: string;
  notes?: string;
};

function fields(init?: Init): FieldDef[] {
  return [
    { name: "type", label: "Type", type: "select", required: true, options: toOptions(GOAL_TYPES), defaultValue: init?.type },
    { name: "name", label: "Name", type: "text", required: true, defaultValue: init?.name },
    { name: "targetAmount", label: "Target amount (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.targetAmount },
    { name: "currentAmount", label: "Current amount (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.currentAmount ?? "0" },
    { name: "targetDate", label: "Target date", type: "date", defaultValue: init?.targetDate },
    { name: "monthlyTarget", label: "Monthly contribution (USD)", type: "number", step: "0.01", defaultValue: init?.monthlyTarget },
    { name: "notes", label: "Notes", type: "textarea", defaultValue: init?.notes },
  ];
}

export default async function GoalsPage() {
  const user = await getCurrentUser();
  const goals = await prisma.goal.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Goals</h1>

      <div className="mb-6">
        <RecordForm mode="create" action={createGoal} fields={fields()} addLabel="+ Add goal" />
      </div>

      <ul className="grid gap-4">
        {goals.map((g) => {
          const target = Number(g.targetAmount);
          const current = Number(g.currentAmount);
          const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
          return (
            <li
              key={g.id}
              className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-gray-500">
                    {humanize(g.type)}
                    {g.targetDate ? ` · by ${g.targetDate.toLocaleDateString()}` : ""}
                    {g.monthlyTarget ? ` · ${formatUSD(g.monthlyTarget)}/mo` : ""}
                  </div>
                </div>
                <div className="text-right font-mono text-sm tabular-nums">
                  {formatUSD(current)} / {formatUSD(target)}
                </div>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
              </div>
              {g.notes && <p className="mt-2 text-xs text-gray-500">{g.notes}</p>}
              <div className="mt-2 flex gap-3">
                <RecordForm
                  mode="edit"
                  action={updateGoal}
                  hidden={{ id: g.id }}
                  fields={fields({
                    type: g.type,
                    name: g.name,
                    targetAmount: String(g.targetAmount),
                    currentAmount: String(g.currentAmount),
                    targetDate: g.targetDate?.toISOString().slice(0, 10),
                    monthlyTarget: g.monthlyTarget != null ? String(g.monthlyTarget) : undefined,
                    notes: g.notes ?? "",
                  })}
                />
                <DeleteButton action={deleteGoal} id={g.id} />
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
