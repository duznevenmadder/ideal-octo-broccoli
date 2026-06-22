"use client";

import { useEffect, useState, useTransition } from "react";
import { parseStatement, importTransactions } from "@/lib/actions/import";
import {
  rowToStaged,
  headerKey,
  type ColumnMap,
  type StagedRow,
} from "@/lib/import/parse";
import { guessCategory } from "@/lib/import/categorize";
import { TRANSACTION_CATEGORIES } from "@/lib/enums";
import { toOptions, humanize } from "@/lib/labels";
import { formatUSD } from "@/lib/money";
import {
  findMappingForHeaders,
  saveImportMapping,
  updateImportMapping,
  type SavedMapping,
  type MappingMatch,
} from "@/lib/actions/importMappings";

type UIRow = StagedRow & { id: number; include: boolean };

type CsvState = {
  headers: string[];
  rows: string[][];
  map: ColumnMap;
};

const catOptions = toOptions(TRANSACTION_CATEGORIES);

function deriveCsvRows(rows: string[][], map: ColumnMap, invert: boolean): UIRow[] {
  const out: UIRow[] = [];
  rows.forEach((cells, i) => {
    const staged = rowToStaged(cells, map, guessCategory);
    if (!staged) return;
    const isIncome = invert ? !staged.isIncome : staged.isIncome;
    out.push({
      id: i,
      ...staged,
      isIncome,
      category: guessCategory(staged.description, isIncome),
      include: true,
    });
  });
  return out;
}

// ── Mapping banner ────────────────────────────────────────────────────────────

function MappingBanner({
  match,
  onDismiss,
}: {
  match: MappingMatch & { quality: "exact" | "partial" };
  onDismiss: () => void;
}) {
  const isExact = match.quality === "exact";
  return (
    <div
      className={`mb-4 flex items-start justify-between gap-4 rounded border p-3 text-sm ${
        isExact
          ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200"
          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
      }`}
    >
      <span>
        {isExact ? (
          <>
            <strong>Saved mapping applied:</strong> "{match.mapping.name}". Adjust below if needed.
          </>
        ) : (
          <>
            <strong>Similar mapping found:</strong> "{match.mapping.name}" (columns differ slightly). Review the mapping below.
          </>
        )}
      </span>
      <button onClick={onDismiss} className="shrink-0 text-xs underline opacity-70 hover:opacity-100">
        Dismiss
      </button>
    </div>
  );
}

// ── Save / update prompt shown after a successful import ──────────────────────

