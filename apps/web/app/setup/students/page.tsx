"use client";

import { useState, useEffect, useMemo } from "react";
import type { Student, ImportMethod } from "@/types/setup-student";
import type { AcademicCourse } from "@/types/setup-academic";
import type { Institution } from "@/types/auth";
import { StudentMethodSelector } from "@/components/features/setup/student-method-selector";
import { StudentApiImportForm } from "@/components/features/setup/student-api-import-form";
import { StudentCsvImportForm } from "@/components/features/setup/student-csv-import-form";
import { BulkSpreadsheetEntry } from "@/components/features/setup/bulk-spreadsheet-entry";
import { AdminWorkspaceShell } from "@/components/features/admin/admin-workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  Download,
  Edit2,
  GraduationCap,
  Plus,
  School,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

export default function StudentsPage() {
  const [method, setMethod] = useState<ImportMethod>("manual");
  const [data, setData] = useState<Student[]>([]);
  const [courses, setCourses] = useState<AcademicCourse[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [institutionId, setInstitutionId] = useState<string>("");
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [institutionFetchError, setInstitutionFetchError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Roster search and batch selection state
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingAdmissionNumber, setEditingAdmissionNumber] = useState("");

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
        setInstitutions(Array.isArray(result.institutions) ? result.institutions : []);
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

  useEffect(() => {
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

    fetchInstitutions();
  }, []);

  useEffect(() => {
    if (institutionId) localStorage.setItem("institutionId", institutionId);
  }, [institutionId]);

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

  const fetchStudents = async () => {
    if (!institutionId) {
      setData([]);
      return;
    }

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

  useEffect(() => {
    fetchStudents();
  }, [institutionId]);

  const getCourseName = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    return course?.name || "";
  };

  const handleBulkCommit = async (
    newRows: Array<{ name: string; identifier: string }>,
  ) => {
    if (!institutionId || newRows.length === 0) return;

    const currentCourseName = getCourseName(selectedCourse);
    if (!currentCourseName) return;

    setIsSaving(true);
    setSaveMessage(null);

    const merged = [
      ...data,
      ...newRows.map((r) => ({
        id: `student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: r.name,
        admissionNumber: r.identifier,
        course: currentCourseName,
      })),
    ];

    try {
      const response = await fetch("/api/v1/students", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          institutionId,
          students: merged.map((s) => ({
            name: s.name,
            admissionNumber: s.admissionNumber,
            course: s.course,
          })),
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to save students");
      }

      await fetchStudents();
      setSaveMessage(`Successfully enrolled ${newRows.length} students in "${currentCourseName}".`);
      setTimeout(() => setSaveMessage(null), 3500);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save students");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDataImported = async (importedData: Student[]) => {
    setData(importedData);
    if (!institutionId) return;

    setIsSaving(true);
    setSaveMessage(null);
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
      setSaveMessage("Student roster synced successfully.");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save students");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    const updated = data.filter((s) => s.id !== id);
    setData(updated);
    if (!institutionId) return;

    try {
      await fetch("/api/v1/students", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          institutionId,
          students: updated.map((s) => ({
            name: s.name,
            admissionNumber: s.admissionNumber,
            course: s.course,
          })),
        }),
      });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleDeleteBatch = async () => {
    if (selectedIds.size === 0) return;
    const updated = data.filter((s) => !selectedIds.has(s.id));
    setData(updated);
    setSelectedIds(new Set());

    if (!institutionId) return;

    try {
      await fetch("/api/v1/students", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          institutionId,
          students: updated.map((s) => ({
            name: s.name,
            admissionNumber: s.admissionNumber,
            course: s.course,
          })),
        }),
      });
    } catch (err) {
      console.error("Batch delete failed:", err);
    }
  };

  const handleStartEdit = (student: Student) => {
    setEditingId(student.id);
    setEditingName(student.name);
    setEditingAdmissionNumber(student.admissionNumber);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim() || !editingAdmissionNumber.trim()) return;

    const updated = data.map((s) =>
      s.id === editingId
        ? {
            ...s,
            name: editingName.trim(),
            admissionNumber: editingAdmissionNumber.trim().toUpperCase(),
          }
        : s,
    );

    setData(updated);
    setEditingId(null);

    if (!institutionId) return;

    try {
      await fetch("/api/v1/students", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          institutionId,
          students: updated.map((s) => ({
            name: s.name,
            admissionNumber: s.admissionNumber,
            course: s.course,
          })),
        }),
      });
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map((s) => s.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const exportStudentsCSV = () => {
    const listToExport = selectedIds.size > 0
      ? data.filter((s) => selectedIds.has(s.id))
      : data;

    if (listToExport.length === 0) return;
    const headers = ["Name", "Admission Number", "Course"];
    const rows = listToExport.map((s) => [`"${s.name}"`, s.admissionNumber, `"${s.course}"`]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `students_roster_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const existingAdmissionNumbers = useMemo(() => {
    return new Set(data.map((s) => s.admissionNumber.trim().toLowerCase()));
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.course.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCourse =
        courseFilter === "ALL" || s.course.toLowerCase() === courseFilter.toLowerCase();

      return matchSearch && matchCourse;
    });
  }, [data, searchTerm, courseFilter]);

  const selectedInstitution = institutions.find((i) => i.id === institutionId);

  return (
    <AdminWorkspaceShell eyebrow="Academic Management" title="Students Roster">
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.05),transparent_35%),linear-gradient(to_bottom,#f8fafc,#f1f5f9)] py-2 px-2 sm:px-3 text-slate-900 text-[11px]">
        <div className="mx-auto max-w-[1800px] space-y-2">
          {/* Header Banner & Selection Filters */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 shadow-2xs backdrop-blur-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-slate-900">
                Student Cohorts & Enrollment
              </span>
              {selectedInstitution && (
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] py-0 px-1.5 font-semibold"
                >
                  <Building2 className="mr-1 h-2.5 w-2.5 text-emerald-600" />
                  {selectedInstitution.name}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {data.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportStudentsCSV}
                  className="h-6 px-2 text-[10px] text-slate-700 bg-white border-slate-200 hover:bg-slate-50 gap-1 shadow-2xs"
                >
                  <Download className="h-3 w-3 text-slate-500" />
                  <span>Export CSV</span>
                </Button>
              )}

              {/* Institution Select */}
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
                    className="h-6 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[10.5px] font-medium text-slate-800 shadow-inner outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200 min-w-[150px]"
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
                  {institutionFetchError ?? "No institutions found."}
                </span>
              )}

              {/* Course Select */}
              {institutionId && courses.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium text-slate-500">
                    Enroll in Program:
                  </span>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="h-6 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[10.5px] font-medium text-slate-800 shadow-inner outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 min-w-[170px]"
                  >
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name} ({course.duration} yrs)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {saveMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[10.5px] text-emerald-800 flex items-center justify-between animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>{saveMessage}</span>
              </div>
              <button onClick={() => setSaveMessage(null)}>
                <X className="h-3 w-3 text-emerald-600" />
              </button>
            </div>
          )}

          {!institutionId ? (
            <Card className="border-dashed border-slate-300 bg-white/70">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <School className="h-6 w-6 text-slate-400 mb-1" />
                <h3 className="text-xs font-bold text-slate-800">
                  Select an Institution to Manage Students
                </h3>
                <p className="mt-0.5 max-w-sm text-[10px] text-slate-500">
                  Choose a registered institution and program from the selectors above to enroll students.
                </p>
              </CardContent>
            </Card>
          ) : courses.length === 0 ? (
            <Card className="border-dashed border-amber-200 bg-amber-50/50">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <BookOpen className="h-6 w-6 text-amber-500 mb-1" />
                <h3 className="text-xs font-bold text-amber-900">
                  No Academic Programs Configured
                </h3>
                <p className="mt-0.5 max-w-sm text-[10px] text-amber-700">
                  Please set up courses and academic structure in Curriculum Setup before enrolling students.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {/* Method Selector Tabs */}
              <StudentMethodSelector method={method} onChange={setMethod} />

              {/* Data Ingestion Workspace */}
              <Card className="border-slate-200/90 bg-white shadow-2xs">
                <CardContent className="p-3">
                  {method === "manual" && (
                    <BulkSpreadsheetEntry
                      mode="student"
                      entityName="Student"
                      identifierLabel="Admission / Student ID"
                      identifierPlaceholder="e.g. SC211/0458/2023"
                      extraLabel="Degree Program"
                      existingIdentifiers={existingAdmissionNumbers}
                      onCommit={handleBulkCommit}
                      isSaving={isSaving}
                    />
                  )}
                  {method === "csv" && (
                    <StudentCsvImportForm
                      selectedCourse={getCourseName(selectedCourse)}
                      onDataImported={handleDataImported}
                    />
                  )}
                  {method === "api" && (
                    <StudentApiImportForm
                      institutionId={institutionId}
                      selectedCourse={getCourseName(selectedCourse)}
                      onDataImported={handleDataImported}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Current Active Roster Table */}
              <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
                <CardHeader className="border-b border-slate-100 px-3 py-2 bg-slate-50/60 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-slate-700" />
                    <CardTitle className="text-xs font-bold text-slate-900">
                      Enrolled Student Roster
                    </CardTitle>
                    <Badge variant="outline" className="text-[9px] font-mono border-slate-200">
                      {data.length} Total Enrolled
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500">
                          {selectedIds.size} selected
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleDeleteBatch}
                          className="h-6 px-2 text-[10px] font-medium"
                        >
                          <Trash2 className="h-2.5 w-2.5 mr-1" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    )}

                    {/* Program Filter Pills */}
                    {courses.length > 1 && (
                      <div className="hidden md:flex items-center rounded-md border border-slate-200 bg-white p-0.5 text-[9.5px]">
                        <button
                          type="button"
                          onClick={() => setCourseFilter("ALL")}
                          className={`rounded px-1.5 py-0.5 font-medium transition ${
                            courseFilter === "ALL"
                              ? "bg-slate-900 text-white font-semibold"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          All Programs
                        </button>
                        {courses.slice(0, 3).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setCourseFilter(c.name)}
                            className={`rounded px-1.5 py-0.5 font-medium transition truncate max-w-[100px] ${
                              courseFilter.toLowerCase() === c.name.toLowerCase()
                                ? "bg-slate-900 text-white font-semibold"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="relative min-w-[180px]">
                      <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-6 w-full rounded-md border border-slate-200 bg-white pl-6 pr-2 text-[10px] text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {data.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-[10.5px]">
                      No students enrolled in this institution yet. Use the entry forms above to add students.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/80 text-[9.5px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 z-10">
                            <th className="py-1.5 px-2.5 w-8">
                              <input
                                type="checkbox"
                                checked={
                                  filteredData.length > 0 &&
                                  selectedIds.size === filteredData.length
                                }
                                onChange={toggleSelectAll}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                            </th>
                            <th className="py-1.5 px-3">Student Name</th>
                            <th className="py-1.5 px-3">Admission Number</th>
                            <th className="py-1.5 px-3">Enrolled Course</th>
                            <th className="py-1.5 px-3 text-right w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {filteredData.map((student) => {
                            const isSelected = selectedIds.has(student.id);
                            const isEditing = editingId === student.id;

                            return (
                              <tr
                                key={student.id}
                                className={`transition-colors ${
                                  isSelected ? "bg-emerald-50/40" : "hover:bg-slate-50/60"
                                }`}
                              >
                                <td className="py-1.5 px-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectRow(student.id)}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                </td>
                                <td className="py-1.5 px-3">
                                  {isEditing ? (
                                    <Input
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      className="h-6 text-[10.5px]"
                                      autoFocus
                                    />
                                  ) : (
                                    <span className="font-semibold text-slate-900 text-[11px]">
                                      {student.name}
                                    </span>
                                  )}
                                </td>
                                <td className="py-1.5 px-3">
                                  {isEditing ? (
                                    <Input
                                      value={editingAdmissionNumber}
                                      onChange={(e) => setEditingAdmissionNumber(e.target.value)}
                                      className="h-6 text-[10.5px] font-mono"
                                    />
                                  ) : (
                                    <span className="font-mono text-[10.5px] text-slate-600">
                                      {student.admissionNumber}
                                    </span>
                                  )}
                                </td>
                                <td className="py-1.5 px-3">
                                  <span className="text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                    {student.course}
                                  </span>
                                </td>
                                <td className="py-1.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {isEditing ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={handleSaveEdit}
                                          className="rounded p-1 text-emerald-600 hover:bg-emerald-50 transition"
                                          title="Save changes"
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingId(null)}
                                          className="rounded p-1 text-slate-400 hover:bg-slate-100 transition"
                                          title="Cancel"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleStartEdit(student)}
                                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                          title="Edit"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSingle(student.id)}
                                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                                          title="Delete"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </AdminWorkspaceShell>
  );
}
