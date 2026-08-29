"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  Clock3,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RoleWorkspaceShell } from "@/components/workspace/RoleWorkspaceShell";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

interface LecturerUnit {
  id: string;
  code: string;
  name: string;
}
interface OnlineSession {
  id: string;
  unitCode: string;
  expiresAt: string;
  endedAt?: string | null;
  status?: string;
  createdAt?: string;
  _count?: { records: number };
}
interface LecturerSession {
  token?: string;
  name?: string;
  email?: string;
  staffNumber?: string;
}
interface LecturerAnalytics {
  trend: Array<{ date: string; sessions: number; checkIns: number }>;
  units: Array<{
    unitCode: string;
    unitName: string;
    sessions: number;
    checkIns: number;
    averageAttendance: number;
  }>;
  methods: Array<{ method: string; sessions: number; checkIns: number }>;
  totals: { sessions: number; checkIns: number };
  coverage: { selected: number; used: number };
  insights: { highestUnit: string | null; lowestUnit: string | null };
}
const lecturerChartConfig = {
  checkIns: { label: "Check-ins", color: "#0ea5e9" },
  averageAttendance: { label: "Average attendance", color: "#8b5cf6" },
} satisfies ChartConfig;

export default function LecturerDashboardPage() {
  const [user, setUser] = useState<LecturerSession | null>(null);
  const [units, setUnits] = useState<LecturerUnit[]>([]);
  const [sessions, setSessions] = useState<OnlineSession[]>([]);
  const [analytics, setAnalytics] = useState<LecturerAnalytics | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = JSON.parse(
        localStorage.getItem("user") ?? "null",
      ) as LecturerSession | null;
      setUser(stored);
      if (!stored?.token)
        return () => {
          cancelled = true;
        };
      const load = async () => {
        const headers = { Authorization: `Bearer ${stored.token}` };
        const [unitsResponse, sessionsResponse, analyticsResponse] =
          await Promise.all([
            fetch("/api/v1/lecturers/units", { headers }),
            fetch("/api/v1/attendance/online/sessions", { headers }),
            fetch("/api/v1/attendance/lecturer/summary", { headers }),
          ]);
        const unitsResult = unitsResponse.ok
          ? await unitsResponse.json()
          : { units: [] };
        const sessionsResult = sessionsResponse.ok
          ? await sessionsResponse.json()
          : { data: [] };
        const analyticsResult = analyticsResponse.ok
          ? await analyticsResponse.json()
          : null;
        if (!cancelled) {
          setUnits(Array.isArray(unitsResult.units) ? unitsResult.units : []);
          setSessions(
            Array.isArray(sessionsResult.data) ? sessionsResult.data : [],
          );
          setAnalytics(analyticsResult);
        }
      };
      void load().catch(() => {
        if (!cancelled) {
          setUnits([]);
          setSessions([]);
        }
      });
      window.addEventListener("focus", load);
      return () => {
        cancelled = true;
        window.removeEventListener("focus", load);
      };
    } catch {
      setUser(null);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedUnitCodes = new Set(
    units.map((unit) => unit.code.trim().toUpperCase()),
  );
  const selectedSessions = sessions.filter((session) =>
    selectedUnitCodes.has(session.unitCode.trim().toUpperCase()),
  );
  const attendanceByUnit = selectedSessions.reduce((result, session) => {
    const current = result.get(session.unitCode) ?? {
      checkIns: 0,
      sessions: 0,
    };
    result.set(session.unitCode, {
      checkIns: current.checkIns + (session._count?.records ?? 0),
      sessions: current.sessions + 1,
    });
    return result;
  }, new Map<string, { checkIns: number; sessions: number }>());
  const averageAttendance = analytics?.totals.sessions
    ? Math.round(analytics.totals.checkIns / analytics.totals.sessions)
    : attendanceByUnit.size
      ? Math.round([...attendanceByUnit.values()].reduce((sum, unit) => sum + unit.checkIns / unit.sessions, 0) / attendanceByUnit.size)
    : 0;
  const conductedSessions = analytics?.totals.sessions ?? sessions.length;
  const unitsWithSessions = new Set(
    selectedSessions.map((session) => session.unitCode.trim().toUpperCase()),
  ).size;
  const displayName = user?.name || "Lecturer";
  const recentSessions = sessions
    .filter((session) => session.endedAt || session.status === "ended")
    .slice(0, 5);
  const formatDate = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Recently";

  return (
    <RoleWorkspaceShell
      role="lecturer"
      eyebrow="Lecturer workspace"
      title="Overview"
      name={user?.name}
      email={user?.email}
    >
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-6 text-white shadow-xl sm:p-8">
            <div className="relative z-10 max-w-2xl">
              <Badge className="border border-sky-400/30 bg-sky-400/15 text-sky-200 hover:bg-sky-400/15">
                Attendance overview
              </Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Good to see you, {displayName.split(" ")[0]}.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                Select the units you teach, launch secure attendance sessions,
                and keep track of learner participation from one workspace.
              </p>
              <Link
                href={
                  units.length
                    ? "/lecturer/attendance/online"
                    : "/lecturer/units"
                }
                className="mt-6 inline-flex items-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
              >
                {units.length
                  ? "Start attendance session"
                  : "Select teaching units"}{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <Sparkles className="absolute -bottom-10 -right-4 h-56 w-56 text-sky-400/10" />
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-sky-100 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="rounded-xl bg-sky-100 p-3 text-sky-700">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm text-slate-500">Selected units</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">
                    {units.length}
                  </p>
                  <p className="text-xs text-slate-500">
                    Available for attendance
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="order-3 border-violet-100 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="rounded-xl bg-violet-100 p-3 text-violet-700">
                  <CalendarCheck2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm text-slate-500">Sessions conducted</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">
                    {conductedSessions}
                  </p>
                  <p className="text-xs text-slate-500">
                    All recorded sessions
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="order-4 border-emerald-100 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                  <UsersRound className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm text-slate-500">Average attendance</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">
                    {averageAttendance}
                  </p>
                  <p className="text-xs text-slate-500">
                    Check-ins per session across units
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="order-2 border-amber-100 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="rounded-xl bg-amber-100 p-3 text-amber-700">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm text-slate-500">Units in use</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">
                    {unitsWithSessions}
                  </p>
                  <p className="text-xs text-slate-500">
                    Units with recorded sessions
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {!units.length && (
            <Card className="border-sky-200 bg-sky-50/60 shadow-sm">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">
                    Choose your teaching units first
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Your selected units will become available when creating
                    attendance sessions.
                  </p>
                </div>
                <Link
                  href="/lecturer/units"
                  className="inline-flex shrink-0 items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
                >
                  Choose units <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          )}

          <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Teaching pulse</CardTitle>
                <CardDescription>
                  A quick view of your attendance activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold text-amber-600">
                      {averageAttendance}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Average check-ins per session across units
                    </p>
                  </div>
                  <Clock3 className="h-8 w-8 text-amber-500" />
                </div>
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Selected units</span>
                    <span className="font-semibold text-slate-900">
                      {units.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Sessions created</span>
                    <span className="font-semibold text-slate-900">
                      {conductedSessions}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Units in use</span>
                    <span className="font-semibold text-sky-600">
                      {unitsWithSessions}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Card className="border-sky-100 shadow-sm xl:col-span-2">
              <CardHeader>
                <CardTitle>Attendance trend</CardTitle>
                <CardDescription>
                  Learner check-ins across the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={lecturerChartConfig}
                  className="h-64 w-full"
                >
                  <LineChart
                    data={analytics?.trend ?? []}
                    margin={{ left: 4, right: 12, top: 8, bottom: 4 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: string) =>
                        new Date(`${value}T00:00:00`).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )
                      }
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="checkIns"
                      stroke="var(--color-checkIns)"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="border-violet-100 shadow-sm">
              <CardHeader>
                <CardTitle>Attendance methods</CardTitle>
                <CardDescription>
                  How sessions are being delivered
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={lecturerChartConfig}
                  className="mx-auto h-52 w-full max-w-[240px]"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={analytics?.methods ?? []}
                      dataKey="sessions"
                      nameKey="method"
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={4}
                      strokeWidth={0}
                    >
                      <Cell fill="#8b5cf6" />
                      <Cell fill="#0ea5e9" />
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="flex justify-center gap-4 text-xs text-slate-500">
                  <span>
                    <i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-500" />
                    In-person
                  </span>
                  <span>
                    <i className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-500" />
                    Online
                  </span>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <Card className="border-violet-100 shadow-sm">
              <CardHeader>
                <CardTitle>Unit attendance comparison</CardTitle>
                <CardDescription>
                  Average learner check-ins per session by selected unit
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.units.length ? (
                  <ChartContainer
                    config={lecturerChartConfig}
                    className="w-full"
                    style={{
                      height: Math.max(256, analytics.units.length * 42),
                    }}
                  >
                    <BarChart
                      data={analytics.units}
                      layout="vertical"
                      margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} hide />
                      <YAxis
                        dataKey="unitCode"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        width={72}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar
                        dataKey="averageAttendance"
                        fill="var(--color-averageAttendance)"
                        radius={[0, 6, 6, 0]}
                        barSize={22}
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">
                    Unit analysis will appear after attendance sessions are
                    conducted.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-emerald-100 shadow-sm">
              <CardHeader>
                <CardTitle>Teaching coverage</CardTitle>
                <CardDescription>
                  Selected units with recorded attendance activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold text-emerald-600">
                      {analytics?.coverage.used ?? unitsWithSessions}
                      <span className="text-xl font-medium text-slate-400">
                        {" "}
                        / {analytics?.coverage.selected ?? units.length}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Units in use</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${analytics?.coverage.selected ? Math.min((analytics.coverage.used / analytics.coverage.selected) * 100, 100) : 0}%`,
                    }}
                  />
                </div>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Highest attendance unit
                    </span>
                    <span className="font-semibold text-slate-900">
                      {analytics?.insights.highestUnit ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Needs attention</span>
                    <span className="font-semibold text-slate-900">
                      {analytics?.insights.lowestUnit ?? "—"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Recent sessions</CardTitle>
              <CardDescription>Your latest attendance activity</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSessions.length ? (
                <div className="divide-y divide-slate-100">
                  {recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
                          <CalendarCheck2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {session.unitCode}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(session.createdAt)} ·{" "}
                            {session._count?.records ?? 0} check-ins
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          session.endedAt || session.status === "ended"
                            ? "text-slate-500"
                            : "border-emerald-200 text-emerald-700"
                        }
                      >
                        {session.endedAt || session.status === "ended"
                          ? "Completed"
                          : "Active"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-slate-500">
                  Your conducted sessions will appear here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </RoleWorkspaceShell>
  );
}
