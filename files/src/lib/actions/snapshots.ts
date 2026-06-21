"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { getNetWorth } from "@/lib/networth";
import { str, num, date as parseDate } from "./_helpers";

function dayRange(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return { gte: start, lt: end };
}

// Capture today's net worth as a snapshot. Idempotent per day (updates if one
// already exists for today).
export async function captureSnapshot() {
  const user = await getCurrentUser();
  const nw = await getNetWorth(user.id);
  const today = new Date();

  const existing = await prisma.netWorthSnapshot.findFirst({
    where: { userId: user.id, date: dayRange(today) },
  });
  const data = {
    date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    totalAssets: nw.totalAssets,
    totalLiab: nw.totalLiabilities,
    netWorth: nw.netWorth,
  };
  if (existing) {
    await prisma.netWorthSnapshot.update({ where: { id: existing.id }, data });
  } else {
    await prisma.netWorthSnapshot.create({ data: { userId: user.id, ...data } });
  }
  revalidatePath("/fire");
}

// Manually backfill a historical snapshot (date + assets + liabilities).
export async function addSnapshot(formData: FormData) {
  const user = await getCurrentUser();
  const totalAssets = num(formData.get("totalAssets"));
  const totalLiab = num(formData.get("totalLiab"));
  await prisma.netWorthSnapshot.create({
    data: {
      userId: user.id,
      date: parseDate(formData.get("date")),
      totalAssets,
      totalLiab,
      netWorth: totalAssets - totalLiab,
    },
  });
  revalidatePath("/fire");
}

export async function deleteSnapshot(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Snapshot id is required");
  await prisma.netWorthSnapshot.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/fire");
}
