"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleWorkspaceShell } from "@/components/workspace/RoleWorkspaceShell";
import {
  enrollStudentUnits,
  getStudentUnitCatalog,
  type StudentUnitCatalog,
  type TeachingUnit,
} from "@/lib/online-attendance";

type Year = StudentUnitCatalog["years"][number];
type Semester = Year["semester"][number];

export default function StudentUnitsPage() {
  const [catalog, setCatalog] = useState<StudentUnitCatalog | null>(null);
  const [yearNumber, setYearNumber] = useState<number | null>(null);
  const [semesterNumber, setSemesterNumber] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getStudentUnitCatalog()
      .then((result) => {
        setCatalog(result);
        const firstYear = result.years[0];
        const firstSemester = firstYear?.semester[0];
        setYearNumber(firstYear?.yearNumber ?? null);
        setSemesterNumber(firstSemester?.semesterNumber ?? null);
      })
      .catch((error: unknown) =>
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load your course units",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const year = catalog?.years.find((item) => item.yearNumber === yearNumber);
  const semester = year?.semester.find(
    (item) => item.semesterNumber === semesterNumber,
  );
  const visibleUnits = useMemo(
    () =>
      (semester?.units ?? []).filter((unit) =>
        `${unit.code} ${unit.name}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ),
    [semester, search],
  );
  const enrolled = new Set(catalog?.enrolledUnitIds ?? []);
  const toggleUnit = (unit: TeachingUnit) => {
    if (enrolled.has(unit.id)) return;
    setSelected((current) =>
      current.includes(unit.id)
        ? current.filter((id) => id !== unit.id)
        : [...current, unit.id],
    );
  };
  const changeYear = (value: number) => {
    setYearNumber(value);
    const nextSemester = catalog?.years.find(
      (item) => item.yearNumber === value,
    )?.semester[0];
    setSemesterNumber(nextSemester?.semesterNumber ?? null);
    setSelected([]);
    setSearch("");
  };
  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const result = await enrollStudentUnits(selected);
      setCatalog((current) =>
        current
          ? {
              ...current,
              enrolledUnitIds: [
                ...new Set([
                  ...current.enrolledUnitIds,
                  ...result.enrolledUnitIds,
                ]),
              ],
            }
          : current,
      );
      setSelected([]);
      setMessage("Units enrolled successfully.");
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : "Unable to enroll in units",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleWorkspaceShell
      role="student"
      eyebrow="Academic profile"
      title="My Units"
    >
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Course enrollment
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  My Units
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Choose units from {catalog?.course || "your course"} to make
                  them available for attendance.
                </p>
              </div>
              <BookOpen className="h-6 w-6 text-emerald-600" />
            </div>
            {loading ? (
              <p className="mt-8 text-sm text-slate-500">
                Loading your course structure...
              </p>
            ) : message && !catalog ? (
              <p className="mt-8 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                {message}
              </p>
            ) : !catalog || catalog.years.length === 0 ? (
              <p className="mt-8 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                No academic units are available for your course yet.
              </p>
            ) : (
              <>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Year
                    <select
                      value={yearNumber ?? ""}
                      onChange={(event) =>
                        changeYear(Number(event.target.value))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select year</option>
                      {catalog.years.map((item) => (
                        <option key={item.yearNumber} value={item.yearNumber}>
                          Year {item.yearNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Semester
                    <select
                      value={semesterNumber ?? ""}
                      onChange={(event) => {
                        setSemesterNumber(Number(event.target.value));
                        setSelected([]);
                        setSearch("");
                      }}
                      disabled={!year}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select semester</option>
                      {year?.semester.map((item) => (
                        <option
                          key={item.semesterNumber}
                          value={item.semesterNumber}
                        >
                          {item.name || `Semester ${item.semesterNumber}`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {semester && (
                  <>
                    <div className="relative mt-6">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by unit name or code"
                        className="pl-9"
                      />
                    </div>
                    <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
                      <span>
                        {semester.name || `Semester ${semester.semesterNumber}`}
                      </span>
                      <span>{enrolled.size} enrolled</span>
                    </div>
                    {visibleUnits.length === 0 ? (
                      <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                        No units match your search.
                      </p>
                    ) : (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {visibleUnits.map((unit) => {
                          const isEnrolled = enrolled.has(unit.id);
                          const isSelected = selected.includes(unit.id);
                          return (
                            <button
                              key={unit.id}
                              type="button"
                              disabled={isEnrolled}
                              onClick={() => toggleUnit(unit)}
                              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${isEnrolled ? "cursor-not-allowed border-emerald-200 bg-emerald-50/60" : isSelected ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"}`}
                            >
                              <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${isEnrolled || isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-transparent"}`}
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
                                <span className="mt-2 block text-xs font-medium text-emerald-700">
                                  {isEnrolled ? "Enrolled" : "Available"}
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
                        disabled={saving || selected.length === 0}
                        className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <Check className="h-4 w-4" />
                        {saving
                          ? "Enrolling..."
                          : `Enroll selected${selected.length ? ` (${selected.length})` : ""}`}
                      </Button>
                      {message && (
                        <p className="text-sm text-slate-600">{message}</p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </RoleWorkspaceShell>
  );
}
