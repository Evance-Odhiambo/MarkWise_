"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Check, CheckCircle2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleWorkspaceShell } from "@/components/layout/role-workspace-shell";
import {
  enrollStudentUnits,
  getStudentUnitCatalog,
  type StudentUnitCatalog,
  type TeachingUnit,
} from "@/lib/attendance/online-attendance";

export default function StudentUnitsPage() {
  const [catalog, setCatalog] = useState<StudentUnitCatalog | null>(null);
  const [yearNumber, setYearNumber] = useState<number | null>(null);
  const [semesterNumber, setSemesterNumber] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [studentProfile, setStudentProfile] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "null");
      if (user?.token && user.role === "student") {
        setStudentProfile(user);
        fetch("/api/v1/students/me", { headers: { Authorization: `Bearer ${user.token}` } })
          .then((res) => res.ok ? res.json() : null)
          .then((data) => {
            if (data) setStudentProfile((prev) => ({ ...prev, ...data }));
          })
          .catch(() => {});
      }
    } catch {}

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
      setTimeout(() => setMessage(""), 3500);
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
      eyebrow="Curriculum Registration"
      title="My Academic Units"
      name={studentProfile?.name}
      email={studentProfile?.email}
      actions={
        <Button
          size="sm"
          onClick={save}
          disabled={saving || selected.length === 0}
          className="h-7 px-3 text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs"
        >
          <Check className="h-3 w-3" />
          <span>
            {saving
              ? "Enrolling..."
              : `Enroll Selected (${selected.length})`}
          </span>
        </Button>
      }
    >
      <main className="p-3 sm:p-4 space-y-3 max-w-[1400px] mx-auto text-[11px]">
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <Link
              href="/student/dashboard"
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Overview</span>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-slate-900 text-xs">
              {catalog?.course || "Degree Curriculum"}
            </span>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[9.5px]">
              {enrolled.size} Units Enrolled
            </Badge>
          </div>

          {/* Year & Semester Switcher Dropdowns */}
          {catalog && catalog.years.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500 font-medium">Year:</span>
                <select
                  value={yearNumber ?? ""}
                  onChange={(e) => changeYear(Number(e.target.value))}
                  className="h-6 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[10.5px] font-medium text-slate-800 outline-none"
                >
                  {catalog.years.map((y) => (
                    <option key={y.yearNumber} value={y.yearNumber}>
                      Year {y.yearNumber}
                    </option>
                  ))}
                </select>
              </div>

              {year && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500 font-medium">Semester:</span>
                  <select
                    value={semesterNumber ?? ""}
                    onChange={(e) => {
                      setSemesterNumber(Number(e.target.value));
                      setSelected([]);
                      setSearch("");
                    }}
                    className="h-6 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[10.5px] font-medium text-slate-800 outline-none"
                  >
                    {year.semester.map((s) => (
                      <option key={s.semesterNumber} value={s.semesterNumber}>
                        {s.name || `Semester ${s.semesterNumber}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[10.5px] text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search academic units by code or title (e.g. CS-301, Operating Systems)..."
            className="h-8 pl-8 text-[11px] bg-white border-slate-200 shadow-2xs"
          />
        </div>

        {/* Unit Selection Grid */}
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-[11px]">
            Loading course curriculum...
          </div>
        ) : !catalog || catalog.years.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
            No academic units are configured for your course program yet.
          </div>
        ) : visibleUnits.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
            No units match &quot;{search}&quot; in this semester.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visibleUnits.map((unit) => {
              const isEnrolled = enrolled.has(unit.id);
              const isSelected = selected.includes(unit.id);

              return (
                <button
                  key={unit.id}
                  type="button"
                  disabled={isEnrolled}
                  onClick={() => toggleUnit(unit)}
                  className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition shadow-2xs ${
                    isEnrolled
                      ? "border-emerald-200 bg-emerald-50/40 opacity-90 cursor-default"
                      : isSelected
                        ? "border-emerald-500 bg-emerald-50/80"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                      isEnrolled || isSelected
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-300 bg-white text-transparent"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-[11px] text-slate-900 font-mono">
                        {unit.code}
                      </span>
                      <span
                        className={`text-[8.5px] font-bold uppercase font-mono px-1 rounded ${
                          isEnrolled
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isEnrolled ? "Enrolled" : "Available"}
                      </span>
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
