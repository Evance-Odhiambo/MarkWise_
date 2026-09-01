"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Check, CheckCircle2, Radio, Save, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleWorkspaceShell } from "@/components/layout/role-workspace-shell";
import {
  getLecturerUnitCatalog,
  saveLecturerUnits,
  type TeachingUnit,
} from "@/lib/attendance/online-attendance";

export default function LecturerUnitsPage() {
  const [units, setUnits] = useState<TeachingUnit[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getLecturerUnitCatalog()
      .then((result) => {
        setUnits(result.units);
        setSelected(result.selectedUnitIds);
      })
      .catch((error: unknown) =>
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load unit catalog",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const toggleUnit = (unitId: string) =>
    setSelected((current) =>
      current.includes(unitId)
        ? current.filter((id) => id !== unitId)
        : [...current, unitId],
    );

  const selectAll = () => {
    setSelected(filteredUnits.map((u) => u.id));
  };

  const deselectAll = () => {
    setSelected([]);
  };

  const filteredUnits = units.filter((unit) =>
    `${unit.code} ${unit.name}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      await saveLecturerUnits(selected);
      setMessage("Teaching units saved successfully.");
      setTimeout(() => setMessage(""), 3500);
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save teaching units",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleWorkspaceShell
      role="lecturer"
      eyebrow="Lecturer Setup"
      title="Teaching Units Assignment"
      actions={
        <Button
          size="sm"
          onClick={save}
          disabled={loading || saving || units.length === 0}
          className="h-7 px-3 text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs"
        >
          <Save className="h-3 w-3" />
          <span>{saving ? "Saving..." : "Save Assigned Units"}</span>
        </Button>
      }
    >
      <main className="p-3 sm:p-4 space-y-3 max-w-[1400px] mx-auto text-[11px]">
        {/* Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <Link
              href="/lecturer/dashboard"
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Dashboard</span>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-slate-900 text-xs">
              Curriculum Unit Catalog
            </span>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[9.5px]">
              {selected.length} Selected
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="h-6 px-2 text-[10px] text-slate-600"
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={deselectAll}
              className="h-6 px-2 text-[10px] text-slate-600"
            >
              Clear
            </Button>
          </div>
        </div>

        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[10.5px] text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search academic units by code or title (e.g. CS-301, Data Structures)..."
            className="h-8 pl-8 text-[11px] bg-white border-slate-200 shadow-2xs focus-visible:border-emerald-500 focus-visible:ring-emerald-500"
          />
        </div>

        {/* Unit Selection Grid */}
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-[11px]">
            Loading teaching catalog...
          </div>
        ) : units.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
            No academic units available for your institution yet. Please contact your institution admin.
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
            No units match your search query &quot;{search}&quot;.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUnits.map((unit) => {
              const active = selected.includes(unit.id);

              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => toggleUnit(unit.id)}
                  className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition shadow-2xs ${
                    active
                      ? "border-emerald-500/80 bg-emerald-50/70"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                      active
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-300 bg-white text-transparent"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11px] text-slate-900 font-mono">
                        {unit.code}
                      </span>
                      {unit.bleId && (
                        <span className="text-[8.5px] font-mono text-slate-400 bg-slate-100 px-1 rounded">
                          HEX: {unit.bleId}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-600 leading-snug line-clamp-2">
                      {unit.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </RoleWorkspaceShell>
  );
}
