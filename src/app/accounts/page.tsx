import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { formatUSD } from "@/lib/money";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  type AccountType,
} from "@/lib/enums";
import { createAccount, updateAccount } from "@/lib/actions/accounts";
import { getNetWorth } from "@/lib/networth";
import { plaidConfigured } from "@/lib/plaid";
import RecordForm, { type FieldDef } from "@/components/RecordForm";
import BalanceUpdate from "@/components/BalanceUpdate";
import PlaidConnect from "@/components/PlaidConnect";

export const dynamic = "force-dynamic";

const accountTypeOptions = ACCOUNT_TYPES.map((t) => ({
  value: t,
  label: ACCOUNT_TYPE_LABELS[t],
}));

function accountFields(init?: {
  name?: string;
  type?: string;
  balance?: string;
  institution?: string;
  notes?: string;
}): FieldDef[] {
  return [
    { name: "name", label: "Name", type: "text", required: true, defaultValue: init?.name },
    { name: "type", label: "Type", type: "select", required: true, options: accountTypeOptions, defaultValue: init?.type ?? "CHECKING" },
    { name: "balance", label: "Balance (USD)", type: "number", step: "0.01", required: true, defaultValue: init?.balance },
    { name: "institution", label: "Institution", type: "text", defaultValue: init?.institution },
    { name: "notes", label: "Notes", type: "textarea", defaultValue: init?.notes },
  ];
}

export default async function AccountsPage() {
  const user = await getCurrentUser();
  const [accounts, nw] = await Promise.all([
    prisma.account.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: [{ balance: "desc" }],
    }),
    getNetWorth(user.id),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Accounts</h1>
          <p className="text-sm text-gray-500">{user.name}</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Net worth
          </div>
          <div className="font-mono text-2xl font-semibold tabular-nums">
            {formatUSD(nw.netWorth)}
          </div>
          <div className="text-xs text-gray-500">
            {formatUSD(nw.totalAssets)} assets − {formatUSD(nw.totalLiabilities)} debt
          </div>
        </div>
      </header>

      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
              <div className="font-medium">{a.name}</div>
              <div className="text-xs text-gray-500">
                {ACCOUNT_TYPE_LABELS[a.type as AccountType] ?? a.type}
                {a.institution ? ` · ${a.institution}` : ""}
                {` · updated ${a.lastUpdated.toLocaleDateString()}`}
              </div>
              {a.notes && (
                <div className="mt-0.5 text-xs text-amber-600 dark:text-amber-500">
                  {a.notes}
                </div>
              )}
              <div className="mt-1">
                <RecordForm
                  mode="edit"
                  action={updateAccount}
                  hidden={{ id: a.id }}
                  fields={accountFields({
                    name: a.name,
                    type: a.type,
                    balance: String(a.balance),
                    institution: a.institution ?? "",
                    notes: a.notes ?? "",
                  })}
                />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <BalanceUpdate
                id={a.id}
                display={formatUSD(a.balance)}
                raw={String(a.balance)}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
        <RecordForm
          mode="create"
          action={createAccount}
          fields={accountFields()}
          addLabel="+ Add account"
        />
        <PlaidConnect configured={plaidConfigured()} />
      </div>
    </main>
  );
}
