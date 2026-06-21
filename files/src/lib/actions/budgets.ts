"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { TRANSACTION_CATEGORIES } from "@/lib/enums";
import { str, num, oneOf } from "./_helpers";

// One budget target per category — upsert on the unique (userId, category).
export async function setBudget(formData: FormData) {
  const user = await getCurrentUser();
  const category = oneOf(formData.get("category"), TRANSACTION_CATEGORIES);
  const monthlyTarget = num(formData.get("monthlyTarget"));
  await prisma.budget.upsert({
    where: { userId_category: { userId: user.id, category } },
    update: { monthlyTarget },
    create: { userId: user.id, category, monthlyTarget },
  });
  revalidatePath("/budget");
}

export async function deleteBudget(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Budget id is required");
  await prisma.budget.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/budget");
}
