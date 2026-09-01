"use client";

import React, { useRef, useState } from "react";
import {
  AlertCircle,
  ClipboardPaste,
  FileText,
  Link2,
  ListPlus,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AcademicSemester, AcademicUnit } from "../../../types/setup-academic";

interface InlineSemesterTableProps {
  semester: AcademicSemester;
  courseId: string;
  yearId: string;
  onUnitsChange: (units: AcademicUnit[]) => void;
  onSemesterNameChange?: (newName: string) => void;
  onDeleteSemester?: () => void;
  // Every unit code already in use across the institution (any course, any
  // semester), keyed by normalized code. Used to hint when a code typed here
  // already belongs to an existing unit elsewhere - that's not an error,
  // codes are unique per institution and this links the same unit into a
  // second offering - so it's shown as an informational hint, not a warning.
  institutionUnitsByCode?: Map<string, { id: string; name: string }>;
}

const makeUnitId = (semesterId: string, code: string, index: number) =>
  `unit-${semesterId}-${code.toLowerCase().replace(/\s+/g, "-") || "new"}-${Date.now()}-${index}`;

export function InlineSemesterTable({
  semester,
  courseId: _courseId,
  yearId: _yearId,
  onUnitsChange,
  onSemesterNameChange,
  onDeleteSemester,
  institutionUnitsByCode,
}: InlineSemesterTableProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"text" | "sequence">("text");

  // Bulk Text Entry State
  const [bulkText, setBulkText] = useState("");
  const [bulkApplyMode, setBulkApplyMode] = useState<"append" | "replace">("append");

  // Sequence Generator State
  const [seqPrefix, setSeqPrefix] = useState("CS");
  const [seqStartNumber, setSeqStartNumber] = useState(101);
  const [seqCount, setSeqCount] = useState(6);
  const [seqNameTemplate, setSeqNameTemplate] = useState("");

  const tableRef = useRef<HTMLDivElement>(null);
  const units = semester.units ?? [];

  const handleUnitFieldChange = (
    index: number,
    field: "code" | "name",
    value: string,
  ) => {
    const nextUnits = [...units];
    nextUnits[index] = {
      ...nextUnits[index],
      [field]: field === "code" ? value.toUpperCase() : value,
    };
    onUnitsChange(nextUnits);
  };

  const handleAddUnit = () => {
    const nextUnits = [
      ...units,
      {
        id: makeUnitId(semester.id, "", units.length),
        code: "",
        name: "",
        semesterId: semester.id,
      },
    ];
    onUnitsChange(nextUnits);

    setTimeout(() => {
      const inputs = tableRef.current?.querySelectorAll("input");
      if (inputs && inputs.length >= 2) {
        inputs[inputs.length - 2]?.focus();
      }
    }, 30);
  };

  const handleDeleteUnit = (index: number) => {
    const nextUnits = units.filter((_, i) => i !== index);
    onUnitsChange(nextUnits);
  };

  const handleClearUnits = () => {
    if (
      units.length > 0 &&
      window.confirm("Are you sure you want to remove all units in this semester?")
    ) {
      onUnitsChange([]);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: "code" | "name",
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (field === "code") {
        const inputs = tableRef.current?.querySelectorAll("input");
        const nextInput = inputs?.[index * 2 + 1];
        nextInput?.focus();
      } else {
        if (index === units.length - 1) {
          handleAddUnit();
        } else {
          const inputs = tableRef.current?.querySelectorAll("input");
          const nextInput = inputs?.[(index + 1) * 2];
          nextInput?.focus();
        }
      }
    }
  };

  const parseUnitsFromText = (rawText: string): AcademicUnit[] => {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return [];

    const parsed: AcademicUnit[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let code = "";
      let name = "";

      if (line.includes("\t")) {
        const parts = line.split("\t").map((p) => p.trim());
        code = parts[0];
        name = parts.slice(1).join(" ");
      } else if (line.includes(",")) {
        const parts = line.split(",").map((p) => p.trim());
        code = parts[0];
        name = parts.slice(1).join(", ");
      } else if (line.includes(" - ")) {
        const parts = line.split(" - ").map((p) => p.trim());
        code = parts[0];
        name = parts.slice(1).join(" - ");
      } else if (line.includes(": ")) {
        const parts = line.split(": ").map((p) => p.trim());
        code = parts[0];
        name = parts.slice(1).join(": ");
      } else {
        const match = line.match(/^([A-Za-z0-9_-]+)\s+(.+)$/);
        if (match) {
          code = match[1];
          name = match[2];
        } else {
          code = line;
          name = line;
        }
      }

      code = code.trim().toUpperCase();
      name = name.trim() || code;

      if (code) {
        parsed.push({
          id: makeUnitId(semester.id, code, i),
          code,
          name,
          semesterId: semester.id,
        });
      }
    }

    return parsed;
  };

  const generateSequenceUnits = (): AcademicUnit[] => {
    const count = Math.max(1, Math.min(seqCount, 30));
    const prefix = seqPrefix.trim().toUpperCase();
    const start = isNaN(seqStartNumber) ? 101 : seqStartNumber;
    const generated: AcademicUnit[] = [];

    for (let i = 0; i < count; i++) {
      const unitCode = `${prefix}${start + i}`;
      const unitName = seqNameTemplate.trim()
        ? `${seqNameTemplate.trim()} ${i + 1}`
        : `Unit ${unitCode}`;

      generated.push({
        id: makeUnitId(semester.id, unitCode, i),
        code: unitCode,
        name: unitName,
        semesterId: semester.id,
      });
    }

    return generated;
  };

  const handleApplyBulk = () => {
    let newUnits: AcademicUnit[] = [];

    if (bulkMode === "text") {
      newUnits = parseUnitsFromText(bulkText);
    } else {
      newUnits = generateSequenceUnits();
    }

    if (newUnits.length === 0) return;

    if (bulkApplyMode === "replace") {
      onUnitsChange(newUnits);
    } else {
      const cleanExisting = units.filter((u) => u.code.trim() || u.name.trim());
      onUnitsChange([...cleanExisting, ...newUnits]);
    }

    setBulkText("");
    setIsBulkModalOpen(false);
    setPasteNotice(`+${newUnits.length} units`);
    setTimeout(() => setPasteNotice(null), 2500);
  };

  const handlePasteEvent = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (text && (text.includes("\n") || text.includes("\t") || text.includes(","))) {
      e.preventDefault();
      const parsed = parseUnitsFromText(text);
      if (parsed.length > 0) {
        const cleanExisting = units.filter((u) => u.code.trim() || u.name.trim());
        onUnitsChange([...cleanExisting, ...parsed]);
        setPasteNotice(`+${parsed.length} pasted`);
        setTimeout(() => setPasteNotice(null), 2500);
      }
    }
  };

  const codeCounts = new Map<string, number>();
  units.forEach((u) => {
    const c = u.code.trim().toUpperCase();
    if (c) codeCounts.set(c, (codeCounts.get(c) || 0) + 1);
  });

  const parsedPreview =
    bulkMode === "text" ? parseUnitsFromText(bulkText) : generateSequenceUnits();

  return (
    <div
      ref={tableRef}
      onPaste={handlePasteEvent}
      className="flex h-full flex-col rounded-lg border border-slate-200 bg-white shadow-2xs transition hover:border-slate-300 text-[11px]"
    >
      {/* Dense Small-Font Header */}
      <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 bg-slate-50/80 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {editingTitle && onSemesterNameChange ? (
            <Input
              value={semester.name}
              onChange={(e) => onSemesterNameChange(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
              autoFocus
              className="h-6 max-w-[140px] text-[11px] font-bold px-1.5"
            />
          ) : (
            <h4
              onClick={() => onSemesterNameChange && setEditingTitle(true)}
              className="cursor-pointer truncate text-[11px] font-bold text-slate-900 hover:text-blue-600"
              title="Click to rename semester"
            >
              {semester.name || `Semester ${semester.semesterNum}`}
            </h4>
          )}
          <span className="rounded-full bg-blue-50 px-1.5 py-0.2 text-[9px] font-bold text-blue-700">
            {units.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {pasteNotice && (
            <span className="text-[10px] font-semibold text-emerald-600">
              {pasteNotice}
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50/70 hover:bg-blue-100"
            title="Bulk paste or generate unit codes"
          >
            <ListPlus className="h-3 w-3" />
            Bulk
          </button>

          <button
            type="button"
            onClick={handleAddUnit}
            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-100"
            title="Add row"
          >
            <Plus className="h-3 w-3" />
            Row
          </button>

          {units.length > 0 && (
            <button
              type="button"
              onClick={handleClearUnits}
              className="rounded px-1 py-0.5 text-[10px] text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title="Clear all"
            >
              Clear
            </button>
          )}

          {onDeleteSemester && (
            <button
              type="button"
              onClick={onDeleteSemester}
              className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              title="Delete semester"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Dense Small-Font Table Body */}
      <div className="flex flex-1 flex-col p-2 space-y-1">
        {units.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/30 py-5 text-center">
            <p className="text-[10px] font-medium text-slate-500">
              No units in this semester
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-blue-700"
              >
                + Bulk Add
              </button>
              <button
                type="button"
                onClick={handleAddUnit}
                className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
              >
                + Add Row
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-1">
            {/* Headers */}
            <div className="grid grid-cols-12 gap-1.5 px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-4">Unit Code</div>
              <div className="col-span-7">Unit Name</div>
              <div className="col-span-1 text-right">✕</div>
            </div>

            {/* Rows */}
            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-0.5">
              {units.map((unit, index) => {
                const code = unit.code.trim().toUpperCase();
                const isDuplicate = code && (codeCounts.get(code) || 0) > 1;
                const existingElsewhere =
                  code && !isDuplicate
                    ? institutionUnitsByCode?.get(code)
                    : undefined;
                const linksExistingUnit =
                  existingElsewhere && existingElsewhere.id !== unit.id;

                return (
                  <div
                    key={unit.id || index}
                    className="grid grid-cols-12 items-center gap-1.5 rounded bg-slate-50/70 p-0.5 transition hover:bg-slate-100"
                  >
                    <div className="relative col-span-4">
                      <Input
                        value={unit.code}
                        onChange={(e) =>
                          handleUnitFieldChange(index, "code", e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(e, index, "code")}
                        placeholder="CS101"
                        className={`h-6 rounded px-1.5 font-mono text-[10px] md:text-[10px] uppercase font-bold tracking-tight ${
                          isDuplicate
                            ? "border-amber-400 bg-amber-50 text-amber-900 focus-visible:ring-amber-200"
                            : linksExistingUnit
                              ? "border-blue-300 bg-blue-50 text-blue-900 focus-visible:ring-blue-200"
                              : "border-slate-200 bg-white"
                        }`}
                      />
                      {isDuplicate && (
                        <span
                          className="absolute top-1 right-1 text-amber-500"
                          title="Duplicate code"
                        >
                          <AlertCircle className="h-3 w-3" />
                        </span>
                      )}
                      {linksExistingUnit && (
                        <span
                          className="absolute top-1 right-1 text-blue-500"
                          title={`Links to existing unit: ${existingElsewhere!.name}`}
                        >
                          <Link2 className="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    <div className="col-span-7">
                      <Input
                        value={unit.name}
                        onChange={(e) =>
                          handleUnitFieldChange(index, "name", e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(e, index, "name")}
                        placeholder="Unit Name"
                        className="h-6 rounded px-1.5 text-[10px] md:text-[10px] border-slate-200 bg-white placeholder:text-[9.5px]"
                      />
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteUnit(index)}
                        className="rounded p-0.5 text-slate-300 hover:text-red-600 transition"
                        title="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={handleAddUnit}
                className="flex items-center gap-1 rounded border border-dashed border-slate-300 px-2 py-0.5 text-[10px] text-slate-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/50"
              >
                <Plus className="h-2.5 w-2.5" />
                Add Row (Enter)
              </button>

              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="text-[10px] font-semibold text-blue-600 hover:underline"
              >
                + Bulk add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Add Modal */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="max-w-sm p-3.5">
          <DialogHeader>
            <DialogTitle className="text-xs font-bold flex items-center gap-1.5">
              <ListPlus className="h-3.5 w-3.5 text-blue-600" />
              Bulk Add Units to {semester.name}
            </DialogTitle>
            <DialogDescription className="text-[10.5px]">
              Paste list or auto-generate code sequence.
            </DialogDescription>
          </DialogHeader>

          <div className="flex rounded-md bg-slate-100 p-0.5 my-1 text-[10px]">
            <button
              type="button"
              onClick={() => setBulkMode("text")}
              className={`flex-1 rounded py-1 font-semibold transition ${
                bulkMode === "text"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Paste Text / List
            </button>
            <button
              type="button"
              onClick={() => setBulkMode("sequence")}
              className={`flex-1 rounded py-1 font-semibold transition ${
                bulkMode === "sequence"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Auto Sequence
            </button>
          </div>

          {bulkMode === "text" ? (
            <div>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`CS101, Intro to Programming\nCS102, Data Structures\nCS103, Discrete Math`}
                rows={5}
                className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-[10.5px] text-slate-800 outline-none focus:border-blue-500"
              />
              <p className="text-[9.5px] text-slate-500 mt-0.5">
                Format: <code>CODE, NAME</code> or <code>CODE - NAME</code>
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 py-0.5">
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-[9.5px] font-medium text-slate-600">
                    Prefix
                  </label>
                  <Input
                    value={seqPrefix}
                    onChange={(e) => setSeqPrefix(e.target.value.toUpperCase())}
                    className="h-6.5 text-[10.5px] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-medium text-slate-600">
                    Start #
                  </label>
                  <Input
                    type="number"
                    value={seqStartNumber}
                    onChange={(e) =>
                      setSeqStartNumber(parseInt(e.target.value, 10) || 100)
                    }
                    className="h-6.5 text-[10.5px]"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-medium text-slate-600">
                    Count
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={seqCount}
                    onChange={(e) =>
                      setSeqCount(parseInt(e.target.value, 10) || 1)
                    }
                    className="h-6.5 text-[10.5px]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9.5px] font-medium text-slate-600">
                  Optional Title Prefix
                </label>
                <Input
                  value={seqNameTemplate}
                  onChange={(e) => setSeqNameTemplate(e.target.value)}
                  placeholder="e.g. Core Unit"
                  className="h-6.5 text-[10.5px]"
                />
              </div>
            </div>
          )}

          {parsedPreview.length > 0 && (
            <div className="rounded border border-blue-100 bg-blue-50/50 p-1.5 text-[10px]">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-blue-900">
                  {parsedPreview.length} units ready
                </span>
                <select
                  value={bulkApplyMode}
                  onChange={(e) =>
                    setBulkApplyMode(e.target.value as "append" | "replace")
                  }
                  className="rounded border border-blue-200 bg-white px-1 py-0.2 text-[9.5px]"
                >
                  <option value="append">Append</option>
                  <option value="replace">Replace</option>
                </select>
              </div>
              <div className="max-h-20 overflow-y-auto space-y-0.5">
                {parsedPreview.map((u, i) => (
                  <div
                    key={i}
                    className="flex justify-between bg-white px-1.5 py-0.5 rounded border border-blue-100/70"
                  >
                    <span className="font-mono font-semibold text-blue-700">
                      {u.code}
                    </span>
                    <span className="truncate max-w-[170px] text-slate-600">
                      {u.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-1 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6.5 text-[10px]"
              onClick={() => setIsBulkModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-6.5 text-[10px] bg-blue-600 text-white hover:bg-blue-700"
              disabled={parsedPreview.length === 0}
              onClick={handleApplyBulk}
            >
              Add {parsedPreview.length} Units
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
