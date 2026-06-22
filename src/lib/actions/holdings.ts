"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { ASSET_CLASSES } from "@/lib/enums";
import { str, num, oneOf } from "./_helpers";

// Confirm the target account belongs to the current user (auth seam).
async function assertOwnedAccount(accountId: string, userId: string) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw new Error("Account not found");
}

function buildData(formData: FormData) {
  return {
    symbol: str(formData.get("symbol")).toUpperCase(),
    name: str(formData.get("name")),
    assetClass: oneOf(formData.get("assetClass"), ASSET_CLASSES),
    shares: num(formData.get("shares")),
    costBasis: num(formData.get("costBasis")),
    currentPrice: num(formData.get("currentPrice")),
  };
}

export async function createHolding(formData: FormData) {
  const user = await getCurrentUser();
  const accountId = str(formData.get("accountId"));
  await assertOwnedAccount(accountId, user.id);
  await prisma.holding.create({ data: { accountId, ...buildData(formData) } });
  revalidatePath("/investments");
}

export async function updateHolding(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Holding id is required");
  // Ensure the holding's account belongs to this user.
  const holding = await prisma.holding.findUnique({
    where: { id },
    include: { account: true },
  });
  if (!holding || holding.account.userId !== user.id) {
    throw new Error("Holding not found");
  }
  await prisma.holding.update({ where: { id }, data: buildData(formData) });
  revalidatePath("/investments");
}

export async function deleteHolding(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Holding id is required");
  const holding = await prisma.holding.findUnique({
    where: { id },
    include: { account: true },
  });
  if (!holding || holding.account.userId !== user.id) {
    throw new Error("Holding not found");
  }
  await prisma.holding.delete({ where: { id } });
  revalidatePath("/investments");
}
