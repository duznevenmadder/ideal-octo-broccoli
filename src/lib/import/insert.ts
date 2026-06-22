import { prisma } from "@/lib/db";
import { TRANSACTION_CATEGORIES, ENTITIES } from "@/lib/enums";
import type { StagedRow } from "./parse";

const CATEGORY_SET = new Set<string>(TRANSACTION_CATEGORIES);
const ENTITY_SET = new Set<string>(ENTITIES);

export type ImportRow = StagedRow & { entity?: string };

// Core bulk insert (no auth, no revalidate) — unit-testable. Validates each row
// and skips invalid ones, returning how many were inserted.
export async function insertTransactions(
  userId: string,
  accountId: string,
  rows: ImportRow[],
): Promise<{ inserted: number; skipped: number }> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw new Error("Account not found");

  const data: {
    userId: string;
    accountId: string;
    date: Date;
    amount: number;
    description: string;
    category: string;
    entity: string;
    isIncome: boolean;
  }[] = [];

  for (const r of rows) {
    const date = new Date(r.date);
    if (isNaN(date.getTime())) continue;
    if (!Number.isFinite(r.amount) || r.amount <= 0) continue;
    const category = CATEGORY_SET.has(r.category) ? r.category : "OTHER";
    const entity = r.entity && ENTITY_SET.has(r.entity) ? r.entity : "PERSONAL";
    data.push({
      userId,
      accountId,
      date,
      amount: r.amount,
      description: r.description?.trim() || "(no description)",
      category,
      entity,
      isIncome: Boolean(r.isIncome),
    });
  }

  if (data.length === 0) return { inserted: 0, skipped: rows.length };
  const result = await prisma.transaction.createMany({ data });
  return { inserted: result.count, skipped: rows.length - result.count };
}
