"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Check, Save, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RoleWorkspaceShell } from "@/components/workspace/RoleWorkspaceShell";
import {
  getLecturerUnitCatalog,
  saveLecturerUnits,
  type TeachingUnit,
} from "@/lib/online-attendance";

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
      setMessage("Teaching units saved.");
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
      eyebrow="Account setup"
      title="My Units"
    >
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/lecturer/attendance/online"
            className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to attendance
          </Link>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                  Teaching profile
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-950">
                  Choose your teaching units
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Select the units you teach. They will appear on the attendance
                  page when you create a session.
                </p>
              </div>
              <BookOpen className="h-6 w-6 text-sky-600" />
            </div>
            {!loading && units.length > 0 && (
              <div className="relative mt-6">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by unit name or code"
                  className="pl-9"
                />
              </div>
            )}
            {loading ? (
              <p className="mt-8 text-sm text-slate-500">
                Loading available units...
              </p>
            ) : units.length === 0 ? (
              <p className="mt-8 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                No academic units are available for your institution yet.
              </p>
            ) : filteredUnits.length === 0 ? (
              <p className="mt-8 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                No units match your search.
              </p>
            ) : (
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {filteredUnits.map((unit) => {
                  const active = selected.includes(unit.id);
                  return (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => toggleUnit(unit.id)}
                      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${active ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${active ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 text-transparent"}`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span>
                        <span className="block font-semibold text-slate-950">
                          {unit.code}
                        </span>
                        <span className="mt-1 block text-sm text-slate-600">
                          {unit.name}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center">
              <Button
                onClick={save}
                disabled={loading || saving || units.length === 0}
                className="gap-2 bg-sky-600 text-white hover:bg-sky-700"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save teaching units"}
              </Button>
              {message && <p className="text-sm text-slate-600">{message}</p>}
            </div>
          </div>
        </div>
      </main>
    </RoleWorkspaceShell>
  );
}
