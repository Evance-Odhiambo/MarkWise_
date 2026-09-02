"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Calendar,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  Globe,
  GraduationCap,
  MapPin,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RoleWorkspaceShell } from "@/components/layout/role-workspace-shell";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface StudentSession {
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  course?: string;
  admissionNumber?: string;
  institutionId?: string;
  institutionName?: string;
}

interface AttendanceAnalytics {
  total: number;
  inPerson: number;
  online: number;
  trend: Array<{ date: string; count: number }>;
  units: Array<{ unitCode: string; count: number }>;
  currentSemester: { name: string; unitsTotal: number; unitsEnrolled: number };
  health: {
    conducted: number;
    attended: number;
    missed: number;
    projectedPercentage: number;
    goalPercentage: number;
    streak: number;
  };
  unitHealth: Array<{
    unitCode: string;
    unitName: string;
    conducted: number;
    attended: number;
    missed: number;
    percentage: number;
    status: string;
  }>;
  recent: Array<{
    id: string;
    unitCode: string;
    markedAt: string;
    method: string;
    status: string;
  }>;
}

const studentChartConfig = {
  count: {
    label: "Check-ins",
    color: "#10b981",
  },
} satisfies ChartConfig;

export default function StudentDashboardPage() {
  const router = useRouter();
  const [studentProfile, setStudentProfile] = useState<StudentSession | null>(null);
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchLiveStudentData = async (token: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      setError("");

      const profileRes = await fetch("/api/v1/students/me", { headers });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setStudentProfile((prev) => {
          const next = {
            ...prev,
            userId: profileData.userId,
            name: profileData.name,
            email: profileData.email ?? prev?.email,
            admissionNumber: profileData.admissionNumber,
            course: profileData.course,
            institutionId: profileData.institutionId,
            institutionName: profileData.institutionName,
          };
          try {
            const stored = JSON.parse(localStorage.getItem("user") ?? "null") as Record<string, unknown> | null;
            if (stored)
              localStorage.setItem("user", JSON.stringify({ ...stored, ...next }));
          } catch {
            // ignore storage failures
          }
          return next;
        });
      } else if (profileRes.status === 401 || profileRes.status === 403) {
        localStorage.removeItem("user");
        router.push("/student/login");
        return;
      }

      const summaryRes = await fetch("/api/v1/attendance/student/summary", { headers });
      if (summaryRes.ok) {
        const summaryData: AttendanceAnalytics = await summaryRes.json();
        setAnalytics(summaryData);
      } else if (summaryRes.status !== 401 && summaryRes.status !== 403) {
        setError("Unable to load live attendance data.");
      }
    } catch {
      setError("Unable to reach the attendance service.");
    }
  };

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = JSON.parse(
        localStorage.getItem("user") ?? "null",
      ) as (StudentSession & { token?: string }) | null;

      if (!stored?.token || stored.role !== "student") {
        localStorage.removeItem("user");
        router.push("/student/login");
        return;
      }

      setStudentProfile(stored);

      fetchLiveStudentData(stored.token).finally(() => {
        if (!cancelled) setLoading(false);
      });

      const handleFocus = () => {
        if (stored.token) void fetchLiveStudentData(stored.token);
      };

      window.addEventListener("focus", handleFocus);
      return () => {
        cancelled = true;
        window.removeEventListener("focus", handleFocus);
      };
    } catch {
      router.push("/student/login");
    }
  }, [router]);

  const handleRefresh = async () => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("user") ?? "null",
      ) as { token?: string } | null;
      if (stored?.token) {
        setRefreshing(true);
        await fetchLiveStudentData(stored.token);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const displayName = studentProfile?.name || "Student";
  const admissionNumber = studentProfile?.admissionNumber || "ADMISSION ID";
  const courseName = studentProfile?.course || "Academic Program";

  const totalCheckIns = analytics?.total ?? 0;
  const attendedCount = analytics?.health?.attended ?? 0;
  const conductedCount = analytics?.health?.conducted ?? 0;
  const missedCount = analytics?.health?.missed ?? 0;
  const attendanceRate = analytics?.health?.projectedPercentage ?? 0;
  const streakDays = analytics?.health?.streak ?? 0;
  const unitList = analytics?.unitHealth ?? [];
  const recentLogs = analytics?.recent ?? [];
  const trendList = analytics?.trend ?? [];

  const maxWeeklyCount = Math.max(...trendList.map((d) => d.count), 1);
  
  // Sort units by attendance percentage (lowest first to highlight at-risk units)
  const sortedUnits = [...unitList].sort((a, b) => {
    // If both have sessions, sort by percentage (lowest first)
    if (a.conducted > 0 && b.conducted > 0) {
      return a.percentage - b.percentage;
    }
    // Units with sessions come first
    if (a.conducted > 0) return -1;
    if (b.conducted > 0) return 1;
    // Otherwise sort alphabetically
    return a.unitCode.localeCompare(b.unitCode);
  });
  
  // Limit units to 10 for dashboard view
  const displayedUnits = sortedUnits.slice(0, 10);
  const hasMoreUnits = unitList.length > 10;

  return (
    <RoleWorkspaceShell
      role="student"
      eyebrow="Student Workspace"
      title="Attendance Dashboard"
      name={studentProfile?.name}
      email={studentProfile?.email}
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 px-3 text-[10.5px] bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-medium gap-1.5 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Link href="/attend">
            <Button
              size="sm"
              className="h-8 px-4 text-[11px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold gap-1.5 shadow-lg shadow-emerald-500/30"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Mark Attendance</span>
            </Button>
          </Link>
        </div>
      }
    >
      <main className="p-4 sm:p-6 space-y-4 max-w-[1800px] mx-auto bg-gradient-to-br from-emerald-50/30 via-white to-teal-50/20">
        {error ? (
          <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3 text-[11px] text-amber-900 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              {error}
            </div>
          </div>
        ) : null}

        {/* Student Profile Bar */}
        <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 p-5 text-white shadow-lg shadow-emerald-900/20 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-gradient-to-tr from-teal-400/20 to-transparent rounded-full blur-2xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {displayName}
                  </h2>
                  <Badge className="border-emerald-300/30 bg-emerald-400/20 text-white backdrop-blur-sm text-[9px] font-mono px-2 py-0.5">
                    {admissionNumber}
                  </Badge>
                </div>
                <p className="text-[11px] text-emerald-100 mt-1 font-medium">
                  {courseName} · {analytics?.currentSemester?.name || "Current Semester"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Link href="/student/units">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-[11px] border-emerald-300/40 bg-emerald-950/30 text-white hover:bg-emerald-950/50 hover:text-white backdrop-blur-sm gap-1.5 transition-all"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Enrolled Units ({unitList.length})</span>
                </Button>
              </Link>
              <Link href="/student/dashboard/attendance">
                <Button
                  size="sm"
                  className="h-8 px-4 text-[11px] bg-white text-emerald-700 hover:bg-emerald-50 font-bold gap-1.5 shadow-lg shadow-black/10 transition-all"
                >
                  <CalendarCheck2 className="h-3.5 w-3.5" />
                  <span>Full Ledger</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 4-KPI Metric Cards */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 p-4 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/80">
                  Total Check-ins
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono bg-gradient-to-br from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {loading ? "..." : totalCheckIns}
                  </span>
                  <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Verified
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-2.5 text-white shadow-lg shadow-emerald-500/30">
                <CalendarCheck2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-[10px] text-slate-600 border-t border-emerald-100 pt-2 font-medium">
              {analytics?.inPerson ?? 0} In-Person · {analytics?.online ?? 0} Online
            </p>
          </Card>

          <Card className="border-teal-100 bg-gradient-to-br from-white to-teal-50/30 p-4 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600/80">
                  Attendance Rate
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-extrabold font-mono bg-gradient-to-br ${
                      attendanceRate >= 75 ? "from-emerald-600 to-teal-600" : "from-amber-600 to-orange-600"
                    } bg-clip-text text-transparent`}
                  >
                    {loading ? "..." : `${attendanceRate}%`}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    Goal: 75%
                  </span>
                </div>
              </div>
              <div className={`rounded-xl bg-gradient-to-br ${
                attendanceRate >= 75 ? "from-emerald-500 to-teal-500" : "from-amber-500 to-orange-500"
              } p-2.5 text-white shadow-lg ${
                attendanceRate >= 75 ? "shadow-emerald-500/30" : "shadow-amber-500/30"
              }`}>
                <Target className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-[10px] text-slate-600 border-t border-teal-100 pt-2">
              Accumulated attendance across enrolled units
            </p>
          </Card>

          <Card className="border-green-100 bg-gradient-to-br from-white to-green-50/30 p-4 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-600/80">
                  Lectures Attended
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono bg-gradient-to-br from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {loading ? "..." : attendedCount}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-500 font-mono">
                    / {conductedCount}
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 p-2.5 text-white shadow-lg shadow-green-500/30">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-[10px] text-slate-600 border-t border-green-100 pt-2 font-mono">
              Missed: <strong className="text-red-600">{missedCount}</strong>
            </p>
          </Card>

          <Card className="border-amber-100 bg-gradient-to-br from-white to-amber-50/30 p-4 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600/80">
                  Attendance Streak
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono bg-gradient-to-br from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {loading ? "..." : `${streakDays}`}
                  </span>
                  <span className="text-[9px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Flame className="h-2.5 w-2.5 text-orange-500" /> Days
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-2.5 text-white shadow-lg shadow-amber-500/30">
                <Flame className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-[10px] text-slate-600 border-t border-amber-100 pt-2">
              Consecutive days attending lectures
            </p>
          </Card>
        </section>

        {/* Live Course Unit Attendance Breakdown Matrix */}
        <Card className="border-emerald-100/80 bg-white shadow-lg shadow-emerald-900/5 overflow-hidden rounded-2xl">
          <CardHeader className="border-b border-emerald-100/80 px-4 py-3.5 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <div className="rounded-lg bg-emerald-500 p-1.5">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <span>Enrolled Unit Attendance Ledger</span>
                {hasMoreUnits && (
                  <span className="text-[10px] font-normal text-emerald-600">
                    (Showing {displayedUnits.length} of {unitList.length})
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-[10.5px] text-slate-600 mt-1">
                Live attendance audit records per enrolled course unit
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 text-[9px] font-mono px-2 py-1">
                {analytics?.currentSemester?.name || "Semester"} · {unitList.length} Units
              </Badge>
              {hasMoreUnits && (
                <Link href="/student/dashboard/attendance">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-[10px] text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 font-semibold"
                  >
                    View All →
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-[10.5px]">
                Loading live unit attendance metrics...
              </div>
            ) : unitList.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-[11px] space-y-1">
                <p className="font-semibold">No unit enrollment records found.</p>
                <p className="text-[10px] text-slate-400">
                  Please enroll in your semester units to start tracking attendance.
                </p>
                <Link href="/student/units" className="inline-block pt-1 font-bold text-emerald-600 underline">
                  Go to Units Enrollment →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-100/80 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      <th className="py-3 px-4">Unit Code</th>
                      <th className="py-3 px-4">Unit Title</th>
                      <th className="py-3 px-4 text-right">Conducted</th>
                      <th className="py-3 px-4 text-right">Attended</th>
                      <th className="py-3 px-4 text-right">Missed</th>
                      <th className="py-3 px-4 text-right">Attendance Rate</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50 font-sans">
                    {displayedUnits.map((unit) => {
                      const isLow = unit.conducted > 0 && unit.percentage < 75;

                      return (
                        <tr key={unit.unitCode} className="hover:bg-emerald-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold font-mono text-emerald-800 text-[11.5px]">
                            {unit.unitCode}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800 text-[11.5px]">
                            {unit.unitName}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 text-[11px]">
                            {unit.conducted}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold text-[11px]">
                            {unit.attended}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-red-600 text-[11px] font-semibold">
                            {unit.missed}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <span
                                className={`font-mono font-bold text-[12px] ${
                                  isLow ? "text-amber-600" : "text-emerald-700"
                                }`}
                              >
                                {unit.percentage}%
                              </span>
                              <div className="w-16 h-2 rounded-full bg-emerald-100 overflow-hidden hidden sm:block">
                                <div
                                  className={`h-full rounded-full ${
                                    isLow ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"
                                  }`}
                                  style={{ width: `${Math.min(unit.percentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`rounded-lg px-2 py-1 text-[9px] font-bold font-mono border uppercase ${
                                unit.conducted === 0
                                  ? "bg-slate-50 text-slate-600 border-slate-200"
                                  : isLow
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {unit.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {hasMoreUnits && (
              <div className="border-t border-emerald-100 bg-gradient-to-r from-emerald-50/30 to-teal-50/20 p-3.5 text-center">
                <Link href="/student/dashboard/attendance">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-[11px] text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 font-semibold rounded-lg px-4"
                  >
                    View All {unitList.length} Units →
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Attendance Trend Chart */}
        {trendList.length > 0 && (
          <Card className="border-emerald-100/80 bg-white shadow-lg shadow-emerald-900/5 overflow-hidden rounded-2xl">
            <CardHeader className="border-b border-emerald-100/80 px-4 py-3.5 bg-gradient-to-r from-emerald-50/50 to-teal-50/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-500 p-1.5">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <span>Weekly Attendance Trend</span>
                  </CardTitle>
                  <CardDescription className="text-[10.5px] text-slate-600 mt-1">
                    Your check-in activity over the last 7 days
                  </CardDescription>
                </div>
                <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 text-[9px] font-mono px-2 py-1">
                  Last 7 Days
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <ChartContainer config={studentChartConfig} className="h-[200px] w-full">
                <AreaChart
                  data={trendList}
                  margin={{ left: 0, right: 0, top: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => {
                      const dateValue =
                        value == null || (typeof value === "object" && !(value instanceof Date))
                          ? null
                          : new Date(value as string | number | Date);

                      return dateValue && !Number.isNaN(dateValue.getTime())
                        ? dateValue.toLocaleDateString(undefined, {
                            weekday: "short",
                          })
                        : "";
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    allowDecimals={false}
                    width={30}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        labelFormatter={(value) => {
                          const dateValue =
                            value == null || (typeof value === "object" && !(value instanceof Date))
                              ? null
                              : new Date(value as string | number | Date);

                          return dateValue && !Number.isNaN(dateValue.getTime())
                            ? dateValue.toLocaleDateString(undefined, {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                              })
                            : "";
                        }}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-count)"
                    fill="url(#fillCount)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}


      </main>
    </RoleWorkspaceShell>
  );
}
