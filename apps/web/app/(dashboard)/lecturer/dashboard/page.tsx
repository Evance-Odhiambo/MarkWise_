"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  Zap,
  Award,
  Activity,
  Radio,
  Video,
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
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";


interface LecturerSession {
  userId?: string;
  token?: string;
  name?: string;
  email?: string;
  staffNumber?: string;
  role?: string;
  institutionId?: string;
  institutionName?: string;
}

interface LecturerUnit {
  id: string;
  code: string;
  name: string;
}

interface LecturerAnalytics {
  totals: {
    sessions: number;
    checkIns: number;
    units: number;
  };
  trend?: Array<{
    date: string;
    sessions: number;
    checkIns: number;
  }>;
  units: Array<{
    unitCode: string;
    unitName: string;
    sessions: number;
    checkIns: number;
    averageAttendance: number;
    lastSession?: string;
  }>;
  // Combines both ConductedSession (in-person) and OnlineAttendanceSession
  // (online) records — see getLecturerSummary in attendance.route.ts.
  recent: Array<{
    id: string;
    unitCode: string;
    createdAt: string;
    checkIns: number;
    method: "inPerson" | "online";
    status: string;
  }>;
}

const lecturerChartConfig = {
  checkIns: {
    label: "Check-ins",
    color: "#0ea5e9",
  },
  sessions: {
    label: "Sessions",
    color: "#8b5cf6",
  },
  averageAttendance: {
    label: "Avg Attendance",
    color: "#0ea5e9",
  },
} satisfies ChartConfig;


