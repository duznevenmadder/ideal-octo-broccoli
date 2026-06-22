"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { isAccountType } from "@/lib/enums";

function parseBalance(raw: FormDataEntryValue | null): number {
  const n = Number(String(raw ?? "").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n)) throw new Error("Invalid balance amount");
  return n;
}

function str(raw: FormDataEntryValue | null): string {
  return String(raw ?? "").trim();
}

export async function createAccount(formData: FormData) {
  const user = await getCurrentUser();
  const name = str(formData.get("name"));
  const type = str(formData.get("type"));
  if (!name) throw new Error("Name is required");
  if (!isAccountType(type)) throw new Error(`Invalid account type: ${type}`);

  await prisma.account.create({
    data: {
      userId: user.id,
      name,
      type,
      balance: parseBalance(formData.get("balance")),
      institution: str(formData.get("institution")) || null,
      notes: str(formData.get("notes")) || null,
    },
  });
  revalidatePath("/accounts");
}

export async function updateAccount(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  const name = str(formData.get("name"));
  const type = str(formData.get("type"));
  if (!id) throw new Error("Account id is required");
  if (!name) throw new Error("Name is required");
  if (!isAccountType(type)) throw new Error(`Invalid account type: ${type}`);

  // Scope the update to the current user (auth seam).
  await prisma.account.update({
    where: { id, userId: user.id },
    data: {
      name,
      type,
      balance: parseBalance(formData.get("balance")),
      institution: str(formData.get("institution")) || null,
      notes: str(formData.get("notes")) || null,
    },
  });
  revalidatePath("/accounts");
}

export async function updateBalance(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Account id is required");

  await prisma.account.update({
    where: { id, userId: user.id },
    data: { balance: parseBalance(formData.get("balance")) },
  });
  revalidatePath("/accounts");
}

export async function deactivateAccount(formData: FormData) {
  const user = await getCurrentUser();
  const id = str(formData.get("id"));
  if (!id) throw new Error("Account id is required");

  await prisma.account.update({
    where: { id, userId: user.id },
    data: { isActive: false },
  });
  revalidatePath("/accounts");
}
