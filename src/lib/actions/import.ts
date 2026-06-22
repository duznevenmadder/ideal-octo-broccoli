"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/user";
import {
  detectColumns,
  rowToStaged,
  normalizeDate,
  parseAmount,
  type ColumnMap,
  type StagedRow,
} from "@/lib/import/parse";
import { guessCategory } from "@/lib/import/categorize";
import { insertTransactions, type ImportRow } from "@/lib/import/insert";

export type ParseResult =
  | { ok: false; error: string }
  | { ok: true; type: "csv"; headers: string[]; rows: string[][]; suggested: ColumnMap }
  | { ok: true; type: "pdf"; staged: StagedRow[]; warning: string };

// Parse an uploaded statement. CSV → headers + raw rows + a suggested column map
// (the client finalizes mapping). PDF → best-effort staged rows.
export async function parseStatement(formData: FormData): Promise<ParseResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file uploaded." };
  }
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";

  try {
    if (!isPdf) {
      const text = await file.text();
      const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
      const all = parsed.data.filter((r) => Array.isArray(r) && r.length > 1);
      if (all.length < 2) {
        return { ok: false, error: "CSV has no data rows." };
      }
      const headers = all[0].map((h) => String(h));
      const rows = all.slice(1).map((r) => r.map((c) => String(c ?? "")));
      return { ok: true, type: "csv", headers, rows, suggested: detectColumns(headers) };
    }

    // PDF: extract text, then heuristically pull date + amount per line.
    const { PDFParse } = await import("pdf-parse");
    const buf = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    await parser.destroy?.();
    const staged = extractPdfRows(result.text ?? "");
    return {
      ok: true,
      type: "pdf",
      staged,
      warning:
        "PDF extraction is approximate — review every row (dates, amounts, and income vs. expense) before importing.",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Could not parse file: ${msg}` };
  }
}

// Heuristic line parser: a line with a leading date and a trailing money value.
function extractPdfRows(text: string): StagedRow[] {
  const out: StagedRow[] = [];
  const moneyRe = /\(?-?\$?\d[\d,]*\.\d{2}\)?-?/g;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const dateMatch = /^\s*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]{3,}\.?\s+\d{1,2},?\s+\d{4})/.exec(trimmed);
    if (!dateMatch) continue;
    const date = normalizeDate(dateMatch[1]);
    if (!date) continue;
    const monies = trimmed.match(moneyRe);
    if (!monies || monies.length === 0) continue;
    const signed = parseAmount(monies[monies.length - 1]);
    if (signed == null || signed === 0) continue;
    let description = trimmed
      .slice(dateMatch[0].length)
      .replace(moneyRe, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!description) description = "(no description)";
    const isIncome = signed > 0;
    out.push({
      date,
      description,
      amount: Math.abs(signed),
      isIncome,
      category: guessCategory(description, isIncome),
    });
  }
  return out;
}

// Bulk-create reviewed rows against an account.
export async function importTransactions(
  accountId: string,
  rows: ImportRow[],
): Promise<{ ok: true; inserted: number; skipped: number } | { ok: false; error: string }> {
  try {
    const user = await getCurrentUser();
    const res = await insertTransactions(user.id, accountId, rows);
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return { ok: true, ...res };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
