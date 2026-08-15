"use client";

import { useState, useEffect } from "react";
import type { Lecturer, ImportMethod } from "../types/lecturer";
import type { Institution } from "@/app/types/auth";
import { LecturerMethodSelector } from "../_components/LecturerMethodSelector";
import { LecturerApiImportForm } from "../_components/LecturerApiImportForm";
import { LecturerCsvImportForm } from "../_components/LecturerCsvImportForm";
import { LecturerManualEntryForm } from "../_components/LecturerManualEntryForm";

export default function LecturersPage() {
  const [method, setMethod] = useState<ImportMethod>("manual");
  const [data, setData] = useState<Lecturer[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institutionId, setInstitutionId] = useState<string>("");
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);

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

  const handleDataImported = async (importedData: Lecturer[]) => {
    setData(importedData);

    if (!institutionId) return;

    try {
      await fetch("/api/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId,
          lecturers: importedData.map((l) => ({
            name: l.name,
            staffNumber: l.staffNumber,
          })),
        }),
      });
    } catch (err) {
      console.error("Failed to save lecturers:", err);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lecturer Data Setup</h1>
        <p className="text-gray-600 mb-8">
          Configure your institution's lecturer records: Name and Staff Number.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Institution
          </label>
          {loadingInstitutions ? (
            <p className="text-gray-500">Loading institutions...</p>
          ) : institutions.length === 0 ? (
            <p className="text-sm text-yellow-600">
              No institutions found. Please add an institution in the Admin panel first.
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
            <p className="text-gray-500">Please select an institution to continue.</p>
          </div>
        ) : (
          <>
            <LecturerMethodSelector method={method} onChange={setMethod} />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Institution: <strong>{institutions.find((i) => i.id === institutionId)?.name || ""}</strong>
                </p>
                {method === "api" && <LecturerApiImportForm onDataImported={handleDataImported} />}
                {method === "csv" && <LecturerCsvImportForm onDataImported={handleDataImported} />}
                {method === "manual" && <LecturerManualEntryForm data={data} onDataChange={handleDataImported} />}
              </>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
