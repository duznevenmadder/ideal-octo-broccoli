"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { num, int } from "./_helpers";
import { getYtdIncome } from "@/lib/income";
import { CONFIG } from "@/lib/config";

// Upsert a year's tax estimate. Taxable income is derived from the income inputs
// minus deductions; estimated tax is computed on the page from brackets.
export async function setTaxEstimate(formData: FormData) {
  const user = await getCurrentUser();
  const year = int(formData.get("year"));

  const w2Income = num(formData.get("w2Income"));
  const businessIncome = num(formData.get("businessIncome"));
  const k1Income = num(formData.get("k1Income"));
  const iraDistributions = num(formData.get("iraDistributions"));
  const deductions = num(formData.get("deductions"));
  const qtrPaid = num(formData.get("qtrPaid"));

  const taxableIncome = Math.max(
    0,
    w2Income + businessIncome + k1Income + iraDistributions - deductions,
  );

  const data = {
    w2Income,
    businessIncome,
    k1Income,
    iraDistributions,
    deductions,
    taxableIncome,
    qtrPaid,
  };

  await prisma.taxEstimate.upsert({
    where: { userId_year: { userId: user.id, year } },
    update: data,
    create: { userId: user.id, year, ...data },
  });
  revalidatePath("/tax");
}

// Overwrite a year's income figures from live transaction data, preserving any
// existing deductions / quarterly-paid (or sensible defaults for a new year).
export async function syncTaxFromTransactions(formData: FormData) {
  const user = await getCurrentUser();
  const year = int(formData.get("year"));
  const live = await getYtdIncome(user.id, year);

  const existing = await prisma.taxEstimate.findUnique({
    where: { userId_year: { userId: user.id, year } },
  });
  const deductions = existing
    ? Number(existing.deductions)
    : CONFIG.STANDARD_DEDUCTION_MFJ_2025;
  const qtrPaid = existing ? Number(existing.qtrPaid) : 0;

  const businessIncome = live.business1099;
  // Fold EDD, investment, and other income into the "other" side via business
  // bucket is wrong; keep them visible by adding to taxable through k1/other.
  const w2Income = live.w2;
  const k1Income = live.k1;
  const iraDistributions = live.iraDistribution;
  const otherIncome = live.investment + live.edd + live.other;

  const taxableIncome = Math.max(
    0,
    w2Income +
      businessIncome +
      k1Income +
      iraDistributions +
      otherIncome -
      deductions,
  );

  await prisma.taxEstimate.upsert({
    where: { userId_year: { userId: user.id, year } },
    update: {
      w2Income,
      businessIncome: businessIncome + otherIncome,
      k1Income,
      iraDistributions,
      deductions,
      taxableIncome,
      qtrPaid,
    },
    create: {
      userId: user.id,
      year,
      w2Income,
      businessIncome: businessIncome + otherIncome,
      k1Income,
      iraDistributions,
      deductions,
      taxableIncome,
      qtrPaid,
    },
  });
  revalidatePath("/tax");
}
