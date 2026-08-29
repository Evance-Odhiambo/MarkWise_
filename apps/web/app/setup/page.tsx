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
import { AdminWorkspaceShell } from "@/components/admin/AdminWorkspaceShell";

export default function SetupPage() {
  const [method, setMethod] = useState<ImportMethod>("manual");
  const [data, setData] = useState<AcademicCourse[]>([]);
  const [institutionId, setInstitutionId] = useState<string>("");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [institutionError, setInstitutionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const authHeaders = (): Record<string, string> => {
    const storedUser = localStorage.getItem("user");
    let token: string | undefined;
    try {
      token = storedUser
        ? (JSON.parse(storedUser) as { token?: string }).token
        : undefined;
    } catch {
      token = undefined;
    }
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const totalUnits = data.reduce(
    (sum, course) =>
      sum +
      (course.years || []).reduce(
        (courseSum, year) =>
          courseSum +
          (year.semesters || []).reduce(
            (semesterSum, semester) =>
              semesterSum + (semester.units || []).length,
            0,
          ),
        0,
      ),
    0,
  );

  useEffect(() => {
    const fetchInstitutions = async () => {
      setInstitutionError(null);
      try {
        const endpoints = [
          "/api/v1/institutions",
          "/api/v1/institutions/institutions",
        ];
        let lastStatus = 0;

        for (const endpoint of endpoints) {
          const response = await fetch(endpoint, { headers: authHeaders() });
          lastStatus = response.status;
          if (!response.ok) continue;

          const result = await response.json();
          setInstitutions(
            Array.isArray(result.institutions) ? result.institutions : [],
          );
          return;
        }

        throw new Error(`Institution service returned HTTP ${lastStatus}`);
      } catch (err) {
        console.error("Failed to fetch institutions:", err);
        setInstitutionError(
          "Unable to load registered institutions. Check that the backend is running and try again.",
        );
      } finally {
        setLoadingInstitutions(false);
      }
    };

    const fetchCourses = async () => {
      if (!institutionId) return;
      try {
        const response = await fetch(
          `/api/v1/institutions/${encodeURIComponent(institutionId)}/setup`,
          { headers: authHeaders() },
        );
        if (response.ok) {
          const result = await response.json();
          setData(result.courses || []);
        } else {
          setSaveMessage("Unable to load the institution's academic setup.");
        }
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      }
    };

    const storedInstitution = localStorage.getItem("institutionId");
    if (storedInstitution) {
      setInstitutionId(storedInstitution);
    }

    if (institutions.length === 0) fetchInstitutions();
    fetchCourses();
  }, [institutionId]);

  useEffect(() => {
    if (institutionId) {
      localStorage.setItem("institutionId", institutionId);
    }
  }, [institutionId]);

  const handleDataChange = async (updatedData: AcademicCourse[]) => {
    setData(updatedData);
    setSaveMessage(null);
  };

  const saveSetup = async () => {
    if (!institutionId) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const response = await fetch(
        `/api/v1/institutions/${encodeURIComponent(institutionId)}/setup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ courses: data }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || "Unable to save academic setup");
      setSaveMessage("Academic setup saved successfully.");
    } catch (error) {
      setSaveMessage(
        error instanceof Error
          ? error.message
          : "Unable to save academic setup",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectedInstitution = institutions.find(
    (inst) => inst.id === institutionId,
  );

  return (
    <AdminWorkspaceShell eyebrow="Setup operations" title="Academics">
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.13),transparent_35%),linear-gradient(to_bottom,#f8fafc,#eef4ff)] py-10 text-slate-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge
                variant="secondary"
                className="mb-3 rounded-full border border-blue-200 bg-blue-50 text-blue-700"
              >
                Academic configuration
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Academic Data Setup
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Configure your institution’s academic structure with a faster,
                cleaner data-entry flow for courses, years, semesters, and
                units.
              </p>
            </div>

            {institutionId && (
              <div className="flex flex-wrap gap-3">
                <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Courses
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {data.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Units
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {totalUnits}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Card className="border-slate-200 bg-white/80 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)] backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg text-slate-900">
                    Institution
                  </CardTitle>
                </div>
                {selectedInstitution && (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700"
                  >
                    {selectedInstitution.name}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingInstitutions ? (
                <p className="text-sm text-slate-500">
                  Loading institutions...
                </p>
              ) : institutions.length === 0 ? (
                <div className="space-y-2 text-sm">
                  <p
                    className={
                      institutionError ? "text-red-600" : "text-amber-700"
                    }
                  >
                    {institutionError ??
                      "No institutions found. Please approve an onboarding request first."}
                  </p>
                  {institutionError && (
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      Try again
                    </button>
                  )}
                </div>
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
                <p className="text-base text-slate-500">
                  Select an institution to unlock the academic setup workflow.
                </p>
              </CardContent>
            </Card>
          )}

          {institutionId && (
            <div className="mt-6 space-y-6">
              <AcademicMethodSelector method={method} onChange={setMethod} />

              <Card className="border-slate-200 bg-white/85 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
                <CardContent className="p-5 sm:p-6">
                  {method === "api" && (
                    <ApiImportForm onDataImported={handleDataChange} />
                  )}
                  {method === "csv" && (
                    <CsvImportForm onDataImported={handleDataChange} />
                  )}
                  {method === "manual" && (
                    <ManualEntryForm
                      data={data}
                      onDataChange={handleDataChange}
                    />
                  )}
                  <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p
                      className={`text-sm ${saveMessage?.includes("successfully") ? "text-emerald-600" : "text-slate-500"}`}
                    >
                      {saveMessage ??
                        "Changes are kept in this form until you save them."}
                    </p>
                    <button
                      type="button"
                      onClick={saveSetup}
                      disabled={isSaving}
                      className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? "Saving..." : "Save academic setup"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </AdminWorkspaceShell>
  );
}
