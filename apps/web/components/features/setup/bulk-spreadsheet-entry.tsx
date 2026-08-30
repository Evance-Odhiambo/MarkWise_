"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  Download,
  FileSpreadsheet,
  Plus,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface BulkEntryRow {
  id: string;
  name: string;
  identifier: string; // staffNumber or admissionNumber
  extra?: string; // course name or department
  error?: string | null;
}

interface BulkSpreadsheetEntryProps {
  mode: "lecturer" | "student";
  entityName: string; // "Lecturer" or "Student"
  identifierLabel: string; // "Staff / Payroll ID" or "Admission Number"
  identifierPlaceholder: string; // "e.g. LEC-104" or "e.g. SC211/0458/2023"
  extraLabel?: string;
  existingIdentifiers?: Set<string>;
  onCommit: (rows: Array<{ name: string; identifier: string; extra?: string }>) => void;
  isSaving?: boolean;
}

export function BulkSpreadsheetEntry({
  mode,
  entityName,
  identifierLabel,
  identifierPlaceholder,
  extraLabel,
  existingIdentifiers = new Set(),
  onCommit,
  isSaving = false,
}: BulkSpreadsheetEntryProps) {
  const createEmptyRow = (idx?: number): BulkEntryRow => ({
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    identifier: "",
    extra: "",
    error: null,
  });

  const [rows, setRows] = useState<BulkEntryRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ]);

  const [showQuickPaste, setShowQuickPaste] = useState(false);
  const [pasteRawText, setPasteRawText] = useState("");
  const [pasteDelimiter, setPasteDelimiter] = useState<"auto" | "tab" | "comma" | "space">("auto");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Validate rows for duplicates and blanks
  const validatedRows = useMemo(() => {
    const seenBatchIds = new Map<string, number>();

    // Count occurrences in this batch
    rows.forEach((r) => {
      const cleanId = r.identifier.trim().toLowerCase();
      if (cleanId) {
        seenBatchIds.set(cleanId, (seenBatchIds.get(cleanId) || 0) + 1);
      }
    });

    return rows.map((r) => {
      const cleanName = r.name.trim();
      const cleanId = r.identifier.trim().toLowerCase();

      let err: string | null = null;

      if (!cleanName && !cleanId) {
        // Blank row is okay, ignored on commit
        err = null;
      } else if (!cleanName) {
        err = "Name missing";
      } else if (!cleanId) {
        err = "ID missing";
      } else if ((seenBatchIds.get(cleanId) || 0) > 1) {
        err = "Duplicate in batch";
      } else if (existingIdentifiers.has(cleanId)) {
        err = "Already exists in database";
      }

      return {
        ...r,
        error: err,
      };
    });
  }, [rows, existingIdentifiers]);

  const validRowCount = validatedRows.filter(
    (r) => r.name.trim() && r.identifier.trim() && !r.error,
  ).length;

  const errorRowCount = validatedRows.filter((r) => r.error).length;

  const updateRow = (index: number, field: keyof BulkEntryRow, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  const addRows = (count = 1) => {
    setRows((prev) => [
      ...prev,
      ...Array.from({ length: count }, () => createEmptyRow()),
    ]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => {
      if (prev.length <= 1) return [createEmptyRow()];
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearAllRows = () => {
    setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
  };

  const clearEmptyRows = () => {
    const nonEmpty = rows.filter((r) => r.name.trim() || r.identifier.trim());
    setRows(nonEmpty.length > 0 ? nonEmpty : [createEmptyRow()]);
  };

  // Parse raw text from Excel/Clipboard into rows
  const handleParsePaste = () => {
    if (!pasteRawText.trim()) return;

    const lines = pasteRawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed: BulkEntryRow[] = [];

    lines.forEach((line) => {
      // Remove quotes if any
      const cleanLine = line.replace(/^["]|["]$/g, "");

      let parts: string[] = [];
      if (pasteDelimiter === "tab" || (pasteDelimiter === "auto" && cleanLine.includes("\t"))) {
        parts = cleanLine.split("\t");
      } else if (pasteDelimiter === "comma" || (pasteDelimiter === "auto" && cleanLine.includes(","))) {
        parts = cleanLine.split(",");
      } else if (cleanLine.includes(" - ")) {
        parts = cleanLine.split(" - ");
      } else {
        parts = cleanLine.split(/\s{2,}/);
      }

      if (parts.length >= 2) {
        const name = parts[0]?.trim().replace(/^['"]|['"]$/g, "") || "";
        const id = parts[1]?.trim().replace(/^['"]|['"]$/g, "").toUpperCase() || "";
        const extra = parts[2]?.trim().replace(/^['"]|['"]$/g, "") || "";
        if (name || id) {
          parsed.push({
            id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name,
            identifier: id,
            extra,
            error: null,
          });
        }
      } else if (parts.length === 1 && parts[0]?.trim()) {
        parsed.push({
          id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: parts[0].trim(),
          identifier: "",
          extra: "",
          error: null,
        });
      }
    });

    if (parsed.length > 0) {
      // Replace empty rows or append
      const nonEmptyCurrent = rows.filter((r) => r.name.trim() || r.identifier.trim());
      setRows([...nonEmptyCurrent, ...parsed]);
      setShowQuickPaste(false);
      setPasteRawText("");
      setToastMessage(`Pasted and parsed ${parsed.length} rows from clipboard`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleCommit = () => {
    const validRowsToCommit = validatedRows
      .filter((r) => r.name.trim() && r.identifier.trim() && !r.error)
      .map((r) => ({
        name: r.name.trim(),
        identifier: r.identifier.trim(),
        extra: r.extra?.trim(),
      }));

    if (validRowsToCommit.length === 0) return;

    onCommit(validRowsToCommit);
    // Reset to fresh rows
    clearAllRows();
  };

  const handleNativePasteOnCell = (
    e: React.ClipboardEvent<HTMLInputElement>,
    rowIndex: number,
  ) => {
    const clipboardData = e.clipboardData.getData("text");
    if (clipboardData.includes("\n") || clipboardData.includes("\t")) {
      e.preventDefault();
      setPasteRawText(clipboardData);
      setShowQuickPaste(true);
    }
  };

  return (
    <div className="space-y-2.5 text-[11px]">
      {/* Toast alert */}
      {toastMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[10.5px] text-emerald-800 flex items-center gap-1.5 animate-in fade-in duration-150">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Spreadsheet Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2 text-[10.5px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            size="sm"
            onClick={() => addRows(1)}
            className="h-6 px-2 text-[10px] bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium gap-1 shadow-2xs"
          >
            <Plus className="h-2.5 w-2.5" />
            <span>+ 1 Row</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => addRows(5)}
            className="h-6 px-2 text-[10px] bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium gap-1 shadow-2xs"
          >
            <Plus className="h-2.5 w-2.5" />
            <span>+ 5 Rows</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowQuickPaste(true)}
            className="h-6 px-2 text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-semibold gap-1"
          >
            <ClipboardPaste className="h-2.5 w-2.5 text-emerald-600" />
            <span>Paste from Excel / Sheets</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearEmptyRows}
            className="h-6 px-2 text-[10px] text-slate-500 hover:text-slate-800"
          >
            Trim Empty
          </Button>
        </div>

        {/* Counter Stats & Commit Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-slate-500">
              Valid: <strong className="text-emerald-700 font-mono">{validRowCount}</strong>
            </span>
            {errorRowCount > 0 && (
              <span className="text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded font-semibold text-[9.5px]">
                {errorRowCount} Issues
              </span>
            )}
          </div>

          <Button
            type="button"
            size="sm"
            disabled={validRowCount === 0 || isSaving}
            onClick={handleCommit}
            className="h-6 px-3 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 shadow-xs disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3" />
            <span>{isSaving ? "Saving..." : `Add ${validRowCount} ${entityName}s`}</span>
          </Button>
        </div>
      </div>

      {/* Spreadsheet Data Entry Grid */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200 bg-slate-100/90 backdrop-blur-xs text-[9.5px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-1.5 px-2.5 w-8 text-center">#</th>
                <th className="py-1.5 px-3 min-w-[200px]">
                  {entityName} Full Name <span className="text-red-500">*</span>
                </th>
                <th className="py-1.5 px-3 min-w-[180px]">
                  {identifierLabel} <span className="text-red-500">*</span>
                </th>
                {extraLabel && (
                  <th className="py-1.5 px-3 min-w-[140px]">{extraLabel}</th>
                )}
                <th className="py-1.5 px-2.5 w-24">Status</th>
                <th className="py-1.5 px-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {validatedRows.map((row, idx) => {
                const hasError = !!row.error;
                const isValid = row.name.trim() && row.identifier.trim() && !hasError;

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      hasError
                        ? "bg-red-50/40"
                        : isValid
                          ? "bg-emerald-50/20"
                          : "hover:bg-slate-50/60"
                    }`}
                  >
                    <td className="py-1 px-2 text-center text-[10px] font-mono text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(idx, "name", e.target.value)}
                        onPaste={(e) => handleNativePasteOnCell(e, idx)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && idx === rows.length - 1) {
                            addRows(1);
                          }
                        }}
                        placeholder="e.g. Dr. Jane Wambui"
                        className="h-6 w-full rounded border border-slate-200 bg-white px-2 text-[10.5px] text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400"
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="text"
                        value={row.identifier}
                        onChange={(e) => updateRow(idx, "identifier", e.target.value.toUpperCase())}
                        onPaste={(e) => handleNativePasteOnCell(e, idx)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && idx === rows.length - 1) {
                            addRows(1);
                          }
                        }}
                        placeholder={identifierPlaceholder}
                        className="h-6 w-full rounded border border-slate-200 bg-white px-2 text-[10.5px] font-mono text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400"
                      />
                    </td>
                    {extraLabel && (
                      <td className="py-1 px-2">
                        <input
                          type="text"
                          value={row.extra || ""}
                          onChange={(e) => updateRow(idx, "extra", e.target.value)}
                          placeholder="Optional notes"
                          className="h-6 w-full rounded border border-slate-200 bg-white px-2 text-[10.5px] text-slate-700 placeholder-slate-400 outline-none focus:border-emerald-500"
                        />
                      </td>
                    )}
                    <td className="py-1 px-2">
                      {hasError ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-100/70 px-1.5 py-0.2 rounded border border-red-200">
                          <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{row.error}</span>
                        </span>
                      ) : isValid ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded border border-emerald-200">
                          <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                          <span>Ready</span>
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-mono">
                          Empty
                        </span>
                      )}
                    </td>
                    <td className="py-1 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                        title="Remove Row"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quick Help Footer */}
        <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-1.5 flex items-center justify-between text-[9.5px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>Tip: Press <kbd className="rounded bg-white px-1 py-0.2 font-mono border border-slate-200">Enter</kbd> on the last row to create a new row</span>
            <span>·</span>
            <span>Direct paste from Excel cells is supported</span>
          </div>
          <button
            type="button"
            onClick={clearAllRows}
            className="text-red-600 hover:text-red-800 font-medium"
          >
            Reset Grid
          </button>
        </div>
      </div>

      {/* Quick Paste Modal / Dialog */}
      {showQuickPaste && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 text-slate-100 p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/20 text-emerald-400">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Paste from Excel, Google Sheets, or CSV
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Copy columns from your spreadsheet and paste them directly below
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickPaste(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <label className="text-slate-300 font-medium">
                  Expected format: <code className="text-emerald-400 font-mono">Full Name [Tab or Comma] {identifierLabel}</code>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Delimiter:</span>
                  <select
                    value={pasteDelimiter}
                    onChange={(e) => setPasteDelimiter(e.target.value as any)}
                    className="h-5 rounded bg-slate-800 border border-slate-700 text-[9.5px] text-slate-200 px-1"
                  >
                    <option value="auto">Auto Detect</option>
                    <option value="tab">Tab (Excel/Sheets)</option>
                    <option value="comma">Comma (CSV)</option>
                  </select>
                </div>
              </div>

              <textarea
                value={pasteRawText}
                onChange={(e) => setPasteRawText(e.target.value)}
                placeholder={`Jane Wambui\tLEC-104\nChris Otieno\tLEC-105\nMary Njeri\tLEC-106`}
                rows={7}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-[10.5px] font-mono text-emerald-300 placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowQuickPaste(false)}
                className="h-7 text-[10.5px] border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!pasteRawText.trim()}
                onClick={handleParsePaste}
                className="h-7 text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Parse & Populate Grid</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

