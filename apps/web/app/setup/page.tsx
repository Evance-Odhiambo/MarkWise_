"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, School } from "lucide-react";
import type { AcademicCourse } from "../../types/setup-academic";
import type { Institution } from "@/types/auth";
import { AcademicWorkspace } from "@/components/features/setup/academic-workspace";
import { AdminWorkspaceShell } from "@/components/features/admin/admin-workspace-shell";

export default function SetupPage() {
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

    // Seed institutionId from the logged-in user's token first, then fall
    // back to the previously-selected value stored under its own key.
    const storedUser = localStorage.getItem("user");
    let seedId = localStorage.getItem("institutionId") ?? "";
    try {
      const parsed = storedUser
        ? (JSON.parse(storedUser) as { institutionId?: string })
        : null;
      if (parsed?.institutionId) seedId = parsed.institutionId;
    } catch { /* ignore */ }
    if (seedId) setInstitutionId(seedId);

    if (institutions.length === 0) fetchInstitutions();
    fetchCourses();
  }, [institutionId]);

  useEffect(() => {
    if (institutionId) {
      localStorage.setItem("institutionId", institutionId);
    }
  }, [institutionId]);

  const handleDataChange = (updatedData: AcademicCourse[]) => {
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
      if (Array.isArray(result.courses)) {
        setData(result.courses);
      }
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
    <AdminWorkspaceShell eyebrow="Academic Management" title="Academic Setup">
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.05),transparent_35%),linear-gradient(to_bottom,#f8fafc,#f1f5f9)] py-2 px-2 sm:px-3 text-slate-900 text-[11px]">
        <div className="mx-auto max-w-[1800px] space-y-1.5">
          {/* Compact Header & Institution Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 shadow-2xs backdrop-blur-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-slate-900">
                Academic Curriculum Setup
              </span>
              {selectedInstitution && (
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] py-0 px-1.5"
                >
                  <Building2 className="mr-1 h-2.5 w-2.5" />
                  {selectedInstitution.name}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {loadingInstitutions ? (
                <span className="text-[10.5px] text-slate-500">Loading...</span>
              ) : institutions.length > 0 ? (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium text-slate-500">
                    Institution:
                  </span>
                  <select
                    value={institutionId}
                    onChange={(e) => setInstitutionId(e.target.value)}
                    className="h-6 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[10.5px] font-medium text-slate-800 shadow-inner outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200 min-w-[160px]"
                  >
                    <option value="">Select institution...</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-[10.5px] text-amber-700">
                  {institutionError ?? "No institutions found."}
                </span>
              )}
            </div>
          </div>

          {/* Prompt to Select Institution */}
          {!institutionId && (
            <Card className="border-dashed border-slate-300 bg-white/70">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <School className="h-6 w-6 text-slate-400 mb-1" />
                <h3 className="text-xs font-bold text-slate-800">
                  Select an Institution to Begin
                </h3>
                <p className="mt-0.5 max-w-sm text-[10px] text-slate-500">
                  Choose a registered institution from the dropdown above to load and configure its academic structure.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Academic Workspace */}
          {institutionId && (
            <AcademicWorkspace
              courses={data}
              onCoursesChange={handleDataChange}
              onSave={saveSetup}
              isSaving={isSaving}
              saveMessage={saveMessage}
              institutionName={selectedInstitution?.name}
            />
          )}
        </div>
      </main>
    </AdminWorkspaceShell>
  );
}
