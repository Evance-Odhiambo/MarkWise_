"use client";

import { useState, useEffect } from "react";
import type { Lecturer, ImportMethod } from "../types/lecturer";
import type { Institution } from "@/app/types/auth";
import { LecturerMethodSelector } from "../_components/LecturerMethodSelector";
import { LecturerApiImportForm } from "../_components/LecturerApiImportForm";
import { LecturerCsvImportForm } from "../_components/LecturerCsvImportForm";
import { LecturerManualEntryForm } from "../_components/LecturerManualEntryForm";
import { AdminWorkspaceShell } from "@/components/admin/AdminWorkspaceShell";

export default function LecturersPage() {
  const [method, setMethod] = useState<ImportMethod>("manual");
  const [data, setData] = useState<Lecturer[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institutionId, setInstitutionId] = useState<string>("");
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [institutionFetchError, setInstitutionFetchError] = useState<
    string | null
  >(null);

  const authHeaders = (): Record<string, string> => {
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}") as {
        token?: string;
      };
      return user.token ? { Authorization: `Bearer ${user.token}` } : {};
    } catch {
      return {};
    }
  };

  useEffect(() => {
    const fetchInstitutions = async () => {
      setInstitutionFetchError(null);
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
        setInstitutionFetchError(
          "Unable to load registered institutions. Check that the backend is running and try again.",
        );
        setInstitutions([]);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    const storedInstitution = localStorage.getItem("institutionId");
    if (storedInstitution) {
      setInstitutionId(storedInstitution);
    }

    fetchInstitutions();
  }, []);

  useEffect(() => {
    if (institutionId) {
      localStorage.setItem("institutionId", institutionId);
    }
  }, [institutionId]);

  useEffect(() => {
    if (!institutionId) {
      setData([]);
      return;
    }

    const fetchLecturers = async () => {
      try {
        const response = await fetch(
          `/api/v1/lecturers?institutionId=${encodeURIComponent(institutionId)}`,
          { headers: authHeaders() },
        );
        if (!response.ok)
          throw new Error(`Lecturer service returned HTTP ${response.status}`);
        const result = await response.json();
        setData(Array.isArray(result.lecturers) ? result.lecturers : []);
      } catch (err) {
        console.error("Failed to fetch lecturers:", err);
        setData([]);
      }
    };

    fetchLecturers();
  }, [institutionId]);

  const handleDataImported = async (importedData: Lecturer[]) => {
    setData(importedData);

    if (!institutionId) return;

    try {
      const response = await fetch("/api/v1/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          institutionId,
          lecturers: importedData.map((l) => ({
            name: l.name,
            staffNumber: l.staffNumber,
          })),
        }),
      });
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => ({}))).error ||
            "Failed to save lecturers",
        );
    } catch (err) {
      console.error("Failed to save lecturers:", err);
    }
  };

  return (
    <AdminWorkspaceShell eyebrow="Setup operations" title="Lecturers">
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Lecturer Data Setup
          </h1>
          <p className="text-gray-600 mb-8">
            Configure your institution's lecturer records: Name and Staff
            Number.
          </p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Institution
            </label>
            {loadingInstitutions ? (
              <p className="text-gray-500">Loading institutions...</p>
            ) : institutions.length === 0 ? (
              <p className="text-sm text-yellow-600">
                {institutionFetchError ||
                  "No institutions found. Please add an institution in the Admin panel first."}
              </p>
            ) : (
              <select
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Choose an institution...</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {!institutionId ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
              <p className="text-gray-500">
                Please select an institution to continue.
              </p>
            </div>
          ) : (
            <>
              <LecturerMethodSelector method={method} onChange={setMethod} />

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Institution:{" "}
                    <strong>
                      {institutions.find((i) => i.id === institutionId)?.name ||
                        ""}
                    </strong>
                  </p>
                  {method === "api" && (
                    <LecturerApiImportForm
                      institutionId={institutionId}
                      onDataImported={handleDataImported}
                    />
                  )}
                  {method === "csv" && (
                    <LecturerCsvImportForm
                      onDataImported={handleDataImported}
                    />
                  )}
                  {method === "manual" && (
                    <LecturerManualEntryForm
                      data={data}
                      onDataChange={handleDataImported}
                    />
                  )}
                </>
              </div>
            </>
          )}
        </div>
      </main>
    </AdminWorkspaceShell>
  );
}