function MappingSavePrompt({
  headers,
  map,
  invert,
  existingMapping,
  onSaved,
}: {
  headers: string[];
  map: ColumnMap;
  invert: boolean;
  existingMapping: SavedMapping | null;
  onSaved: () => void;
}) {
  const [saving, startSave] = useTransition();
  const [name, setName] = useState(existingMapping?.name ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) return null;

  function handleSave() {
    setErr(null);
    startSave(async () => {
      if (existingMapping) {
        const res = await updateImportMapping(existingMapping.id, headers, map, invert);
        if (!res.ok) { setErr(res.error); return; }
      } else {
        const res = await saveImportMapping(name, headers, map, invert);
        if (!res.ok) { setErr(res.error); return; }
      }
      setDone(true);
      onSaved();
    });
  }

  return (
    <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
      {existingMapping ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-blue-800 dark:text-blue-200">
            The mapping changed — update saved mapping <strong>"{existingMapping.name}"</strong>?
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Updating…" : "Update mapping"}
          </button>
          <button
            onClick={() => setDone(true)}
            className="text-xs text-blue-700 underline dark:text-blue-300"
          >
            Keep original
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-blue-800 dark:text-blue-200">Save this mapping for future imports?</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Wells Fargo Checking"
            className="rounded border border-blue-300 px-2 py-1 text-sm dark:border-blue-700 dark:bg-gray-800"
          />
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save mapping"}
          </button>
          <button onClick={() => setDone(true)} className="text-xs text-blue-700 underline dark:text-blue-300">
            Skip
          </button>
        </div>
      )}
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function ImportWizard({
  accounts,
}: {
  accounts: { id: string; name: string }[];
}) {
  const [parsing, startParse] = useTransition();
  const [importing, startImport] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [csv, setCsv] = useState<CsvState | null>(null);
  const [invert, setInvert] = useState(false);
  const [rows, setRows] = useState<UIRow[]>([]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [result, setResult] = useState<string | null>(null);

  // Mapping state
  const [match, setMatch] = useState<MappingMatch | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  // After import: which mapping was used (for update prompt) or null (for save prompt)
  const [importedWith, setImportedWith] = useState<{
    headers: string[];
    map: ColumnMap;
    invert: boolean;
    existingMapping: SavedMapping | null;
    mappingChanged: boolean;
  } | null>(null);

  // Rebuild rows when column mapping or sign-invert changes.
  useEffect(() => {
    if (csv) setRows(deriveCsvRows(csv.rows, csv.map, invert));
  }, [csv, invert]);

  function onFile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setWarning(null);
    setResult(null);
    setCsv(null);
    setRows([]);
    setMatch(null);
    setBannerDismissed(false);
    setImportedWith(null);
    const form = new FormData(e.currentTarget);
    startParse(async () => {
      const res = await parseStatement(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.type === "csv") {
        // Look for a saved mapping for these headers
        const m = await findMappingForHeaders(res.headers);
        setMatch(m);

        let resolvedMap = res.suggested;
        let resolvedInvert = false;
        if ((m.quality === "exact" || m.quality === "partial") && m.resolvedMap) {
          resolvedMap = m.resolvedMap;
          resolvedInvert = m.mapping.invert;
          setInvert(m.mapping.invert);
        }

        setCsv({ headers: res.headers, rows: res.rows, map: resolvedMap });
        if (m.quality === "none") setInvert(false);
        else if (m.quality !== "exact" && m.quality !== "partial") setInvert(false);
        else setInvert(resolvedInvert);
      } else {
        setWarning(res.warning);
        setRows(res.staged.map((s, i) => ({ ...s, id: i, include: true })));
      }
    });
  }

  function updateMap(patch: Partial<ColumnMap>) {
    setCsv((c) => (c ? { ...c, map: { ...c.map, ...patch } } : c));
  }

  function updateRow(id: number, patch: Partial<UIRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function runImport() {
    if (!csv) return runImportPdf();
    runImportCsv();
  }

  function runImportPdf() {
    setResult(null);
    setError(null);
    const selected = rows.filter((r) => r.include);
    if (!accountId || selected.length === 0) {
      setError("Pick an account and at least one row.");
      return;
    }
    startImport(async () => {
      const res = await importTransactions(accountId, selected);
      if (res.ok) {
        setResult(`Imported ${res.inserted} transaction(s)${res.skipped ? `, skipped ${res.skipped}` : ""}.`);
        setRows([]);
      } else {
        setError(res.error);
      }
    });
  }

  function runImportCsv() {
    if (!csv) return;
    setResult(null);
    setError(null);
    const selected = rows.filter((r) => r.include);
    if (!accountId || selected.length === 0) {
      setError("Pick an account and at least one row.");
      return;
    }

    // Detect if mapping changed from what was saved
    const savedMapping =
      match && (match.quality === "exact" || match.quality === "partial")
        ? match.mapping
        : null;
    const mappingChanged = savedMapping
      ? savedMapping.invert !== invert ||
        (csv.headers[csv.map.date] ?? null) !== savedMapping.dateCol ||
        (csv.headers[csv.map.description] ?? null) !== savedMapping.descriptionCol ||
        (csv.map.amount >= 0 ? csv.headers[csv.map.amount] : null) !== savedMapping.amountCol ||
        (csv.map.debit >= 0 ? csv.headers[csv.map.debit] : null) !== savedMapping.debitCol ||
        (csv.map.credit >= 0 ? csv.headers[csv.map.credit] : null) !== savedMapping.creditCol
      : false;

    startImport(async () => {
      const res = await importTransactions(accountId, selected);
      if (res.ok) {
        setResult(`Imported ${res.inserted} transaction(s)${res.skipped ? `, skipped ${res.skipped}` : ""}.`);
        setRows([]);
        // Trigger save/update prompt if: no mapping existed, or mapping changed
        if (!savedMapping || mappingChanged) {
          setImportedWith({
            headers: csv.headers,
            map: csv.map,
            invert,
            existingMapping: mappingChanged ? savedMapping : null,
            mappingChanged,
          });
        }
        setCsv(null);
      } else {
        setError(res.error);
      }
    });
  }

  const includedCount = rows.filter((r) => r.include).length;
  const colSelect = (label: string, value: number, onChange: (n: number) => void, allowNone = false) =>
    csv && (
      <label className="grid gap-1 text-xs">
        <span className="text-gray-500">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
        >
          {allowNone && <option value={-1}>(none)</option>}
          {csv.headers.map((h, i) => (
            <option key={i} value={i}>
              {h || `Column ${i + 1}`}
            </option>
          ))}
        </select>
      </label>
    );

  const showBanner =
    !bannerDismissed &&
    match &&
    (match.quality === "exact" || match.quality === "partial");

  return (
    <div>
      {/* Upload */}
      <form onSubmit={onFile} className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".csv,.pdf,text/csv,application/pdf"
          required
          className="text-sm"
        />
        <button
          type="submit"
          disabled={parsing}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {parsing ? "Parsing…" : "Parse file"}
        </button>
      </form>

      {error && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40">
          {error}
        </p>
      )}
      {warning && (
        <p className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40">
          {warning}
        </p>
      )}
      {result && (
        <p className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40">
          {result}{" "}
          <a href="/transactions" className="font-medium underline">
            View transactions
          </a>
        </p>
      )}

      {/* Mapping banner */}
      {showBanner && match && (match.quality === "exact" || match.quality === "partial") && (
        <MappingBanner match={match} onDismiss={() => setBannerDismissed(true)} />
      )}

      {/* Save / update mapping prompt (shown after import) */}
      {importedWith && (
        <MappingSavePrompt
          headers={importedWith.headers}
          map={importedWith.map}
          invert={importedWith.invert}
          existingMapping={importedWith.existingMapping}
          onSaved={() => setImportedWith(null)}
        />
      )}

      {/* CSV column mapping */}
      {csv && (
        <div className="mb-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <div className="mb-2 text-sm font-semibold">Column mapping</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {colSelect("Date", csv.map.date, (n) => updateMap({ date: n }))}
            {colSelect("Description", csv.map.description, (n) => updateMap({ description: n }))}
            {colSelect("Amount (signed)", csv.map.amount, (n) => updateMap({ amount: n, debit: -1, credit: -1 }), true)}
            {colSelect("Debit", csv.map.debit, (n) => updateMap({ debit: n, amount: -1 }), true)}
            {colSelect("Credit", csv.map.credit, (n) => updateMap({ credit: n, amount: -1 }), true)}
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} />
            Invert sign (use for credit cards where charges are positive)
          </label>
        </div>
      )}

      {/* Editable preview */}
      {rows.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Import into</span>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={runImport}
              disabled={importing}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {importing ? "Importing…" : `Import ${includedCount} selected`}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
                  <th className="py-1 pr-2"></th>
                  <th className="py-1 pr-2">Date</th>
                  <th className="py-1 pr-2">Description</th>
                  <th className="py-1 pr-2 text-right">Amount</th>
                  <th className="py-1 pr-2">Income?</th>
                  <th className="py-1 pr-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-gray-100 dark:border-gray-900 ${r.include ? "" : "opacity-40"}`}
                  >
                    <td className="py-1 pr-2">
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) => updateRow(r.id, { include: e.target.checked })}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="date"
                        value={r.date}
                        onChange={(e) => updateRow(r.id, { date: e.target.value })}
                        className="rounded border border-gray-300 px-1 py-0.5 dark:border-gray-600 dark:bg-gray-800"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        value={r.description}
                        onChange={(e) => updateRow(r.id, { description: e.target.value })}
                        className="w-44 rounded border border-gray-300 px-1 py-0.5 dark:border-gray-600 dark:bg-gray-800"
                      />
                    </td>
                    <td className="py-1 pr-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={r.amount}
                        onChange={(e) => updateRow(r.id, { amount: Number(e.target.value) })}
                        className="w-24 rounded border border-gray-300 px-1 py-0.5 text-right font-mono dark:border-gray-600 dark:bg-gray-800"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="checkbox"
                        checked={r.isIncome}
                        onChange={(e) =>
                          updateRow(r.id, {
                            isIncome: e.target.checked,
                            category: guessCategory(r.description, e.target.checked),
                          })
                        }
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <select
                        value={r.category}
                        onChange={(e) => updateRow(r.id, { category: e.target.value })}
                        className="rounded border border-gray-300 px-1 py-0.5 dark:border-gray-600 dark:bg-gray-800"
                      >
                        {catOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {rows.length} rows parsed · {includedCount} selected ·{" "}
            {formatUSD(
              rows
                .filter((r) => r.include)
                .reduce((s, r) => s + (r.isIncome ? r.amount : -r.amount), 0),
            )}{" "}
            net
          </p>
        </>
      )}
    </div>
  );
}
