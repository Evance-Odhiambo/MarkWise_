"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminWorkspaceShell } from "@/components/admin/AdminWorkspaceShell";

type AcademicUnit = {
  id: string;
  code: string;
  name: string;
};

type AcademicSemester = {
  id: string;
  name: string;
  semesterNum: number;
  units: AcademicUnit[];
};

type AcademicYear = {
  id: string;
  yearNumber: number;
  semesters: AcademicSemester[];
};

type AcademicCourse = {
  id: string;
  name: string;
  duration: number;
  years: AcademicYear[];
};

type InstitutionProfile = {
  id: string;
  name: string;
  metadata?: Record<string, unknown> | null;
};

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createEmptyCourse = (): AcademicCourse => ({
  id: makeId(),
  name: "",
  duration: 4,
  years: [
    {
      id: makeId(),
      yearNumber: 1,
      semesters: [
        {
          id: makeId(),
          name: "Semester 1",
          semesterNum: 1,
          units: [
            { id: makeId(), code: "CS101", name: "Introduction to Computing" },
          ],
        },
      ],
    },
  ],
});

const emptyProfile: InstitutionProfile = {
  id: "",
  name: "",
  metadata: null,
};

export default function InstitutionSetupDashboard() {
  const params = useParams<{ institutionId: string }>();
  const institutionId = params?.institutionId ?? "";

  const [institution, setInstitution] =
    useState<InstitutionProfile>(emptyProfile);
  const [courses, setCourses] = useState<AcademicCourse[]>([
    createEmptyCourse(),
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  useEffect(() => {
    const fetchInstitution = async () => {
      try {
        const response = await fetch("/api/v1/institutions", {
          headers: authHeaders(),
        });
        if (!response.ok) throw new Error("Unable to load institutions");
        const result = await response.json();
        const found = (result.institutions ?? []).find(
          (item: InstitutionProfile) => item.id === institutionId,
        );
        if (found) {
          setInstitution(found);
        }
      } catch (error) {
        console.error("Fetch institution failed", error);
      }
    };

    const fetchSetup = async () => {
      try {
        const response = await fetch(
          `/api/v1/institutions/${encodeURIComponent(institutionId)}/setup`,
          {
            headers: authHeaders(),
          },
        );
        if (!response.ok) {
          setCourses([createEmptyCourse()]);
          return;
        }
        const result = await response.json();
        const setupCourses =
          Array.isArray(result.courses) && result.courses.length > 0
            ? result.courses
            : [createEmptyCourse()];
        setCourses(
          setupCourses.map((course: AcademicCourse) => ({
            ...course,
            years: course.years?.length
              ? course.years
              : [
                  {
                    id: makeId(),
                    yearNumber: 1,
                    semesters: [
                      {
                        id: makeId(),
                        name: "Semester 1",
                        semesterNum: 1,
                        units: [],
                      },
                    ],
                  },
                ],
          })),
        );
      } catch (error) {
        console.error("Fetch setup failed", error);
        setCourses([createEmptyCourse()]);
      } finally {
        setLoading(false);
      }
    };

    if (institutionId) {
      void fetchInstitution();
      void fetchSetup();
    }
  }, [institutionId]);

  const stats = useMemo(() => {
    const yearCount = courses.reduce(
      (sum, course) => sum + (course.years?.length ?? 0),
      0,
    );
    const semesterCount = courses.reduce(
      (sum, course) =>
        sum +
        (course.years ?? []).reduce(
          (yearSum, year) => yearSum + (year.semesters ?? []).length,
          0,
        ),
      0,
    );
    const unitCount = courses.reduce(
      (sum, course) =>
        sum +
        (course.years ?? []).reduce(
          (yearSum, year) =>
            yearSum +
            (year.semesters ?? []).reduce(
              (semesterSum, semester) =>
                semesterSum + (semester.units ?? []).length,
              0,
            ),
          0,
        ),
      0,
    );

    return { courseCount: courses.length, yearCount, semesterCount, unitCount };
  }, [courses]);

  const updateCourse = (courseIndex: number, nextCourse: AcademicCourse) => {
    setCourses((current) =>
      current.map((course, index) =>
        index === courseIndex ? nextCourse : course,
      ),
    );
  };

  const addCourse = () => {
    setCourses((current) => [...current, createEmptyCourse()]);
  };

  const removeCourse = (courseIndex: number) => {
    setCourses((current) =>
      current.filter((_, index) => index !== courseIndex),
    );
  };

  const addYear = (courseIndex: number) => {
    const nextYearNumber = (courses[courseIndex]?.years?.length ?? 0) + 1;
    const nextYear: AcademicYear = {
      id: makeId(),
      yearNumber: nextYearNumber,
      semesters: [
        { id: makeId(), name: `Semester 1`, semesterNum: 1, units: [] },
      ],
    };

    setCourses((current) =>
      current.map((course, index) =>
        index === courseIndex
          ? {
              ...course,
              years: [...(course.years ?? []), nextYear],
            }
          : course,
      ),
    );
  };

  const addSemester = (courseIndex: number, yearIndex: number) => {
    setCourses((current) =>
      current.map((course, coursePosition) => {
        if (coursePosition !== courseIndex) return course;
        return {
          ...course,
          years: (course.years ?? []).map((year, yearPosition) => {
            if (yearPosition !== yearIndex) return year;
            const nextSemesterNumber = (year.semesters ?? []).length + 1;
            return {
              ...year,
              semesters: [
                ...(year.semesters ?? []),
                {
                  id: makeId(),
                  name: `Semester ${nextSemesterNumber}`,
                  semesterNum: nextSemesterNumber,
                  units: [],
                },
              ],
            };
          }),
        };
      }),
    );
  };

  const addUnit = (
    courseIndex: number,
    yearIndex: number,
    semesterIndex: number,
  ) => {
    setCourses((current) =>
      current.map((course, coursePosition) => {
        if (coursePosition !== courseIndex) return course;
        return {
          ...course,
          years: (course.years ?? []).map((year, yearPosition) => {
            if (yearPosition !== yearIndex) return year;
            return {
              ...year,
              semesters: (year.semesters ?? []).map(
                (semester, semesterPosition) => {
                  if (semesterPosition !== semesterIndex) return semester;
                  return {
                    ...semester,
                    units: [
                      ...(semester.units ?? []),
                      { id: makeId(), code: "", name: "" },
                    ],
                  };
                },
              ),
            };
          }),
        };
      }),
    );
  };

  const removeUnit = (
    courseIndex: number,
    yearIndex: number,
    semesterIndex: number,
    unitIndex: number,
  ) => {
    setCourses((current) =>
      current.map((course, coursePosition) => {
        if (coursePosition !== courseIndex) return course;
        return {
          ...course,
          years: (course.years ?? []).map((year, yearPosition) => {
            if (yearPosition !== yearIndex) return year;
            return {
              ...year,
              semesters: (year.semesters ?? []).map(
                (semester, semesterPosition) => {
                  if (semesterPosition !== semesterIndex) return semester;
                  return {
                    ...semester,
                    units: (semester.units ?? []).filter(
                      (_, itemIndex) => itemIndex !== unitIndex,
                    ),
                  };
                },
              ),
            };
          }),
        };
      }),
    );
  };

  const saveSetup = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const payload = {
        courses: courses
          .filter((course) => course.name.trim())
          .map((course) => ({
            name: course.name.trim(),
            duration: Number(course.duration) || 1,
            years: (course.years ?? []).map((year) => ({
              yearNumber: Number(year.yearNumber) || 1,
              semesters: (year.semesters ?? []).map((semester) => ({
                name:
                  semester.name.trim() || `Semester ${semester.semesterNum}`,
                semesterNum: Number(semester.semesterNum) || 1,
                units: (semester.units ?? [])
                  .filter((unit) => unit.code.trim() && unit.name.trim())
                  .map((unit) => ({
                    code: unit.code.trim(),
                    name: unit.name.trim(),
                  })),
              })),
            })),
          })),
      };

      const response = await fetch(
        `/api/v1/institutions/${encodeURIComponent(institutionId)}/setup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save school setup");
      }

      setSaveMessage("School setup saved successfully.");
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "Unable to save school setup.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminWorkspaceShell eyebrow="Institution operations" title="School setup">
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  System admin
                </Badge>
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                    School setup dashboard
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {institution.name || "Institution setup"}
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={saveSetup}
                  disabled={saving || !institutionId}
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save setup"}
                </Button>
              </div>
            </div>
          </header>

          {saveMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {saveMessage}
            </div>
          )}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">
                  Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-semibold">
                    {stats.courseCount}
                  </span>
                  <BookOpen className="h-6 w-6 text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">Years</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-semibold">
                    {stats.yearCount}
                  </span>
                  <CalendarDays className="h-6 w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">
                  Semesters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-semibold">
                    {stats.semesterCount}
                  </span>
                  <CheckCircle2 className="h-6 w-6 text-violet-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">Units</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-semibold">
                    {stats.unitCount}
                  </span>
                  <Users className="h-6 w-6 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Institution profile</CardTitle>
              <CardDescription>
                Basic information for the school before academic setup is
                published.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  School name
                </label>
                <Input
                  value={institution.name}
                  readOnly
                  className="bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Short code
                </label>
                <Input placeholder="e.g. MWU" className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Academic year
                </label>
                <Input placeholder="2026/2027" className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Timezone
                </label>
                <Input placeholder="Africa/Nairobi" className="bg-slate-50" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Academic structure
                </h2>
                <p className="text-sm text-slate-500">
                  Create courses, years, semesters, and units for this school.
                </p>
              </div>
              <Button
                className="gap-2 bg-sky-600 text-white hover:bg-sky-700"
                onClick={addCourse}
              >
                <Plus className="h-4 w-4" />
                Add course
              </Button>
            </div>

            {loading ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-slate-500">
                  Loading school setup...
                </CardContent>
              </Card>
            ) : courses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-slate-500">
                  No academic courses yet. Add your first course to begin.
                </CardContent>
              </Card>
            ) : (
              courses.map((course, courseIndex) => (
                <Card key={course.id} className="overflow-hidden">
                  <CardHeader className="border-b border-slate-200 bg-slate-50/80">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Course name
                        </label>
                        <Input
                          value={course.name}
                          onChange={(event) =>
                            updateCourse(courseIndex, {
                              ...course,
                              name: event.target.value,
                            })
                          }
                          placeholder="e.g. Computer Science"
                        />
                      </div>
                      <div className="flex w-full max-w-[180px] flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700">
                          Duration (years)
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={course.duration}
                          onChange={(event) =>
                            updateCourse(courseIndex, {
                              ...course,
                              duration: Number(event.target.value) || 1,
                            })
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => removeCourse(courseIndex)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6 pt-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Years & semesters
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => addYear(courseIndex)}
                      >
                        <Plus className="h-4 w-4" />
                        Add year
                      </Button>
                    </div>

                    {(course.years ?? []).map((year, yearIndex) => (
                      <div
                        key={year.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-sm font-medium text-blue-700">
                              Year {year.yearNumber}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => addSemester(courseIndex, yearIndex)}
                          >
                            <Plus className="h-4 w-4" />
                            Add semester
                          </Button>
                        </div>

                        <div className="space-y-4">
                          {(year.semesters ?? []).map(
                            (semester, semesterIndex) => (
                              <div
                                key={semester.id}
                                className="rounded-xl border border-slate-200 bg-white p-4"
                              >
                                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="flex-1">
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                      Semester name
                                    </label>
                                    <Input
                                      value={semester.name}
                                      onChange={(event) => {
                                        const updated = { ...course };
                                        updated.years = [
                                          ...(course.years ?? []),
                                        ];
                                        updated.years[yearIndex] = { ...year };
                                        updated.years[yearIndex].semesters = [
                                          ...(year.semesters ?? []),
                                        ];
                                        updated.years[yearIndex].semesters[
                                          semesterIndex
                                        ] = {
                                          ...semester,
                                          name: event.target.value,
                                        };
                                        updateCourse(courseIndex, updated);
                                      }}
                                    />
                                  </div>
                                  <div className="w-full max-w-[110px]">
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                      #
                                    </label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={semester.semesterNum}
                                      onChange={(event) => {
                                        const updated = { ...course };
                                        updated.years = [
                                          ...(course.years ?? []),
                                        ];
                                        updated.years[yearIndex] = { ...year };
                                        updated.years[yearIndex].semesters = [
                                          ...(year.semesters ?? []),
                                        ];
                                        updated.years[yearIndex].semesters[
                                          semesterIndex
                                        ] = {
                                          ...semester,
                                          semesterNum:
                                            Number(event.target.value) || 1,
                                        };
                                        updateCourse(courseIndex, updated);
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="mb-3 flex items-center justify-between">
                                  <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                                    Units
                                  </h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() =>
                                      addUnit(
                                        courseIndex,
                                        yearIndex,
                                        semesterIndex,
                                      )
                                    }
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add unit
                                  </Button>
                                </div>

                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Unit code</TableHead>
                                      <TableHead>Unit name</TableHead>
                                      <TableHead className="w-20 text-right">
                                        Action
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(semester.units ?? []).length === 0 ? (
                                      <TableRow>
                                        <TableCell
                                          colSpan={3}
                                          className="py-6 text-center text-sm text-slate-500"
                                        >
                                          No units yet for this semester.
                                        </TableCell>
                                      </TableRow>
                                    ) : (
                                      (semester.units ?? []).map(
                                        (unit, unitIndex) => (
                                          <TableRow key={unit.id}>
                                            <TableCell>
                                              <Input
                                                value={unit.code}
                                                onChange={(event) => {
                                                  const updated = { ...course };
                                                  updated.years = [
                                                    ...(course.years ?? []),
                                                  ];
                                                  updated.years[yearIndex] = {
                                                    ...year,
                                                  };
                                                  updated.years[
                                                    yearIndex
                                                  ].semesters = [
                                                    ...(year.semesters ?? []),
                                                  ];
                                                  updated.years[
                                                    yearIndex
                                                  ].semesters[semesterIndex] = {
                                                    ...semester,
                                                  };
                                                  updated.years[
                                                    yearIndex
                                                  ].semesters[
                                                    semesterIndex
                                                  ].units = [
                                                    ...(semester.units ?? []),
                                                  ];
                                                  updated.years[
                                                    yearIndex
                                                  ].semesters[
                                                    semesterIndex
                                                  ].units[unitIndex] = {
                                                    ...unit,
                                                    code: event.target.value,
                                                  };
                                                  updateCourse(
                                                    courseIndex,
                                                    updated,
                                                  );
                                                }}
                                                placeholder="CS101"
                                              />
                                            </TableCell>
                                            <TableCell>
                                              <Input
                                                value={unit.name}
                                                onChange={(event) => {
                                                  const updated = { ...course };
                                                  updated.years = [
                                                    ...(course.years ?? []),
                                                  ];
                                                  updated.years[yearIndex] = {
                                                    ...year,
                                                  };
                                                  updated.years[
                                                    yearIndex
                                                  ].semesters = [
                                                    ...(year.semesters ?? []),
                                                  ];
                                                  updated.years[
                                                    yearIndex
                                                  ].semesters[semesterIndex] = {
                                                    ...semester,
                                                  };
                                                  updated.years[
                                                    yearIndex
                                                  ].semesters[
                                                    semesterIndex
                                                  ].units = [
                                                    ...(semester.units ?? []),
                                                  ];
                                                  updated.years[
                                                    yearIndex
                                                  ].semesters[
                                                    semesterIndex
                                                  ].units[unitIndex] = {
                                                    ...unit,
                                                    name: event.target.value,
                                                  };
                                                  updateCourse(
                                                    courseIndex,
                                                    updated,
                                                  );
                                                }}
                                                placeholder="Introduction to Computing"
                                              />
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                onClick={() =>
                                                  removeUnit(
                                                    courseIndex,
                                                    yearIndex,
                                                    semesterIndex,
                                                    unitIndex,
                                                  )
                                                }
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                        ),
                                      )
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </AdminWorkspaceShell>
  );
}
