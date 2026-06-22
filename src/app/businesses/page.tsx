import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { formatUSD } from "@/lib/money";
import { toOptions, humanize } from "@/lib/labels";
import { BUSINESS_ENTITIES } from "@/lib/enums";
import {
  createBusiness,
  updateBusiness,
  deleteBusiness,
} from "@/lib/actions/businesses";
import RecordForm, { type FieldDef } from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

type Init = {
  name?: string;
  entityType?: string;
  ein?: string;
  state?: string;
  monthlyTarget?: string;
  notes?: string;
};

function fields(init?: Init): FieldDef[] {
  return [
    { name: "name", label: "Name", type: "text", required: true, defaultValue: init?.name },
    { name: "entityType", label: "Entity type", type: "select", required: true, options: toOptions(BUSINESS_ENTITIES), defaultValue: init?.entityType },
    { name: "state", label: "State", type: "text", required: true, placeholder: "CA", defaultValue: init?.state },
    { name: "ein", label: "EIN", type: "text", defaultValue: init?.ein },
    { name: "monthlyTarget", label: "Monthly revenue target (USD)", type: "number", step: "0.01", defaultValue: init?.monthlyTarget },
    { name: "notes", label: "Notes", type: "textarea", defaultValue: init?.notes },
  ];
}

export default async function BusinessesPage() {
  const user = await getCurrentUser();
  const businesses = await prisma.business.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Businesses</h1>

      <div className="mb-6">
        <RecordForm mode="create" action={createBusiness} fields={fields()} addLabel="+ Add business" />
      </div>

      <ul className="grid gap-4">
        {businesses.map((b) => (
          <li key={b.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-gray-500">
                  {humanize(b.entityType)} · {b.state}
                  {b.ein ? ` · EIN ${b.ein}` : ""}
                </div>
              </div>
              {b.monthlyTarget != null && (
                <div className="text-right font-mono text-sm tabular-nums">
                  {formatUSD(b.monthlyTarget)}/mo target
                </div>
              )}
            </div>
            {b.notes && <p className="mt-2 text-xs text-gray-500">{b.notes}</p>}
            <div className="mt-2 flex gap-3">
              <Link
                href={`/businesses/${b.id}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                View P&amp;L
              </Link>
              <RecordForm
                mode="edit"
                action={updateBusiness}
                hidden={{ id: b.id }}
                fields={fields({
                  name: b.name,
                  entityType: b.entityType,
                  ein: b.ein ?? "",
                  state: b.state,
                  monthlyTarget: b.monthlyTarget != null ? String(b.monthlyTarget) : undefined,
                  notes: b.notes ?? "",
                })}
              />
              <DeleteButton action={deleteBusiness} id={b.id} />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
