"use client";

import React, { useState } from "react";
import {
  BookOpen,
  GraduationCap,
  MoreVertical,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AcademicCourse, AcademicSemester, AcademicYear } from "../../../types/setup-academic";

interface CourseTreeNavigatorProps {
  courses: AcademicCourse[];
  selectedCourseId: string | null;
  onSelectCourse: (courseId: string) => void;
  onAddCourse: (newCourse: AcademicCourse) => void;
  onUpdateCourse: (updatedCourse: AcademicCourse) => void;
  onDeleteCourse: (courseId: string) => void;
}

const generateDefaultSemesters = (
  courseId: string,
  yearNumber: number,
): AcademicSemester[] => [
  {
    id: `sem-${courseId}-${yearNumber}-1-${Date.now()}`,
    name: "Semester 1",
    semesterNum: 1,
    yearId: `year-${courseId}-${yearNumber}`,
    units: [],
  },
  {
    id: `sem-${courseId}-${yearNumber}-2-${Date.now()}`,
    name: "Semester 2",
    semesterNum: 2,
    yearId: `year-${courseId}-${yearNumber}`,
    units: [],
  },
];

export function CourseTreeNavigator({
  courses,
  selectedCourseId,
  onSelectCourse,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
}: CourseTreeNavigatorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseDuration, setNewCourseDuration] = useState(4);

  const [editingCourse, setEditingCourse] = useState<AcademicCourse | null>(null);

  const filteredCourses = courses.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;

    const courseId = `course-${Date.now()}`;
    const years: AcademicYear[] = [];

    for (let y = 1; y <= newCourseDuration; y++) {
      const yearId = `year-${courseId}-${y}`;
      years.push({
        id: yearId,
        yearNumber: y,
        courseId,
        semesters: generateDefaultSemesters(courseId, y),
      });
    }

    const createdCourse: AcademicCourse = {
      id: courseId,
      name: newCourseName.trim(),
      duration: newCourseDuration,
      years,
    };

    onAddCourse(createdCourse);
    setNewCourseName("");
    setNewCourseDuration(4);
    setIsAddOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || !editingCourse.name.trim()) return;

    const duration = Math.max(1, editingCourse.duration || 1);
    const existingYears = editingCourse.years || [];

    const updatedYears: AcademicYear[] = Array.from({ length: duration }, (_, idx) => {
      const yearNum = idx + 1;
      const foundYear = existingYears.find((y) => y.yearNumber === yearNum);
      if (foundYear) {
        return foundYear;
      }
      return {
        id: `year-${editingCourse.id}-${yearNum}-${Date.now()}`,
        yearNumber: yearNum,
        courseId: editingCourse.id,
        semesters: generateDefaultSemesters(editingCourse.id, yearNum),
      };
    });

    onUpdateCourse({
      ...editingCourse,
      name: editingCourse.name.trim(),
      duration,
      years: updatedYears,
    });
    setEditingCourse(null);
  };

  return (
    <div className="flex h-full flex-col bg-white text-[10.5px]">
      {/* Header with Search and Add Action */}
      <div className="border-b border-slate-100 p-2 space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            <GraduationCap className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <h3 className="font-bold text-slate-900 text-[11px] truncate">
              Programs ({courses.length})
            </h3>
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={<Button size="sm" className="h-5.5 gap-0.5 text-[9.5px] px-1.5" />}>
              <Plus className="h-2.5 w-2.5" />
              Add
            </DialogTrigger>
            <DialogContent className="sm:max-w-xs p-3.5 text-xs">
              <DialogHeader>
                <DialogTitle className="text-xs font-bold">
                  Add Academic Program
                </DialogTitle>
                <DialogDescription className="text-[10px]">
                  Create a new degree or certificate structure.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateCourse} className="space-y-2 py-1">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-medium text-slate-700">
                    Program / Degree Name
                  </label>
                  <Input
                    required
                    placeholder="e.g. B.Sc. Computer Science"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    className="h-7 text-xs md:text-[11px]"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-medium text-slate-700">
                    Duration (Years)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={8}
                    required
                    value={newCourseDuration}
                    onChange={(e) =>
                      setNewCourseDuration(parseInt(e.target.value, 10) || 1)
                    }
                    className="h-7 text-xs md:text-[11px]"
                  />
                </div>

                <DialogFooter className="pt-1 gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-6 text-[10px]"
                    disabled={!newCourseName.trim()}
                  >
                    Create Program
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute top-1.5 left-2 h-3 w-3 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="h-6.5 pl-6 text-[10px] md:text-[10px] bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* Dense Program List */}
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {filteredCourses.length === 0 ? (
          <div className="p-3 text-center text-[10px] text-slate-400">
            {courses.length === 0
              ? "No programs yet."
              : "No matches."}
          </div>
        ) : (
          filteredCourses.map((course) => {
            const isSelected = course.id === selectedCourseId;
            const totalUnits = (course.years || []).reduce(
              (sum, y) =>
                sum +
                (y.semesters || []).reduce(
                  (semSum, s) => semSum + (s.units || []).length,
                  0,
                ),
              0,
            );

            return (
              <div
                key={course.id}
                onClick={() => onSelectCourse(course.id)}
                className={`group relative flex cursor-pointer flex-col rounded-md px-2 py-1.5 text-left transition ${
                  isSelected
                    ? "bg-blue-50 text-blue-950 ring-1 ring-blue-200 font-bold"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <BookOpen
                      className={`h-3 w-3 shrink-0 ${
                        isSelected ? "text-blue-600" : "text-slate-400"
                      }`}
                    />
                    <span className="truncate text-[10.5px]">
                      {course.name}
                    </span>
                  </div>

                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 transition shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => setEditingCourse({ ...course })}
                      className="rounded p-0.5 text-slate-400 hover:text-slate-700"
                      title="Edit program"
                    >
                      <MoreVertical className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-0.5 flex items-center justify-between text-[9px] text-slate-500 font-normal">
                  <span>{course.duration}Y</span>
                  <span
                    className={`rounded px-1 py-0.1 text-[8.5px] ${
                      isSelected
                        ? "bg-blue-600 text-white font-semibold"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {totalUnits}u
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Course Dialog */}
      {editingCourse && (
        <Dialog
          open={Boolean(editingCourse)}
          onOpenChange={(open) => !open && setEditingCourse(null)}
        >
          <DialogContent className="sm:max-w-xs p-3 text-xs">
            <DialogHeader>
              <DialogTitle className="text-xs font-bold">
                Edit Program
              </DialogTitle>
              <DialogDescription className="text-[10px]">
                Update name or duration.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEdit} className="space-y-2 py-1">
              <div className="space-y-0.5">
                <label className="text-[10px] font-medium text-slate-700">
                  Program Name
                </label>
                <Input
                  required
                  value={editingCourse.name}
                  onChange={(e) =>
                    setEditingCourse({ ...editingCourse, name: e.target.value })
                  }
                  className="h-7 text-xs"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-medium text-slate-700">
                  Duration (Years)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  required
                  value={editingCourse.duration}
                  onChange={(e) =>
                    setEditingCourse({
                      ...editingCourse,
                      duration: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="h-7 text-xs"
                />
              </div>

              <DialogFooter className="flex justify-between sm:justify-between pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-red-600 hover:bg-red-50 px-1.5"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete "${editingCourse.name}" and all units?`,
                      )
                    ) {
                      onDeleteCourse(editingCourse.id);
                      setEditingCourse(null);
                    }
                  }}
                >
                  <Trash2 className="mr-0.5 h-2.5 w-2.5" />
                  Delete
                </Button>

                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() => setEditingCourse(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="h-6 text-[10px]">
                    Save
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
