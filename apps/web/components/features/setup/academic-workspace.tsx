"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Menu,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type {
  AcademicCourse,
  AcademicSemester,
  AcademicUnit,
  AcademicYear,
} from "../../../types/setup-academic";
import { CourseTreeNavigator } from "./course-tree-navigator";
import { InlineSemesterTable } from "./inline-semester-table";
import { QuickImportModal } from "./quick-import-modal";

interface AcademicWorkspaceProps {
  courses: AcademicCourse[];
  onCoursesChange: (courses: AcademicCourse[]) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  saveMessage: string | null;
  institutionName?: string;
}

export function AcademicWorkspace({
  courses,
  onCoursesChange,
  onSave,
  isSaving,
  saveMessage,
  institutionName: _institutionName,
}: AcademicWorkspaceProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(
    courses[0]?.id ?? null,
  );
  const [selectedYearNumber, setSelectedYearNumber] = useState<number>(1);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const activeCourse = useMemo(() => {
    return (
      courses.find((c) => c.id === selectedCourseId) ||
      courses[0] ||
      null
    );
  }, [courses, selectedCourseId]);

  const activeYear = useMemo(() => {
    if (!activeCourse) return null;
    return (
      activeCourse.years?.find((y) => y.yearNumber === selectedYearNumber) ||
      activeCourse.years?.[0] ||
      null
    );
  }, [activeCourse, selectedYearNumber]);

  const stats = useMemo(() => {
    const totalCourses = courses.length;
    let totalYears = 0;
    let totalSemesters = 0;
    let totalUnits = 0;

    courses.forEach((c) => {
      totalYears += c.years?.length ?? 0;
      (c.years ?? []).forEach((y) => {
        totalSemesters += y.semesters?.length ?? 0;
        (y.semesters ?? []).forEach((s) => {
          totalUnits += s.units?.length ?? 0;
        });
      });
    });

    return { totalCourses, totalYears, totalSemesters, totalUnits };
  }, [courses]);

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedYearNumber(1);
    setIsMobileNavOpen(false);
  };

  const handleAddCourse = (newCourse: AcademicCourse) => {
    const nextCourses = [...courses, newCourse];
    onCoursesChange(nextCourses);
    setSelectedCourseId(newCourse.id);
    setSelectedYearNumber(1);
  };

  const handleUpdateCourse = (updatedCourse: AcademicCourse) => {
    const nextCourses = courses.map((c) =>
      c.id === updatedCourse.id ? updatedCourse : c,
    );
    onCoursesChange(nextCourses);
  };

  const handleDeleteCourse = (courseId: string) => {
    const nextCourses = courses.filter((c) => c.id !== courseId);
    onCoursesChange(nextCourses);
    if (selectedCourseId === courseId) {
      setSelectedCourseId(nextCourses[0]?.id ?? null);
      setSelectedYearNumber(1);
    }
  };

  const handleSemesterUnitsChange = (
    yearId: string,
    semesterId: string,
    nextUnits: AcademicUnit[],
  ) => {
    if (!activeCourse) return;

    const nextYears = (activeCourse.years ?? []).map((year) => {
      if (year.id !== yearId) return year;
      return {
        ...year,
        semesters: (year.semesters ?? []).map((sem) => {
          if (sem.id !== semesterId) return sem;
          return { ...sem, units: nextUnits };
        }),
      };
    });

    handleUpdateCourse({ ...activeCourse, years: nextYears });
  };

  const handleSemesterNameChange = (
    yearId: string,
    semesterId: string,
    newName: string,
  ) => {
    if (!activeCourse) return;

    const nextYears = (activeCourse.years ?? []).map((year) => {
      if (year.id !== yearId) return year;
      return {
        ...year,
        semesters: (year.semesters ?? []).map((sem) => {
          if (sem.id !== semesterId) return sem;
          return { ...sem, name: newName };
        }),
      };
    });

    handleUpdateCourse({ ...activeCourse, years: nextYears });
  };

  const handleAddSemester = (yearId: string) => {
    if (!activeCourse) return;

    const nextYears = (activeCourse.years ?? []).map((year) => {
      if (year.id !== yearId) return year;
      const nextSemNum = (year.semesters?.length ?? 0) + 1;
      const newSem: AcademicSemester = {
        id: `sem-${activeCourse.id}-${year.yearNumber}-${nextSemNum}-${Date.now()}`,
        name: `Semester ${nextSemNum}`,
        semesterNum: nextSemNum,
        yearId: year.id,
        units: [],
      };
      return {
        ...year,
        semesters: [...(year.semesters ?? []), newSem],
      };
    });

    handleUpdateCourse({ ...activeCourse, years: nextYears });
  };

  const handleDeleteSemester = (yearId: string, semesterId: string) => {
    if (!activeCourse) return;

    const nextYears = (activeCourse.years ?? []).map((year) => {
      if (year.id !== yearId) return year;
      return {
        ...year,
        semesters: (year.semesters ?? []).filter((s) => s.id !== semesterId),
      };
    });

    handleUpdateCourse({ ...activeCourse, years: nextYears });
  };

  const handleAddYear = () => {
    if (!activeCourse) return;
    const nextYearNumber = (activeCourse.years?.length ?? 0) + 1;
    const yearId = `year-${activeCourse.id}-${nextYearNumber}-${Date.now()}`;
    const newYear: AcademicYear = {
      id: yearId,
      yearNumber: nextYearNumber,
      courseId: activeCourse.id,
      semesters: [
        {
          id: `sem-${activeCourse.id}-${nextYearNumber}-1-${Date.now()}`,
          name: "Semester 1",
          semesterNum: 1,
          yearId,
          units: [],
        },
        {
          id: `sem-${activeCourse.id}-${nextYearNumber}-2-${Date.now()}`,
          name: "Semester 2",
          semesterNum: 2,
          yearId,
          units: [],
        },
      ],
    };

    handleUpdateCourse({
      ...activeCourse,
      duration: Math.max(activeCourse.duration, nextYearNumber),
      years: [...(activeCourse.years ?? []), newYear],
    });
    setSelectedYearNumber(nextYearNumber);
  };

  const handleDataImported = (
    importedCourses: AcademicCourse[],
    mode: "merge" | "replace",
  ) => {
    if (mode === "replace") {
      onCoursesChange(importedCourses);
      setSelectedCourseId(importedCourses[0]?.id ?? null);
      setSelectedYearNumber(1);
    } else {
      const merged = [...courses];
      for (const imported of importedCourses) {
        const idx = merged.findIndex(
          (c) => c.name.toLowerCase() === imported.name.toLowerCase(),
        );
        if (idx >= 0) {
          merged[idx] = imported;
        } else {
          merged.push(imported);
        }
      }
      onCoursesChange(merged);
      if (!selectedCourseId && importedCourses[0]) {
        setSelectedCourseId(importedCourses[0].id);
        setSelectedYearNumber(1);
      }
    }
  };

  const exportAsCsv = () => {
    const rows = [
      ["courseName", "duration", "yearNumber", "semesterNumber", "unitCode", "unitName"],
    ];

    courses.forEach((c) => {
      (c.years ?? []).forEach((y) => {
        (y.semesters ?? []).forEach((s) => {
          if ((s.units ?? []).length === 0) {
            rows.push([c.name, String(c.duration), String(y.yearNumber), String(s.semesterNum), "", ""]);
          } else {
            (s.units ?? []).forEach((u) => {
              rows.push([
                c.name,
                String(c.duration),
                String(y.yearNumber),
                String(s.semesterNum),
                u.code,
                u.name,
              ]);
            });
          }
        });
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.map((val) => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `academic_setup_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-1.5 text-[10.5px]">
      {/* Top Bar: Compact Stats & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-2xs">
        {/* Left Stats Pills */}
        <div className="flex items-center gap-1.5">
          <div className="lg:hidden">
            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
              <SheetTrigger render={<Button variant="outline" size="sm" className="h-5.5 gap-0.5 text-[9.5px] px-1.5" />}>
                <Menu className="h-2.5 w-2.5" />
                <span>Programs ({courses.length})</span>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-60">
                <SheetHeader className="sr-only">
                  <SheetTitle>Academic Programs</SheetTitle>
                </SheetHeader>
                <CourseTreeNavigator
                  courses={courses}
                  selectedCourseId={activeCourse?.id ?? null}
                  onSelectCourse={handleSelectCourse}
                  onAddCourse={handleAddCourse}
                  onUpdateCourse={handleUpdateCourse}
                  onDeleteCourse={handleDeleteCourse}
                />
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-600">
            <span className="rounded bg-blue-50 px-1 py-0.1 font-bold text-blue-700">
              {stats.totalCourses} Programs
            </span>
            <span>•</span>
            <span className="text-slate-600">
              {stats.totalYears} Years
            </span>
            <span>•</span>
            <span className="text-slate-600">
              {stats.totalSemesters} Semesters
            </span>
            <span>•</span>
            <span className="rounded bg-emerald-50 px-1 py-0.1 font-bold text-emerald-700">
              {stats.totalUnits} Units
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          {saveMessage && (
            <span
              className={`text-[9.5px] font-semibold ${
                saveMessage.includes("successfully")
                  ? "text-emerald-600"
                  : "text-amber-700"
              }`}
            >
              {saveMessage}
            </span>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsImportOpen(true)}
            className="h-5.5 gap-0.5 text-[9.5px] px-1.5"
          >
            <FileSpreadsheet className="h-2.5 w-2.5 text-blue-600" />
            <span>Import</span>
          </Button>

          {courses.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportAsCsv}
              className="h-5.5 gap-0.5 text-[9.5px] px-1.5 text-slate-600"
            >
              <Download className="h-2.5 w-2.5" />
              <span>Export</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving || courses.length === 0}
            className="h-5.5 gap-1 bg-blue-600 text-[10px] font-bold text-white shadow-2xs hover:bg-blue-700 disabled:opacity-50 px-2"
          >
            <Save className="h-2.5 w-2.5" />
            {isSaving ? "Saving..." : "Save Setup"}
          </Button>
        </div>
      </div>

      {/* Main Workspace Layout - Narrow 2-col left sidebar and wide 10-col right area */}
      <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-12">
        {/* Left Sidebar: Narrower Navigator */}
        <div className="hidden lg:col-span-2 xl:col-span-2 lg:block">
          <div className="sticky top-12 overflow-hidden rounded-lg border border-slate-200 shadow-2xs bg-white">
            <div className="h-[calc(100vh-6.5rem)] min-h-[420px]">
              <CourseTreeNavigator
                courses={courses}
                selectedCourseId={activeCourse?.id ?? null}
                onSelectCourse={handleSelectCourse}
                onAddCourse={handleAddCourse}
                onUpdateCourse={handleUpdateCourse}
                onDeleteCourse={handleDeleteCourse}
              />
            </div>
          </div>
        </div>

        {/* Right Area: Selected Year & 2 Expanded Semesters (Takes 10 columns!) */}
        <div className="lg:col-span-10 xl:col-span-10 space-y-1.5">
          {!activeCourse ? (
            <Card className="border-dashed border-slate-200 bg-white/70">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <GraduationCap className="h-6 w-6 text-slate-300 mb-1" />
                <h3 className="text-xs font-bold text-slate-800">
                  No academic program selected
                </h3>
                <p className="mt-0.5 max-w-sm text-[9.5px] text-slate-500">
                  Add your first program or import a spreadsheet to start.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsImportOpen(true)}
                  className="mt-2 h-5.5 gap-0.5 text-[9.5px]"
                >
                  <Plus className="h-2.5 w-2.5" />
                  Add Program
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {/* Program Header with Year Selector Tabs */}
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-100 pb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate text-[11.5px] font-bold text-slate-900">
                      {activeCourse.name}
                    </span>
                    <span className="rounded bg-blue-50 px-1 py-0.1 text-[9px] font-bold text-blue-700">
                      {activeCourse.duration}Y Degree
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddYear}
                    className="flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    Add Year
                  </button>
                </div>

                {/* Year Selectors */}
                <div className="flex items-center gap-1 overflow-x-auto pt-0.5">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">
                    Year:
                  </span>
                  {(activeCourse.years ?? []).map((year) => {
                    const isSelected = year.yearNumber === activeYear?.yearNumber;
                    const yearUnits = (year.semesters ?? []).reduce(
                      (sum, s) => sum + (s.units ?? []).length,
                      0,
                    );

                    return (
                      <button
                        key={year.id}
                        type="button"
                        onClick={() => setSelectedYearNumber(year.yearNumber)}
                        className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold transition ${
                          isSelected
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"
                        }`}
                      >
                        <span>Year {year.yearNumber}</span>
                        <span
                          className={`rounded px-1 py-0.1 text-[8.5px] ${
                            isSelected
                              ? "bg-slate-800 text-blue-300 font-semibold"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {yearUnits}u
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2 Expanded Semesters for Active Year */}
              {activeYear && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-0.5">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Year {activeYear.yearNumber} Semesters
                    </h3>

                    <button
                      type="button"
                      onClick={() => handleAddSemester(activeYear.id)}
                      className="flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 hover:underline"
                    >
                      <Plus className="h-2.5 w-2.5" />
                      Add Semester
                    </button>
                  </div>

                  {(activeYear.semesters ?? []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-white p-5 text-center text-[10.5px] text-slate-500">
                      No semesters in Year {activeYear.yearNumber}. Click{" "}
                      <strong>Add Semester</strong> to begin.
                    </div>
                  ) : (
                    /* 2 Equal Columns Expanded Generously to Fit Full Space */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                      {(activeYear.semesters ?? []).map((semester) => (
                        <div key={semester.id} className="min-w-0">
                          <InlineSemesterTable
                            semester={semester}
                            courseId={activeCourse.id}
                            yearId={activeYear.id}
                            onUnitsChange={(nextUnits) =>
                              handleSemesterUnitsChange(
                                activeYear.id,
                                semester.id,
                                nextUnits,
                              )
                            }
                            onSemesterNameChange={(newName) =>
                              handleSemesterNameChange(
                                activeYear.id,
                                semester.id,
                                newName,
                              )
                            }
                            onDeleteSemester={() =>
                              handleDeleteSemester(activeYear.id, semester.id)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Import Modal */}
      <QuickImportModal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onDataImported={handleDataImported}
      />
    </div>
  );
}
