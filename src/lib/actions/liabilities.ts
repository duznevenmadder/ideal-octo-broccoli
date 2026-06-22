"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { LIABILITY_TYPES } from "@/lib/enums";
import { str, optStr, num, oneOf } from "./_helpers";

function buildData(formData: FormData) {
  return {
    name: str(formData.get("name")),
    type: oneOf(formData.get("type"), LIABILITY_TYPES),
    balance: num(formData.get("balance")),
    notes: optStr(formData.get("notes")),
  };
}

export async function createLiability(formData: FormData) {
  const user = await getCurrentUser();
  await prisma.liability.create({ data: { userId: user.id, ...buildData(formData) } });
  revalidatePath("/liabilities");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function updateLiability(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Liability id is required");
  await prisma.liability.update({ where: { id, userId: user.id }, data: buildData(formData) });
  revalidatePath("/liabilities");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function deleteLiability(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Liability id is required");
  await prisma.liability.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/liabilities");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}
