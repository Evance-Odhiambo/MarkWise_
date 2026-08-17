"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AcademicCourse, ImportMethod } from "./types/academic";
import type { Institution } from "@/app/types/auth";
import { AcademicMethodSelector } from "./_components/MethodSelector";
import { ApiImportForm } from "./_components/ApiImportForm";
import { CsvImportForm } from "./_components/CsvImportForm";
import { ManualEntryForm } from "./_components/ManualEntryForm";

export default function SetupPage() {
  const [method, setMethod] = useState<ImportMethod>("manual");
  const [data, setData] = useState<AcademicCourse[]>([]);
  const [institutionId, setInstitutionId] = useState<string>("");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);

  const totalUnits = data.reduce(
    (sum, course) =>
      sum +
      (course.years || []).reduce(
        (courseSum, year) =>
          courseSum +
          (year.semesters || []).reduce(
            (semesterSum, semester) => semesterSum + (semester.units || []).length,
            0
          ),
        0
      ),
    0
  );

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const response = await fetch("/api/institutions");
        if (response.ok) {
          const result = await response.json();
          setInstitutions(result.institutions || []);
        }
      } catch (err) {
        console.error("Failed to fetch institutions:", err);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    const fetchCourses = async () => {
      try {
        const requestUrl = institutionId ? `/api/courses?institutionId=${encodeURIComponent(institutionId)}` : "/api/courses";
        const response = await fetch(requestUrl);
        if (response.ok) {
          const result = await response.json();
          setData(result.courses || []);
        }
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      }
    };

    const storedInstitution = localStorage.getItem("institutionId");
    if (storedInstitution) {
      setInstitutionId(storedInstitution);
    }

    fetchInstitutions();
    fetchCourses();
  }, [institutionId]);

  useEffect(() => {
    if (institutionId) {
      localStorage.setItem("institutionId", institutionId);
    }
  }, [institutionId]);

  const handleDataChange = async (updatedData: AcademicCourse[]) => {
    setData(updatedData);

    if (!institutionId) return;

    try {
      await fetch("/api/courses/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courses: updatedData,
          institutionId,
        }),
      });
    } catch (err) {
      console.error("Failed to save courses:", err);
    }
  };

  const selectedInstitution = institutions.find((inst) => inst.id === institutionId);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.13),transparent_35%),linear-gradient(to_bottom,#f8fafc,#eef4ff)] py-10 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
              Academic configuration
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Academic Data Setup
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Configure your institution’s academic structure with a faster, cleaner data-entry flow for courses, years, semesters, and units.
            </p>
          </div>

          {institutionId && (
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Courses</p>
                <p className="text-lg font-semibold text-slate-900">{data.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Units</p>
                <p className="text-lg font-semibold text-slate-900">{totalUnits}</p>
              </div>
            </div>
          )}
        </div>

        <Card className="border-slate-200 bg-white/80 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)] backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg text-slate-900">Institution</CardTitle>
              </div>
              {selectedInstitution && (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  {selectedInstitution.name}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingInstitutions ? (
              <p className="text-sm text-slate-500">Loading institutions...</p>
            ) : institutions.length === 0 ? (
              <p className="text-sm text-amber-700">
                No institutions found. Please add an institution in the Admin panel first.
              </p>
            ) : (
              <div className="max-w-xl">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Select Institution
                </label>
                <select
                  value={institutionId}
                  onChange={(e) => setInstitutionId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 shadow-inner outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                >
                  <option value="">Choose an institution...</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {!institutionId && (
          <Card className="mt-6 border-dashed border-slate-300 bg-white/60">
            <CardContent className="py-10 text-center">
              <p className="text-base text-slate-500">Select an institution to unlock the academic setup workflow.</p>
            </CardContent>
          </Card>
        )}

        {institutionId && (
          <div className="mt-6 space-y-6">
            <AcademicMethodSelector method={method} onChange={setMethod} />

            <Card className="border-slate-200 bg-white/85 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
              <CardContent className="p-5 sm:p-6">
                {method === "api" && <ApiImportForm onDataImported={handleDataChange} />}
                {method === "csv" && <CsvImportForm onDataImported={handleDataChange} />}
                {method === "manual" && <ManualEntryForm data={data} onDataChange={handleDataChange} />}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
