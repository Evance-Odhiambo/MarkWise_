"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AcademicCourse, AcademicSemester, AcademicUnit } from "../types/academic";

interface ManualEntryFormProps {
  data: AcademicCourse[];
  onDataChange: (data: AcademicCourse[]) => void;
}

const SEMESTER_OPTIONS = ["Semester 1", "Semester 2"];

export function ManualEntryForm({ data, onDataChange }: ManualEntryFormProps) {
  const [view, setView] = useState<"courses" | "years" | "semesters" | "units">("courses");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);

  const [courseName, setCourseName] = useState("");
  const [courseDuration, setCourseDuration] = useState(1);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  const [unitName, setUnitName] = useState("");
  const [unitCode, setUnitCode] = useState("");
  const [bulkUnitCsv, setBulkUnitCsv] = useState("");

  const resetCourseForm = () => {
    setCourseName("");
    setCourseDuration(1);
    setEditingCourseId(null);
  };

  const resetUnitForm = () => {
    setUnitName("");
    setUnitCode("");
    setBulkUnitCsv("");
  };

  const generateSemesters = (yearId: string): AcademicSemester[] =>
    SEMESTER_OPTIONS.map((name, idx) => ({
      id: `sem-${yearId}-${idx + 1}`,
      name,
      semesterNum: idx + 1,
      yearId,
      units: [],
    }));

  const addCourse = () => {
    if (!courseName || courseDuration < 1) return;

    if (editingCourseId) {
      const updatedData = data.map((course) => {
        if (course.id !== editingCourseId) return course;

        const updatedCourse: AcademicCourse = {
          ...course,
          name: courseName,
          duration: courseDuration,
        };

        const nextYears = Array.from({ length: courseDuration }, (_, index) => {
          const yearNumber = index + 1;
          const existingYear = course.years.find((year) => year.yearNumber === yearNumber);

          if (existingYear) {
            return {
              ...existingYear,
              semesters: existingYear.semesters.length
                ? existingYear.semesters
                : generateSemesters(existingYear.id),
            };
          }

          const yearId = `year-${course.id}-${yearNumber}`;
          return {
            id: yearId,
            yearNumber,
            courseId: course.id,
            semesters: generateSemesters(yearId),
          };
        });

        return { ...updatedCourse, years: nextYears };
      });

      onDataChange(updatedData);
      resetCourseForm();
      setView("courses");
      return;
    }

    const existing = data.find((c) => c.name.toLowerCase() === courseName.trim().toLowerCase());
    if (existing) {
      alert("A course with this name already exists");
      return;
    }

    const newCourse: AcademicCourse = {
      id: `course-${Date.now()}`,
      name: courseName,
      duration: courseDuration,
      years: [],
    };

    for (let year = 1; year <= courseDuration; year++) {
      const yearId = `year-${newCourse.id}-${year}`;
      newCourse.years.push({
        id: yearId,
        yearNumber: year,
        courseId: newCourse.id,
        semesters: generateSemesters(yearId),
      });
    }

    onDataChange([...data, newCourse]);
    resetCourseForm();
    setView("courses");
  };

  const deleteCourse = (courseId: string) => {
    const nextData = data.filter((course) => course.id !== courseId);
    onDataChange(nextData);

    if (selectedCourseId === courseId) {
      setSelectedCourseId(null);
      setSelectedYearId(null);
      setSelectedSemesterId(null);
    }

    if (editingCourseId === courseId) {
      resetCourseForm();
    }
  };

  const getCourse = (courseId: string | null) =>
    courseId ? data.find((c) => c.id === courseId) : null;

  const getYear = (courseId: string | null, yearId: string | null) =>
    courseId && yearId ? getCourse(courseId)?.years.find((y) => y.id === yearId) : null;

  const getSemester = (courseId: string | null, yearId: string | null, semesterId: string | null) =>
    courseId && yearId && semesterId
      ? getYear(courseId, yearId)?.semesters?.find((s) => s.id === semesterId)
      : null;

  const totalUnits = data.reduce(
    (sum, c) =>
      sum +
      (c.years || []).reduce(
        (sumY, y) =>
          sumY + (y.semesters || []).reduce((sumS, s) => sumS + (s.units || []).length, 0),
        0
      ),
    0
  );

  const addUnitsFromCsv = (courseId: string, yearId: string, semesterId: string) => {
    const lines = bulkUnitCsv
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const newUnits: AcademicUnit[] = [];

    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        const code = parts[0];
        const name = parts[1];
        if (code && name) {
          newUnits.push({
            id: `unit-${semesterId}-${code}-${newUnits.length}`,
            name,
            code,
            semesterId,
          });
        }
      }
    }

    const updatedData = data.map((c) =>
      c.id === courseId
        ? {
            ...c,
            years: c.years.map((y) =>
              y.id === yearId
                ? {
                    ...y,
                    semesters: (y.semesters || []).map((s) =>
                      s.id === semesterId ? { ...s, units: [...(s.units || []), ...newUnits] } : s
                    ),
                  }
                : y
            ),
          }
        : c
    );
    onDataChange(updatedData);
    resetUnitForm();
  };

  const addSingleUnit = (courseId: string, yearId: string, semesterId: string) => {
    if (!unitCode || !unitName) return;

    const semester = getSemester(courseId, yearId, semesterId);
    if (!semester) return;

    const existing = semester.units.find((u) => u.code === unitCode);
    if (existing) {
      alert("A unit with this code already exists in this semester");
      return;
    }

    const newUnit: AcademicUnit = {
      id: `unit-${semesterId}-${unitCode}`,
      name: unitName,
      code: unitCode,
      semesterId,
    };

    const updatedData = data.map((c) =>
      c.id === courseId
        ? {
            ...c,
            years: c.years.map((y) =>
              y.id === yearId
                ? {
                    ...y,
                    semesters: (y.semesters || []).map((s) =>
                      s.id === semesterId ? { ...s, units: [...(s.units || []), newUnit] } : s
                    ),
                  }
                : y
            ),
          }
        : c
    );
    onDataChange(updatedData);
    resetUnitForm();
  };

  const deleteUnit = (courseId: string, yearId: string, semesterId: string, unitId: string) => {
    const updatedData = data.map((c) =>
      c.id === courseId
        ? {
            ...c,
            years: c.years.map((y) =>
              y.id === yearId
                ? {
                    ...y,
                    semesters: (y.semesters || []).map((s) =>
                      s.id === semesterId
                        ? { ...s, units: (s.units || []).filter((u) => u.id !== unitId) }
                        : s
                    ),
                  }
                : y
            ),
          }
        : c
    );
    onDataChange(updatedData);
  };

  const renderCoursesView = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Courses / Programs</h3>
        <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700">
          {data.length} added
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          <label className="block text-sm font-medium text-slate-700">Course Name</label>
          <Input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="e.g. Computer Science"
            className="h-11 rounded-xl border-slate-200 bg-slate-50"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Duration (Years)</label>
          <Input
            type="number"
            value={courseDuration}
            onChange={(e) => setCourseDuration(parseInt(e.target.value, 10) || 1)}
            min={1}
            max={10}
            className="h-11 rounded-xl border-slate-200 bg-slate-50"
          />
        </div>
        <div className="flex items-end gap-2">
          <Button type="button" onClick={addCourse} disabled={!courseName || courseDuration < 1} className="w-full justify-center">
            {editingCourseId ? "Update Course" : "Add Course"}
          </Button>
          {editingCourseId && (
            <Button type="button" variant="outline" onClick={resetCourseForm} className="justify-center">
              Cancel
            </Button>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-slate-50/70">
          <div className="p-6 text-center text-sm text-slate-500">No courses added yet.</div>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Duration</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Years</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Units</th>
                <th className="w-24 px-4 py-3 text-right font-medium text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((course) => {
                const yearCount = course.years.length;
                const unitCount = (course.years || []).reduce(
                  (sum, y) =>
                    sum + (y.semesters || []).reduce((sumS, s) => sumS + (s.units || []).length, 0),
                  0
                );
                return (
                  <tr key={course.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-800">{course.name}</td>
                    <td className="px-4 py-3 text-slate-600">{course.duration} years</td>
                    <td className="px-4 py-3 text-slate-600">{yearCount}</td>
                    <td className="px-4 py-3 text-slate-600">{unitCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCourseId(course.id);
                            setView("years");
                            resetCourseForm();
                          }}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          Manage
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCourseId(course.id);
                            setCourseName(course.name);
                            setCourseDuration(course.duration);
                          }}
                          className="text-sm font-medium text-amber-600 hover:text-amber-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCourse(course.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderYearsView = () => {
    const course = selectedCourseId ? getCourse(selectedCourseId) : null;
    if (!course) return null;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setView("courses");
                setSelectedYearId(null);
              }}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← Back
            </button>
            <h3 className="text-lg font-semibold text-slate-900">
              {course.name} — Duration {course.duration} years
            </h3>
          </div>
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
            {course.years.length} years
          </Badge>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Year</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Semesters</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Units</th>
                <th className="w-24 px-4 py-3 text-right font-medium text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {course.years.map((year) => {
                const unitCount = (year.semesters || []).reduce(
                  (sum, s) => sum + (s.units || []).length,
                  0
                );
                return (
                  <tr key={year.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-800">Year {year.yearNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{(year.semesters || []).length}</td>
                    <td className="px-4 py-3 text-slate-600">{unitCount}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedYearId(year.id);
                          setView("semesters");
                          resetUnitForm();
                        }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSemestersView = () => {
    const course = selectedCourseId ? getCourse(selectedCourseId) : null;
    const year = selectedCourseId && selectedYearId ? getYear(selectedCourseId, selectedYearId) : null;
    if (!course || !year) return null;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setView("years");
                setSelectedSemesterId(null);
              }}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← Back
            </button>
            <h3 className="text-lg font-semibold text-slate-900">
              {course.name} — Year {year.yearNumber}
            </h3>
          </div>
          <Badge variant="secondary" className="rounded-full bg-blue-50 text-blue-700">
            Semester plan
          </Badge>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Semester #</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Units</th>
                <th className="w-24 px-4 py-3 text-right font-medium text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {(year.semesters || []).map((sem) => (
                <tr key={sem.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-800">{sem.name}</td>
                  <td className="px-4 py-3 text-slate-600">{sem.semesterNum}</td>
                  <td className="px-4 py-3 text-slate-600">{(sem.units || []).length}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSemesterId(sem.id);
                        resetUnitForm();
                      }}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Add Units
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedSemesterId && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setSelectedSemesterId(null)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← Back to semesters
            </button>
            {renderUnitsView()}
          </div>
        )}
      </div>
    );
  };

  const renderUnitsView = () => {
    if (!selectedCourseId || !selectedYearId || !selectedSemesterId) return null;
    const semester = getSemester(selectedCourseId, selectedYearId, selectedSemesterId);
    if (!semester) return null;

    return (
      <Card className="border-slate-200 bg-slate-50/60">
        <div className="space-y-5 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Units</h3>
            <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
              {semester.units.length} in this term
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Unit Name</label>
              <Input
                type="text"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="e.g. Introduction to Programming"
                className="h-11 rounded-xl border-slate-200 bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Unit Code</label>
              <Input
                type="text"
                value={unitCode}
                onChange={(e) => setUnitCode(e.target.value)}
                placeholder="e.g. CS1010L"
                className="h-11 rounded-xl border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={() => addSingleUnit(selectedCourseId, selectedYearId, selectedSemesterId)}
              disabled={!unitCode || !unitName}
              className="justify-center"
            >
              Add Unit
            </Button>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Bulk Add Units (CSV format: code,name)</label>
            <textarea
              value={bulkUnitCsv}
              onChange={(e) => setBulkUnitCsv(e.target.value)}
              placeholder={`CS1010L,Introduction to Programming\nCS2030,Data Structures\nMA1010,C Mathematics`}
              rows={6}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="text-xs text-slate-500">Enter one unit per line: code, name</p>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => addUnitsFromCsv(selectedCourseId, selectedYearId, selectedSemesterId)}
            disabled={!bulkUnitCsv.trim()}
            className="justify-center"
          >
            Add Units from CSV
          </Button>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Unit Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Unit Code</th>
                  <th className="w-20 px-4 py-3 text-right font-medium text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {semester.units.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                      No units added yet.
                    </td>
                  </tr>
                ) : (
                  semester.units.map((unit) => (
                    <tr key={unit.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 text-slate-800">{unit.name}</td>
                      <td className="px-4 py-3 text-slate-600">{unit.code}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => deleteUnit(selectedCourseId, selectedYearId, selectedSemesterId, unit.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {view !== "courses" && (
            <button
              type="button"
              onClick={() => {
                setView("courses");
                setSelectedCourseId(null);
                setSelectedYearId(null);
                setSelectedSemesterId(null);
              }}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← Back to Courses
            </button>
          )}
        </div>

        <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700">
          {data.length} courses · {totalUnits} units
        </Badge>
      </div>

      {view === "courses" && renderCoursesView()}
      {view === "years" && selectedCourseId && renderYearsView()}
      {view === "semesters" && selectedCourseId && selectedYearId && renderSemestersView()}
    </div>
  );
}
