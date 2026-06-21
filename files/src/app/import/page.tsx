import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import ImportWizard from "@/components/ImportWizard";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const user = await getCurrentUser();
  const accounts = await prisma.account.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-2xl font-semibold">Import statement</h1>
      <p className="mb-6 text-sm text-gray-500">
        Upload a bank or credit-card export (CSV or PDF). Map the columns, review
        every row, then import. Your statement is parsed locally — it is never
        sent anywhere.
      </p>
      {accounts.length === 0 ? (
        <p className="text-sm text-amber-600">Add an account first, then import into it.</p>
      ) : (
        <ImportWizard accounts={accounts} />
      )}
    </main>
  );
}
