import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { formatUSD } from "@/lib/money";
import { toOptions, humanize } from "@/lib/labels";
import { TRANSACTION_CATEGORIES, ENTITIES } from "@/lib/enums";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/lib/actions/transactions";
import RecordForm, { type FieldDef } from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const user = await getCurrentUser();
  const [accounts, txns] = await Promise.all([
    prisma.account.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      include: { account: true },
      take: 200,
    }),
  ]);

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));

  const fields = (init?: {
    accountId?: string;
    date?: string;
    amount?: string;
    description?: string;
    category?: string;
    entity?: string;
    isIncome?: boolean;
    notes?: string;
  }): FieldDef[] => [
    { name: "accountId", label: "Account", type: "select", required: true, options: accountOptions, defaultValue: init?.accountId },
    { name: "date", label: "Date", type: "date", required: true, defaultValue: init?.date ?? new Date().toISOString().slice(0, 10) },
    { name: "amount", label: "Amount (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.amount },
    { name: "description", label: "Description", type: "text", required: true, defaultValue: init?.description },
    { name: "category", label: "Category", type: "select", required: true, options: toOptions(TRANSACTION_CATEGORIES), defaultValue: init?.category },
    { name: "entity", label: "Entity", type: "select", required: true, options: toOptions(ENTITIES), defaultValue: init?.entity ?? "PERSONAL" },
    { name: "isIncome", label: "This is income", type: "checkbox", defaultValue: init?.isIncome },
    { name: "notes", label: "Notes", type: "textarea", defaultValue: init?.notes },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <span className="text-sm text-gray-500">{txns.length} shown</span>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-amber-600">
          Add an account first before recording transactions.
        </p>
      ) : (
        <div className="mb-6">
          <RecordForm mode="create" action={createTransaction} fields={fields()} addLabel="+ Add transaction" />
        </div>
      )}

      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {txns.map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
              <div className="font-medium">{t.description}</div>
              <div className="text-xs text-gray-500">
                {t.date.toLocaleDateString()} · {humanize(t.category)} ·{" "}
                {t.account.name} · {humanize(t.entity)}
              </div>
              {t.notes && <div className="mt-0.5 text-xs text-gray-500">{t.notes}</div>}
              <div className="mt-1 flex gap-3">
                <RecordForm
                  mode="edit"
                  action={updateTransaction}
                  hidden={{ id: t.id }}
                  fields={fields({
                    accountId: t.accountId,
                    date: t.date.toISOString().slice(0, 10),
                    amount: String(t.amount),
                    description: t.description,
                    category: t.category,
                    entity: t.entity,
                    isIncome: t.isIncome,
                    notes: t.notes ?? "",
                  })}
                />
                <DeleteButton action={deleteTransaction} id={t.id} />
              </div>
            </div>
            <div
              className={`shrink-0 font-mono tabular-nums ${
                t.isIncome ? "text-green-600" : ""
              }`}
            >
              {t.isIncome ? "+" : "−"}
              {formatUSD(Math.abs(Number(t.amount)), { cents: true })}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
