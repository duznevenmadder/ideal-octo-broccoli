"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { headerKey, matchQuality, resolveMapping } from "@/lib/import/parse";
import type { ColumnMap } from "@/lib/import/parse";

export type SavedMapping = {
  id: string;
  name: string;
  headerKey: string;
  headers: string[];
  dateCol: string | null;
  descriptionCol: string | null;
  amountCol: string | null;
  debitCol: string | null;
  creditCol: string | null;
  invert: boolean;
};

export type MappingMatch =
  | { quality: "exact" | "partial"; mapping: SavedMapping; resolvedMap: ColumnMap | null }
  | { quality: "none" };

export async function getImportMappings(): Promise<SavedMapping[]> {
  const user = await getCurrentUser();
  const rows = await prisma.importMapping.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    headerKey: r.headerKey,
    headers: JSON.parse(r.headers) as string[],
    dateCol: r.dateCol,
    descriptionCol: r.descriptionCol,
    amountCol: r.amountCol,
    debitCol: r.debitCol,
    creditCol: r.creditCol,
    invert: r.invert,
  }));
}

// Find best match for a given set of headers from the user's saved mappings.
export async function findMappingForHeaders(headers: string[]): Promise<MappingMatch> {
  const user = await getCurrentUser();
  const key = headerKey(headers);

  // Try exact match first
  const exact = await prisma.importMapping.findUnique({
    where: { userId_headerKey: { userId: user.id, headerKey: key } },
  });
  if (exact) {
    const m: SavedMapping = {
      id: exact.id, name: exact.name, headerKey: exact.headerKey,
      headers: JSON.parse(exact.headers) as string[],
      dateCol: exact.dateCol, descriptionCol: exact.descriptionCol,
      amountCol: exact.amountCol, debitCol: exact.debitCol,
      creditCol: exact.creditCol, invert: exact.invert,
    };
    return {
      quality: "exact",
      mapping: m,
      resolvedMap: resolveMapping(headers, m.dateCol, m.descriptionCol, m.amountCol, m.debitCol, m.creditCol),
    };
  }

  // Try partial match — scan all mappings for this user
  const all = await prisma.importMapping.findMany({ where: { userId: user.id } });
  let best: (typeof all)[0] | null = null;
  let bestOverlap = 0;
  for (const row of all) {
    const q = matchQuality(row.headerKey, headers);
    if (q === "partial") {
      const savedParts = new Set(row.headerKey.split("|"));
      const currentParts = new Set(headers.map((h) => h.toLowerCase().trim()));
      const overlap = [...savedParts].filter((p) => currentParts.has(p)).length;
      if (overlap > bestOverlap) { bestOverlap = overlap; best = row; }
    }
  }
  if (best) {
    const m: SavedMapping = {
      id: best.id, name: best.name, headerKey: best.headerKey,
      headers: JSON.parse(best.headers) as string[],
      dateCol: best.dateCol, descriptionCol: best.descriptionCol,
      amountCol: best.amountCol, debitCol: best.debitCol,
      creditCol: best.creditCol, invert: best.invert,
    };
    return {
      quality: "partial",
      mapping: m,
      resolvedMap: resolveMapping(headers, m.dateCol, m.descriptionCol, m.amountCol, m.debitCol, m.creditCol),
    };
  }

  return { quality: "none" };
}

export async function saveImportMapping(
  name: string,
  headers: string[],
  map: ColumnMap,
  invert: boolean,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!name.trim()) return { ok: false, error: "Mapping name is required." };
  const user = await getCurrentUser();
  const key = headerKey(headers);

  // Column name storage (by name, not index — portable across column-reordered exports)
  const dateCol = headers[map.date] ?? null;
  const descriptionCol = headers[map.description] ?? null;
  const amountCol = map.amount >= 0 ? (headers[map.amount] ?? null) : null;
  const debitCol = map.debit >= 0 ? (headers[map.debit] ?? null) : null;
  const creditCol = map.credit >= 0 ? (headers[map.credit] ?? null) : null;

  const row = await prisma.importMapping.upsert({
    where: { userId_headerKey: { userId: user.id, headerKey: key } },
    create: {
      userId: user.id, name: name.trim(), headerKey: key,
      headers: JSON.stringify(headers),
      dateCol, descriptionCol, amountCol, debitCol, creditCol, invert,
    },
    update: {
      name: name.trim(), headers: JSON.stringify(headers),
      dateCol, descriptionCol, amountCol, debitCol, creditCol, invert,
    },
  });
  return { ok: true, id: row.id };
}

export async function updateImportMapping(
  id: string,
  headers: string[],
  map: ColumnMap,
  invert: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  const existing = await prisma.importMapping.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) return { ok: false, error: "Not found." };

  const key = headerKey(headers);
  const dateCol = headers[map.date] ?? null;
  const descriptionCol = headers[map.description] ?? null;
  const amountCol = map.amount >= 0 ? (headers[map.amount] ?? null) : null;
  const debitCol = map.debit >= 0 ? (headers[map.debit] ?? null) : null;
  const creditCol = map.credit >= 0 ? (headers[map.credit] ?? null) : null;

  await prisma.importMapping.update({
    where: { id },
    data: { headerKey: key, headers: JSON.stringify(headers), dateCol, descriptionCol, amountCol, debitCol, creditCol, invert },
  });
  return { ok: true };
}

export async function deleteImportMapping(id: string): Promise<void> {
  const user = await getCurrentUser();
  await prisma.importMapping.deleteMany({ where: { id, userId: user.id } });
}
