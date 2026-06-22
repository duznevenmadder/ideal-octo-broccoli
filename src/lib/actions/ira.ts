"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { str, num, int, optStr } from "./_helpers";

// One row per year — upsert on the unique (userId, year).
export async function setIraYear(formData: FormData) {
  const user = await getCurrentUser();
  const year = int(formData.get("year"));
  const data = {
    recommendedAmt: num(formData.get("recommendedAmt")),
    takenAmt: num(formData.get("takenAmt")),
    taxEstimate: num(formData.get("taxEstimate")),
    netToTOD: num(formData.get("netToTOD")),
    notes: optStr(formData.get("notes")),
  };
  await prisma.iRADistribution.upsert({
    where: { userId_year: { userId: user.id, year } },
    update: data,
    create: { userId: user.id, year, ...data },
  });
  revalidatePath("/ira");
}

export async function deleteIraYear(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Row id is required");
  await prisma.iRADistribution.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/ira");
}
