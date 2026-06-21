"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { GOAL_TYPES } from "@/lib/enums";
import { str, optStr, num, optNum, optDate, oneOf } from "./_helpers";

function buildData(formData: FormData) {
  return {
    type: oneOf(formData.get("type"), GOAL_TYPES),
    name: str(formData.get("name")),
    targetAmount: num(formData.get("targetAmount")),
    currentAmount: num(formData.get("currentAmount")),
    targetDate: optDate(formData.get("targetDate")),
    monthlyTarget: optNum(formData.get("monthlyTarget")),
    notes: optStr(formData.get("notes")),
  };
}

export async function createGoal(formData: FormData) {
  const user = await getCurrentUser();
  await prisma.goal.create({ data: { userId: user.id, ...buildData(formData) } });
  revalidatePath("/goals");
}

export async function updateGoal(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Goal id is required");
  await prisma.goal.update({ where: { id, userId: user.id }, data: buildData(formData) });
  revalidatePath("/goals");
}

export async function deleteGoal(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Goal id is required");
  await prisma.goal.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/goals");
}
