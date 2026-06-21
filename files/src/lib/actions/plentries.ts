"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { str, optStr, num, monthDate } from "./_helpers";

// Confirm the business belongs to the current user (auth seam).
async function assertOwnedBusiness(businessId: string, userId: string) {
  const biz = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!biz) throw new Error("Business not found");
}

function buildData(formData: FormData) {
  const revenue = num(formData.get("revenue"));
  const expenses = num(formData.get("expenses"));
  return {
    month: monthDate(formData.get("month")),
    revenue,
    expenses,
    netIncome: revenue - expenses, // auto-computed
    notes: optStr(formData.get("notes")),
  };
}

export async function createPLEntry(formData: FormData) {
  const user = await getCurrentUser();
  const businessId = str(formData.get("businessId"));
  await assertOwnedBusiness(businessId, user.id);
  await prisma.pLEntry.create({ data: { businessId, ...buildData(formData) } });
  revalidatePath(`/businesses/${businessId}`);
}

async function assertOwnedEntry(id: string, userId: string) {
  const entry = await prisma.pLEntry.findUnique({
    where: { id },
    include: { business: true },
  });
  if (!entry || entry.business.userId !== userId) {
    throw new Error("P&L entry not found");
  }
  return entry;
}

export async function updatePLEntry(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Entry id is required");
  const entry = await assertOwnedEntry(id, user.id);
  await prisma.pLEntry.update({ where: { id }, data: buildData(formData) });
  revalidatePath(`/businesses/${entry.businessId}`);
}

export async function deletePLEntry(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Entry id is required");
  const entry = await assertOwnedEntry(id, user.id);
  await prisma.pLEntry.delete({ where: { id } });
  revalidatePath(`/businesses/${entry.businessId}`);
}
