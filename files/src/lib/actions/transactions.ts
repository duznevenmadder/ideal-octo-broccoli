"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { TRANSACTION_CATEGORIES, ENTITIES } from "@/lib/enums";
import { str, optStr, num, bool, date, oneOf } from "./_helpers";

async function buildData(formData: FormData, userId: string) {
  const accountId = str(formData.get("accountId"));
  // Ensure the account belongs to this user (auth seam).
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw new Error("Account not found");
  return {
    accountId,
    date: date(formData.get("date")),
    amount: num(formData.get("amount")),
    description: str(formData.get("description")),
    category: oneOf(formData.get("category"), TRANSACTION_CATEGORIES),
    entity: oneOf(formData.get("entity"), ENTITIES),
    isIncome: bool(formData.get("isIncome")),
    notes: optStr(formData.get("notes")),
  };
}

export async function createTransaction(formData: FormData) {
  const user = await getCurrentUser();
  const data = await buildData(formData, user.id);
  await prisma.transaction.create({ data: { userId: user.id, ...data } });
  revalidatePath("/transactions");
}

export async function updateTransaction(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Transaction id is required");
  const data = await buildData(formData, user.id);
  await prisma.transaction.update({ where: { id, userId: user.id }, data });
  revalidatePath("/transactions");
}

export async function deleteTransaction(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Transaction id is required");
  await prisma.transaction.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/transactions");
}