export default function LecturerDashboardPage() {
  const router = useRouter();
  const [lecturerProfile, setLecturerProfile] = useState<LecturerSession | null>(null);
  const [units, setUnits] = useState<LecturerUnit[]>([]);
  const [analytics, setAnalytics] = useState<LecturerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchLiveLecturerData = async (token: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      setError("");

      const [unitsResponse, analyticsResponse] = await Promise.all([
        fetch("/api/v1/lecturers/units", { headers }),
        fetch("/api/v1/attendance/lecturer/summary", { headers }),
      ]);

      if (unitsResponse.status === 401 || unitsResponse.status === 403) {
        localStorage.removeItem("user");
        router.push("/lecturer/login");
        return;
      }

      const unitsResult = unitsResponse.ok
        ? await unitsResponse.json()
        : { units: [] };
      const analyticsResult = analyticsResponse.ok
        ? await analyticsResponse.json()
        : null;

      setUnits(Array.isArray(unitsResult.units) ? unitsResult.units : []);
      setAnalytics(analyticsResult);
    } catch {
      setError("Unable to reach the attendance service.");
    }
  };

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = JSON.parse(
        localStorage.getItem("user") ?? "null",
      ) as (LecturerSession & { token?: string }) | null;

      if (!stored?.token || stored.role !== "lecturer") {
        localStorage.removeItem("user");
        router.push("/lecturer/login");
        return;
      }

      setLecturerProfile(stored);

      fetchLiveLecturerData(stored.token).finally(() => {
        if (!cancelled) setLoading(false);
      });

      const handleFocus = () => {
        if (stored.token) void fetchLiveLecturerData(stored.token);
      };

      window.addEventListener("focus", handleFocus);
      return () => {
        cancelled = true;
        window.removeEventListener("focus", handleFocus);
      };
    } catch {
      router.push("/lecturer/login");
    }
  }, [router]);

  const handleRefresh = async () => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("user") ?? "null",
      ) as { token?: string } | null;
      if (stored?.token) {
        setRefreshing(true);
        await fetchLiveLecturerData(stored.token);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const displayName = lecturerProfile?.name || "Lecturer";
  const staffNumber = lecturerProfile?.staffNumber || "STAFF ID";

  const totalSessions = analytics?.totals.sessions ?? 0;
  const totalCheckIns = analytics?.totals.checkIns ?? 0;
  const selectedUnits = units.length;
  const averageAttendance = totalSessions > 0 
    ? Math.round(totalCheckIns / totalSessions) 
    : 0;

  const recentSessions = (analytics?.recent ?? []).slice(0, 5);
  const unitList = analytics?.units ?? [];

  // Sort units by activity (most sessions and check-ins first)
  const sortedUnits = [...unitList].sort((a, b) => {
    // Sort by sessions first, then by check-ins
    if (b.sessions !== a.sessions) {
      return b.sessions - a.sessions;
    }
    return b.checkIns - a.checkIns;
  });
  
  // Limit units to 10 for dashboard view
  const displayedUnits = sortedUnits.slice(0, 10);
  const hasMoreUnits = unitList.length > 10;

  return (
    <RoleWorkspaceShell
      role="lecturer"
      eyebrow="Lecturer Workspace"
      title="Attendance Dashboard"
      name={lecturerProfile?.name}
      email={lecturerProfile?.email}
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
          <Link href="/lecturer/attendance/online">
            <Button
              size="sm"
              className="h-8 px-4 text-[11px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold gap-1.5 shadow-lg shadow-emerald-500/30"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Start Session</span>
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

        {/* Lecturer Profile Bar */}
        <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 p-5 text-white shadow-lg shadow-emerald-900/20 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-gradient-to-tr from-teal-400/20 to-transparent rounded-full blur-2xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                <Users className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {displayName}
                  </h2>
                  <Badge className="border-emerald-300/30 bg-emerald-400/20 text-white backdrop-blur-sm text-[9px] font-mono px-2 py-0.5">
                    {staffNumber}
                  </Badge>
                </div>
                <p className="text-[11px] text-emerald-100 mt-1 font-medium">
                  Current Semester: Semester 1
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Link href="/lecturer/attendance/online">
                <Button
                  size="sm"
                  className="h-8 px-4 text-[11px] bg-white text-emerald-700 hover:bg-emerald-50 font-bold gap-1.5 shadow-lg shadow-black/10 transition-all"
                >
                  <CalendarCheck2 className="h-3.5 w-3.5" />
                  <span>Start Session</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 4-KPI Metric Cards */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-sky-100 bg-gradient-to-br from-white to-sky-50/30 p-4 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600/80">
                  Teaching Units
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono bg-gradient-to-br from-sky-600 to-cyan-600 bg-clip-text text-transparent">
                    {loading ? "..." : selectedUnits}
                  </span>
                  <span className="text-[9px] font-semibold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                    Selected
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 p-2.5 text-white shadow-lg shadow-sky-500/30">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-[10px] text-slate-600 border-t border-sky-100 pt-2 font-medium">
              Units available for attendance sessions
            </p>
          </Card>

          <Card className="border-violet-100 bg-gradient-to-br from-white to-violet-50/30 p-4 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600/80">
                  Sessions Conducted
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono bg-gradient-to-br from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    {loading ? "..." : totalSessions}
                  </span>
                  <span className="text-[9px] font-semibold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">
                    Total
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 p-2.5 text-white shadow-lg shadow-violet-500/30">
                <CalendarCheck2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-[10px] text-slate-600 border-t border-violet-100 pt-2 font-mono">
              Completed attendance sessions
            </p>
          </Card>

          <Card className="border-teal-100 bg-gradient-to-br from-white to-teal-50/30 p-4 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600/80">
                  Total Check-ins
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono bg-gradient-to-br from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                    {loading ? "..." : totalCheckIns}
                  </span>
                  <span className="text-[9px] font-semibold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">
                    Verified
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 p-2.5 text-white shadow-lg shadow-teal-500/30">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-[10px] text-slate-600 border-t border-teal-100 pt-2">
              Student attendance records across all sessions
            </p>
          </Card>

          <Card className="border-amber-100 bg-gradient-to-br from-white to-amber-50/30 p-4 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600/80">
                  Avg Attendance
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono bg-gradient-to-br from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {loading ? "..." : averageAttendance}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    per session
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-2.5 text-white shadow-lg shadow-amber-500/30">
                <Target className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-[10px] text-slate-600 border-t border-amber-100 pt-2">
              Average students per attendance session
            </p>
          </Card>
        </section>

        {/* Unit Performance Table */}
        <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-sky-600" />
                <span>Unit Performance Overview</span>
                {hasMoreUnits && (
                  <span className="text-[10px] font-normal text-slate-500">
                    (Showing {displayedUnits.length} of {unitList.length})
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-500">
                Attendance metrics per teaching unit
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800 text-[9px] font-mono">
                {unitList.length} Units
              </Badge>
              {hasMoreUnits && (
                <Link href="/lecturer/units">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] text-sky-700 hover:text-sky-900 hover:bg-sky-50 font-semibold"
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
                Loading unit performance metrics...
              </div>
            ) : unitList.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-[11px] space-y-1">
                <p className="font-semibold">No unit data available yet.</p>
                <p className="text-[10px] text-slate-400">
                  Select your teaching units and conduct attendance sessions.
                </p>
                <Link href="/lecturer/units" className="inline-block pt-1 font-bold text-sky-600 underline">
                  Select Teaching Units →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-[9.5px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2 px-3">Unit Code</th>
                      <th className="py-2 px-3">Unit Name</th>
                      <th className="py-2 px-3 text-right">Sessions</th>
                      <th className="py-2 px-3 text-right">Check-ins</th>
                      <th className="py-2 px-3 text-right">Avg Attendance</th>
                      <th className="py-2 px-3 text-right">Last Session</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {displayedUnits.map((unit) => (
                      <tr key={unit.unitCode} className="hover:bg-sky-50/20 transition-colors">
                        <td className="py-2 px-3 font-bold font-mono text-sky-950 text-[11px]">
                          {unit.unitCode}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800 text-[11px]">
                          {unit.unitName}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600 text-[10.5px]">
                          {unit.sessions}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-900 font-bold text-[10.5px]">
                          {unit.checkIns}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[11px] text-sky-700">
                              {unit.averageAttendance}
                            </span>
                            <span className="text-[9px] text-slate-500">per session</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right text-[10px] text-slate-500 font-mono">
                          {unit.lastSession
                            ? new Date(unit.lastSession).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {hasMoreUnits && (
              <div className="border-t border-slate-100 bg-slate-50/50 p-3 text-center">
                <Link href="/lecturer/units">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[11px] text-sky-700 hover:text-sky-900 hover:bg-sky-50 font-semibold"
                  >
                    View All {unitList.length} Units →
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Attendance Trend Chart */}
          {analytics?.trend && analytics.trend.length > 0 && (
            <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50">
                <div>
                  <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-sky-600" />
                    <span>Attendance Trend</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] text-slate-500">
                    Student check-ins over time
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <ChartContainer config={lecturerChartConfig} className="h-[200px] w-full">
                  <AreaChart
                    data={analytics.trend}
                    margin={{ left: 0, right: 0, top: 8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="fillCheckIns" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-checkIns)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-checkIns)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value: string) =>
                        new Date(value).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      }
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
                            const dateValue = typeof value === 'string' || typeof value === 'number' || value instanceof Date 
                              ? value 
                              : String(value);
                            return new Date(dateValue).toLocaleDateString(undefined, {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            });
                          }}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="checkIns"
                      stroke="var(--color-checkIns)"
                      fill="url(#fillCheckIns)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Unit Performance Chart */}
          {unitList.length > 0 && (
            <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50">
                <div>
                  <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-violet-600" />
                    <span>Unit Performance</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] text-slate-500">
                    Average attendance per unit
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <ChartContainer
                  config={lecturerChartConfig}
                  className="w-full"
                  style={{
                    height: Math.max(200, Math.min(unitList.length * 32, 280)),
                  }}
                >
                  <BarChart
                    data={unitList.slice(0, 8)}
                    layout="vertical"
                    margin={{ left: 0, right: 16, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis
                      dataKey="unitCode"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={60}
                      tick={{ fontSize: 10 }}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value, name, props) => (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {props.payload.unitCode}
                              </span>
                              <span className="font-mono font-medium">
                                {value} students
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Bar
                      dataKey="averageAttendance"
                      fill="var(--color-averageAttendance)"
                      radius={[0, 4, 4, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
            <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50">
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CalendarCheck2 className="h-3.5 w-3.5 text-violet-600" />
                <span>Recent Attendance Sessions</span>
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-500">
                Your latest conducted sessions — in-person and online
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {recentSessions.map((session) => {
                  const isOnline = session.method === "online";
                  const MethodIcon = isOnline ? Video : Radio;
                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between gap-4 py-3 px-3.5 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`rounded-lg p-2 ${isOnline ? "bg-sky-50" : "bg-emerald-50"}`}
                        >
                          <MethodIcon
                            className={`h-4 w-4 ${isOnline ? "text-sky-600" : "text-emerald-600"}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold font-mono text-slate-900 text-[11px]">
                            {session.unitCode}
                            <span className="ml-1.5 font-sans font-normal text-slate-400">
                              {isOnline ? "Online" : "In-person"}
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {new Date(session.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            · {session.checkIns} check-ins
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          session.status === "ended"
                            ? "text-slate-500 border-slate-200 bg-slate-50"
                            : "text-emerald-700 border-emerald-200 bg-emerald-50"
                        }
                      >
                        <span className="text-[8.5px] font-bold font-mono">
                          {session.status === "ended" ? "COMPLETED" : "ACTIVE"}
                        </span>
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </RoleWorkspaceShell>
  );
}
