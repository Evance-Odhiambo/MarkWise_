"use client";

import { useState, useEffect } from "react";
import type { Student, ImportMethod } from "../types/student";
import type { AcademicCourse } from "../types/academic";
import type { Institution } from "@/app/types/auth";
import { StudentMethodSelector } from "../_components/StudentMethodSelector";
import { StudentApiImportForm } from "../_components/StudentApiImportForm";
import { StudentCsvImportForm } from "../_components/StudentCsvImportForm";
import { StudentManualEntryForm } from "../_components/StudentManualEntryForm";
import { AdminWorkspaceShell } from "@/components/admin/AdminWorkspaceShell";

export default function StudentsPage() {
  const [method, setMethod] = useState<ImportMethod>("manual");
  const [data, setData] = useState<Student[]>([]);
  const [courses, setCourses] = useState<AcademicCourse[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
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
    const storedInstitution = localStorage.getItem("institutionId");
    if (storedInstitution) {
      setInstitutionId(storedInstitution);
    }
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

    const fetchStudents = async () => {
      try {
        const response = await fetch(
          `/api/v1/students?institutionId=${encodeURIComponent(institutionId)}`,
          { headers: authHeaders() },
        );
        if (!response.ok)
          throw new Error(`Student service returned HTTP ${response.status}`);
        const result = await response.json();
        setData(
          Array.isArray(result.students)
            ? result.students.map(
                (student: {
                  id: string;
                  name: string;
                  admissionNumber: string;
                  course: string | { name?: string };
                }) => ({
                  id: student.id,
                  name: student.name,
                  admissionNumber: student.admissionNumber,
                  course:
                    typeof student.course === "string"
                      ? student.course
                      : student.course?.name || "",
                }),
              )
            : [],
        );
      } catch (err) {
        console.error("Failed to fetch students:", err);
        setData([]);
      }
    };

    fetchStudents();
  }, [institutionId]);

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

    fetchInstitutions();
  }, []);

  const fetchCourses = async () => {
    try {
      if (!institutionId) return;
      const response = await fetch(
        `/api/v1/institutions/${encodeURIComponent(institutionId)}/setup`,
        { headers: authHeaders() },
      );
      if (response.ok) {
        const result = await response.json();
        const allCourses: AcademicCourse[] = result.courses || [];
        setCourses(allCourses);
        if (allCourses.length > 0 && !selectedCourse) {
          setSelectedCourse(allCourses[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [institutionId]);

  const getCourseName = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    return course?.name || "";
  };

  const handleDataImported = async (importedData: Student[]) => {
    setData(importedData);

    if (!institutionId) return;

    try {
      const response = await fetch("/api/v1/students", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          institutionId,
          students: importedData.map((s) => ({
            name: s.name,
            admissionNumber: s.admissionNumber,
            course: s.course,
          })),
        }),
      });
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => ({}))).error ||
            "Failed to save students",
        );
    } catch (err) {
      console.error("Failed to save students:", err);
    }
  };

  return (
    <AdminWorkspaceShell eyebrow="Setup operations" title="Students">
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Student Data Setup
          </h1>
          <p className="text-gray-600 mb-8">
            Add students by selecting an institution and course, then enter
            student details manually, via CSV, or via API.
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

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={!institutionId}
            >
              <option value="">Choose a course...</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.duration} years)
                </option>
              ))}
            </select>
            {courses.length === 0 && (
              <p className="text-sm text-yellow-600 mt-1">
                No courses found. Please set up academic data first.
              </p>
            )}
          </div>

          {!institutionId || !selectedCourse ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
              <p className="text-gray-500">
                Please select an institution and a course to add students.
              </p>
            </div>
          ) : (
            <>
              <StudentMethodSelector method={method} onChange={setMethod} />

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Adding students to:{" "}
                    <strong>{getCourseName(selectedCourse)}</strong>
                    <br />
                    Institution:{" "}
                    <strong>
                      {institutions.find((i) => i.id === institutionId)?.name ||
                        ""}
                    </strong>
                  </p>
                  {method === "api" && (
                    <StudentApiImportForm
                      institutionId={institutionId}
                      selectedCourse={getCourseName(selectedCourse)}
                      onDataImported={handleDataImported}
                    />
                  )}
                  {method === "csv" && (
                    <StudentCsvImportForm
                      selectedCourse={getCourseName(selectedCourse)}
                      onDataImported={handleDataImported}
                    />
                  )}
                  {method === "manual" && (
                    <StudentManualEntryForm
                      data={data}
                      onDataChange={handleDataImported}
                      selectedCourse={getCourseName(selectedCourse)}
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
