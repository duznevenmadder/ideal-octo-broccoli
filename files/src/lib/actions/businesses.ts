"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { BUSINESS_ENTITIES } from "@/lib/enums";
import { str, optStr, optNum, oneOf } from "./_helpers";

function buildData(formData: FormData) {
  return {
    name: str(formData.get("name")),
    entityType: oneOf(formData.get("entityType"), BUSINESS_ENTITIES),
    ein: optStr(formData.get("ein")),
    state: str(formData.get("state")),
    monthlyTarget: optNum(formData.get("monthlyTarget")),
    notes: optStr(formData.get("notes")),
  };
}

export async function createBusiness(formData: FormData) {
  const user = await getCurrentUser();
  await prisma.business.create({ data: { userId: user.id, ...buildData(formData) } });
  revalidatePath("/businesses");
}

export async function updateBusiness(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Business id is required");
  await prisma.business.update({ where: { id, userId: user.id }, data: buildData(formData) });
  revalidatePath("/businesses");
}

export async function deleteBusiness(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Business id is required");
  await prisma.business.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/businesses");
}
