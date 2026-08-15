"use client";

import { useState } from "react";
import type {
  AcademicCourse,
  AcademicYear,
  AcademicSemester,
  AcademicUnit,
} from "../types/academic";

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

  // Course form states
  const [courseName, setCourseName] = useState("");
  const [courseDuration, setCourseDuration] = useState(1);
  const [courseDesc, setCourseDesc] = useState("");

  // Unit form states
  const [unitName, setUnitName] = useState("");
  const [unitCode, setUnitCode] = useState("");
  const [bulkUnitCsv, setBulkUnitCsv] = useState("");

  const resetCourseForm = () => {
    setCourseName("");
    setCourseDuration(1);
    setCourseDesc("");
  };

  const resetUnitForm = () => {
    setUnitName("");
    setUnitCode("");
    setBulkUnitCsv("");
  };

  const generateSemesters = (yearId: string): AcademicSemester[] => {
    return SEMESTER_OPTIONS.map((name, idx) => ({
      id: `sem-${yearId}-${idx + 1}`,
      name,
      semesterNum: idx + 1,
      yearId,
      units: [],
    }));
  };

  const addCourse = () => {
    if (!courseName || courseDuration < 1) return;

    const existing = data.find((c) => c.name === courseName);
    if (existing) {
      alert("A course with this name already exists");
      return;
    }

    const newCourse: AcademicCourse = {
      id: `course-${Date.now()}`,
      name: courseName,
      duration: courseDuration,
      description: courseDesc || null,
      years: [],
    };

    // Auto-generate years and semesters based on duration
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
    onDataChange(data.filter((c) => c.id !== courseId));
    setSelectedCourseId(null);
    setSelectedYearId(null);
    setSelectedSemesterId(null);
    setView("courses");
  };

  const getCourse = (courseId: string | null) =>
    courseId ? data.find((c) => c.id === courseId) : null;

  const getYear = (courseId: string | null, yearId: string | null) =>
    courseId && yearId
      ? getCourse(courseId)?.years.find((y) => y.id === yearId)
      : null;

  const getSemester = (
    courseId: string | null,
    yearId: string | null,
    semesterId: string | null
  ) =>
    courseId && yearId && semesterId
      ? getYear(courseId, yearId)?.semesters?.find((s) => s.id === semesterId)
      : null;

  const totalUnits = data.reduce(
    (sum, c) =>
      sum +
      (c.years || []).reduce(
        (sumY, y) =>
          sumY +
          (y.semesters || []).reduce((sumS, s) => sumS + (s.units || []).length, 0),
        0
      ),
    0
  );

  const addUnitsFromCsv = (
    courseId: string,
    yearId: string,
    semesterId: string
  ) => {
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
                      s.id === semesterId
                        ? { ...s, units: [...(s.units || []), ...newUnits] }
                        : s
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

  const addSingleUnit = (
    courseId: string,
    yearId: string,
    semesterId: string
  ) => {
    if (!unitCode || !unitName) return;

    const course = getCourse(courseId);
    const year = getYear(courseId, yearId);
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
                      s.id === semesterId
                        ? { ...s, units: [...(s.units || []), newUnit] }
                        : s
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

  const deleteUnit = (
    courseId: string,
    yearId: string,
    semesterId: string,
    unitId: string
  ) => {
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

  // View: Courses
  const renderCoursesView = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Courses / Programs</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course Name
          </label>
          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="e.g. Computer Science"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (Years)
          </label>
          <input
            type="number"
            value={courseDuration}
            onChange={(e) => setCourseDuration(parseInt(e.target.value, 10) || 1)}
            min={1}
            max={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={addCourse}
            disabled={!courseName || courseDuration < 1}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition"
          >
            Add Course
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <textarea
          value={courseDesc}
          onChange={(e) => setCourseDesc(e.target.value)}
          placeholder="Brief description of the course/program..."
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">No courses added yet.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-3 font-medium text-gray-700">Name</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Duration</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Years</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Units</th>
                <th className="w-1"></th>
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
                  <tr key={course.id} className="border-t border-gray-100">
                    <td className="py-2 px-3">{course.name}</td>
                    <td className="py-2 px-3">{course.duration} years</td>
                    <td className="py-2 px-3">{yearCount}</td>
                    <td className="py-2 px-3">{unitCount}</td>
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCourseId(course.id);
                          setView("years");
                          resetCourseForm();
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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
      )}
    </div>
  );

  // View: Years
  const renderYearsView = () => {
    const course = selectedCourseId ? getCourse(selectedCourseId) : null;
    if (!course) return null;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setView("courses");
              setSelectedYearId(null);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back
          </button>
          <h3 className="text-lg font-semibold text-gray-900">
            {course.name} — Years (Duration: {course.duration} years)
          </h3>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-3 font-medium text-gray-700">Year Number</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Semesters</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Units</th>
                <th className="w-1"></th>
              </tr>
            </thead>
            <tbody>
              {course.years.map((year) => {
                const unitCount = (year.semesters || []).reduce(
                  (sum, s) => sum + (s.units || []).length,
                  0
                );
                return (
                  <tr key={year.id} className="border-t border-gray-100">
                    <td className="py-2 px-3">Year {year.yearNumber}</td>
                    <td className="py-2 px-3">{(year.semesters || []).length}</td>
                    <td className="py-2 px-3">{unitCount}</td>
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedYearId(year.id);
                          setView("semesters");
                          resetUnitForm();
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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

  // View: Semesters
  const renderSemestersView = () => {
    const course = selectedCourseId ? getCourse(selectedCourseId) : null;
    const year = selectedCourseId && selectedYearId
      ? getYear(selectedCourseId, selectedYearId)
      : null;
    if (!course || !year) return null;

    const yearNumber = year.yearNumber;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setView("years");
              setSelectedSemesterId(null);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back
          </button>
          <h3 className="text-lg font-semibold text-gray-900">
            {course.name} — Year {yearNumber} — Semesters
          </h3>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-3 font-medium text-gray-700">Name</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Semester #</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Units</th>
                <th className="w-1"></th>
              </tr>
            </thead>
            <tbody>
              {(year.semesters || []).map((sem) => (
                <tr key={sem.id} className="border-t border-gray-100">
                  <td className="py-2 px-3">{sem.name}</td>
                  <td className="py-2 px-3">{sem.semesterNum}</td>
                  <td className="py-2 px-3">{(sem.units || []).length}</td>
                  <td className="py-2 px-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSemesterId(sem.id);
                        resetUnitForm();
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setSelectedSemesterId(null)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium self-start"
            >
              ← Back to Semesters
            </button>
            {renderUnitsView()}
          </div>
        )}
      </div>
    );
  };

  // View: Units
  const renderUnitsView = () => {
    if (!selectedCourseId || !selectedYearId || !selectedSemesterId) return null;
    const semester = getSemester(selectedCourseId, selectedYearId, selectedSemesterId);
    if (!semester) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Units
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Name
            </label>
            <input
              type="text"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              placeholder="e.g. Introduction to Programming"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Code
            </label>
            <input
              type="text"
              value={unitCode}
              onChange={(e) => setUnitCode(e.target.value)}
              placeholder="e.g. CS1010L"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => addSingleUnit(selectedCourseId, selectedYearId, selectedSemesterId)}
          disabled={!unitCode || !unitName}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition"
        >
          Add Unit
        </button>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bulk Add Units (CSV format: code,name)
          </label>
          <textarea
            value={bulkUnitCsv}
            onChange={(e) => setBulkUnitCsv(e.target.value)}
            placeholder={`CS1010L,Introduction to Programming&#10;CS2030,Data Structures&#10;MA1010,C Mathematics`}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter one unit per line: code, name
          </p>
        </div>

        <button
          type="button"
          onClick={() => addUnitsFromCsv(selectedCourseId, selectedYearId, selectedSemesterId)}
          disabled={!bulkUnitCsv.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition"
        >
          Add Units from CSV
        </button>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-3 font-medium text-gray-700">Unit Name</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Unit Code</th>
                <th className="w-1"></th>
              </tr>
            </thead>
            <tbody>
              {semester.units.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 px-3 text-gray-500 text-center">
                    No units added yet.
                  </td>
                </tr>
              ) : (
                semester.units.map((unit) => (
                  <tr key={unit.id} className="border-t border-gray-100">
                    <td className="py-2 px-3">{unit.name}</td>
                    <td className="py-2 px-3">{unit.code}</td>
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        onClick={() =>
                          deleteUnit(selectedCourseId, selectedYearId, selectedSemesterId, unit.id)
                        }
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
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
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {view !== "courses" && (
            <button
              type="button"
              onClick={() => {
                setView("courses");
                setSelectedCourseId(null);
                setSelectedYearId(null);
                setSelectedSemesterId(null);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Courses
            </button>
          )}
          {view === "years" && selectedCourseId && (
            <button
              type="button"
              onClick={() => setView("courses")}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back
            </button>
          )}
          {view === "semesters" && selectedCourseId && selectedYearId && (
            <button
              type="button"
              onClick={() => setView("years")}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back
            </button>
          )}
        </div>
        <span className="text-sm text-gray-500">
          {data.length} course{data.length !== 1 ? "s" : ""}, {totalUnits} unit
          {totalUnits !== 1 ? "s" : ""}
        </span>
      </div>

      {view === "courses" && renderCoursesView()}
      {view === "years" && selectedCourseId && renderYearsView()}
      {view === "semesters" && selectedCourseId && selectedYearId && renderSemestersView()}
    </div>
  );
}
