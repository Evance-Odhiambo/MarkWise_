"use client";

import { useState, useEffect } from "react";
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
        const response = await fetch("/api/courses");
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
  }, []);

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

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Academic Data Setup</h1>
        <p className="text-gray-600 mb-8">
          Configure your institution's academic hierarchy: Course/Program, Duration, Years, Semesters, and Units.
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

        {!institutionId && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <p className="text-gray-500">Please select an institution to continue.</p>
          </div>
        )}

        {institutionId && (
          <>
            <AcademicMethodSelector method={method} onChange={setMethod} />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
              {method === "api" && <ApiImportForm onDataImported={handleDataChange} />}
              {method === "csv" && <CsvImportForm onDataImported={handleDataChange} />}
              {method === "manual" && <ManualEntryForm data={data} onDataChange={handleDataChange} />}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
