"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarCheck2,
  Flame,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings2,
  Target,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";

interface StudentSession {
  name?: string;
  email?: string;
  course?: string;
  admissionNumber?: string;
}
interface AttendanceAnalytics {
  total: number;
  inPerson: number;
  online: number;
  trend: Array<{ date: string; count: number }>;
  units: Array<{ unitCode: string; count: number }>;
  currentSemester: { name: string; unitsTotal: number; unitsEnrolled: number };
  health: { conducted: number; attended: number; missed: number; projectedPercentage: number; goalPercentage: number; streak: number };
  unitHealth: Array<{ unitCode: string; unitName: string; conducted: number; attended: number; missed: number; percentage: number; status: string }>;
  recent: Array<{ id: string; unitCode: string; markedAt: string; method: string; status: string }>;
}
const attendanceChartConfig = {
  count: { label: "Check-ins", color: "#10b981" },
  inPerson: { label: "In-person", color: "#10b981" },
  online: { label: "Online", color: "#0ea5e9" },
} satisfies ChartConfig;
const navigation = [
  { label: "Overview", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/student/dashboard/attendance", icon: CalendarCheck2 },
  { label: "My Units", href: "/student/units", icon: BookOpen },
  { label: "Notifications", href: "/student/notifications", icon: Bell },
];

export default function StudentDashboardPage() {
  const [user, setUser] = useState<StudentSession | null>(null);
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = JSON.parse(localStorage.getItem("user") ?? "null") as (StudentSession & { token?: string }) | null;
      setUser(stored);
      if (!stored?.token) return;
      const loadAnalytics = () => fetch("/api/v1/attendance/student/summary", { headers: { Authorization: `Bearer ${stored.token}` } })
        .then((response) => response.ok ? response.json() : null)
        .then((result: AttendanceAnalytics | null) => { if (!cancelled) setAnalytics(result); })
        .catch(() => { if (!cancelled) setAnalytics(null); });
      void loadAnalytics();
      window.addEventListener("focus", loadAnalytics);
      return () => { cancelled = true; window.removeEventListener("focus", loadAnalytics); };
    } catch {
      setUser(null);
    }
    return () => { cancelled = true; };
  }, []);

  const displayName = user?.name || "Student";
  const semesterPercentage = analytics?.currentSemester?.unitsTotal
    ? Math.round((analytics.currentSemester.unitsEnrolled / analytics.currentSemester.unitsTotal) * 100)
    : 0;
  const attendancePercentage = analytics?.health?.projectedPercentage ?? 0;
  const attendanceTone = attendancePercentage >= 75
    ? { border: "border-emerald-200", text: "text-emerald-600", track: "bg-emerald-100", fill: "bg-emerald-500" }
    : attendancePercentage >= 60
      ? { border: "border-amber-200", text: "text-amber-600", track: "bg-amber-100", fill: "bg-amber-500" }
      : { border: "border-red-200", text: "text-red-600", track: "bg-red-100", fill: "bg-red-500" };
  const signOut = () => {
    localStorage.removeItem("user");
    window.location.href = "/student/login";
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50">
        <Sidebar className="border-r border-slate-200 bg-white">
          <SidebarHeader className="border-b border-slate-200 p-5">
            <Link href="/student/dashboard" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <GraduationCap className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                  MarkWise
                </span>
                <span className="block text-sm font-semibold text-slate-900">
                  Student space
                </span>
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="px-3 py-5">
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map(({ label, href, icon: Icon }) => (
                    <SidebarMenuItem key={label}>
                      <SidebarMenuButton
                        render={<Link href={href} />}
                        isActive={label === "Overview"}
                        className="h-10"
                      >
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup className="mt-5">
              <SidebarGroupLabel>Account</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link href="/student/dashboard" />}
                      className="h-10"
                    >
                      <UserRound />
                      <span>Profile</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link href="/student/settings" />}
                      className="h-10"
                    >
                      <Settings2 />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-slate-200 p-4">
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="truncate text-sm font-semibold text-slate-900">
                {displayName}
              </p>
              <p className="mt-1 truncate text-xs text-slate-500">
                {user?.email || "Student account"}
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="h-screen min-w-0 overflow-hidden bg-emerald-50/30">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-8">
            <SidebarTrigger className="md:hidden" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Student workspace
              </p>
              <h1 className="text-xl font-semibold text-slate-950">Overview</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto text-slate-500"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>
          </header>
          <main className="h-[calc(100vh-73px)] w-full overflow-y-auto overflow-x-hidden p-5 sm:p-8">
            <div className="mx-auto w-full max-w-7xl space-y-6">              
              <section className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Course</p>
                  <p className="mt-2 truncate text-lg font-semibold text-slate-950">
                    {user?.course || "Not available"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Current academic programme
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Admission number</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {user?.admissionNumber || "Not available"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Verified student identity
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-sm text-emerald-800">Attendance status</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{analytics?.total ?? 0} check-ins</p>
                  <p className="mt-1 text-xs text-emerald-800">
                    {analytics ? "Attendance history is up to date" : "Join an active session when available"}
                  </p>
                </div>
              </section>
              <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50/80 to-white shadow-sm">
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div><CardTitle>{analytics?.currentSemester?.name ?? "Current semester"}</CardTitle><CardDescription>Your academic progress and enrolled units</CardDescription></div>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Current</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between"><span className="text-sm text-slate-500">Units enrolled</span><span className="text-2xl font-semibold text-slate-950">{analytics?.currentSemester?.unitsEnrolled ?? 0}<span className="text-sm font-normal text-slate-400"> / {analytics?.currentSemester?.unitsTotal ?? 0}</span></span></div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(semesterPercentage, 100)}%` }} /></div>
                    <p className="mt-2 text-xs text-slate-500"><span className="font-semibold text-blue-700">{semesterPercentage}%</span> of semester units selected</p>
                  </CardContent>
                </Card>
                <Card className={`${attendanceTone.border} bg-gradient-to-br from-white to-slate-50 shadow-sm`}><CardHeader><CardTitle className={attendanceTone.text}>Attendance health</CardTitle><CardDescription>Your current attendance outlook</CardDescription></CardHeader><CardContent><div className="flex items-center justify-between"><div><p className={`text-4xl font-bold ${attendanceTone.text}`}>{attendancePercentage}%</p><p className="mt-1 text-xs text-slate-500">Projected attendance</p></div><div className="text-right text-sm"><p><span className="font-semibold text-slate-900">{analytics?.health?.attended ?? 0}</span> attended</p><p className="text-slate-500"><span className="font-semibold text-slate-900">{analytics?.health?.missed ?? 0}</span> missed</p></div></div><div className="mt-4 flex flex-wrap gap-2"><Badge variant="outline">{analytics?.health?.conducted ?? 0} conducted</Badge><Badge variant="secondary" className="bg-red-50 text-red-700">{analytics?.health?.missed ?? 0} missed</Badge><Badge variant="secondary" className="bg-amber-50 text-amber-700"><Flame className="mr-1 h-3 w-3" />{analytics?.health?.streak ?? 0} day streak</Badge></div><div className="mt-4"><div className="flex justify-between text-xs text-slate-500"><span>Goal: {analytics?.health?.goalPercentage ?? 75}%</span><span>{Math.max(attendancePercentage - (analytics?.health?.goalPercentage ?? 75), 0)}% above goal</span></div><div className={`mt-2 h-2 overflow-hidden rounded-full ${attendanceTone.track}`}><div className={`h-full rounded-full ${attendanceTone.fill}`} style={{ width: `${Math.min((attendancePercentage / (analytics?.health?.goalPercentage ?? 75)) * 100, 100)}%` }} /></div></div></CardContent></Card>
              </section>
              <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                <Card className="border-emerald-100 shadow-sm">
                  <CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle>Unit health</CardTitle><CardDescription>See where your attendance needs attention</CardDescription></div><Target className="h-5 w-5 text-emerald-600" /></CardHeader>
                  <CardContent><div className="grid gap-3 sm:grid-cols-2">{analytics?.unitHealth?.length ? analytics.unitHealth.map((unit) => <div key={unit.unitCode} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-slate-950">{unit.unitCode}</p><p className="truncate text-xs text-slate-500">{unit.unitName}</p></div><Badge variant="secondary" className={unit.status === "At risk" ? "bg-red-50 text-red-700" : unit.status === "On track" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}>{unit.status}</Badge></div><div className="mt-4 flex items-end justify-between"><span className="text-xs text-slate-500">{unit.attended} attended · {unit.missed} missed</span><span className="text-lg font-semibold text-slate-950">{unit.percentage}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${unit.status === "At risk" ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(unit.percentage, 100)}%` }} /></div></div>) : <p className="py-6 text-center text-sm text-slate-500">Unit health will appear after your units have attendance activity.</p>}</div></CardContent>
                </Card>
                <Card className="border-amber-100 bg-amber-50/50 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><TriangleAlert className="h-5 w-5 text-amber-600" />Stay on track</CardTitle><CardDescription>A simple next step based on your attendance</CardDescription></CardHeader><CardContent><p className="text-sm leading-6 text-slate-700">{analytics?.unitHealth?.some((unit) => unit.status === "At risk") ? "One or more units are below the 75% attendance goal. Prioritize your next available sessions to improve your standing." : (analytics?.health?.projectedPercentage ?? 0) >= 75 ? "You are currently meeting the attendance goal. Keep the momentum going." : "Attend your next available sessions to build a stronger attendance record."}</p><div className="mt-5 flex items-center gap-2 text-sm font-medium text-amber-800"><Flame className="h-4 w-4" />Current streak: {analytics?.health?.streak ?? 0} days</div></CardContent></Card>
              </section>
              <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <Card className="border-emerald-100 shadow-sm">
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle>Attendance activity</CardTitle>
                      <CardDescription>Your check-ins over the last seven days</CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">{analytics?.total ?? 0} total</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="flex h-40 items-end justify-between gap-2 pt-5">
                      {(analytics?.trend ?? Array.from({ length: 7 }, (_, index) => ({ date: `day-${index}`, count: 0 }))).map((day) => {
                        const max = Math.max(...(analytics?.trend.map((item) => item.count) ?? [1]), 1);
                        const height = day.count === 0 ? 8 : Math.max((day.count / max) * 100, 16);
                        return <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="w-full rounded-t-md bg-emerald-500 transition-all" style={{ height: `${height}%` }} title={`${day.count} check-in${day.count === 1 ? "" : "s"}`} /><span className="text-[10px] text-slate-400">{day.date.startsWith("day-") ? "—" : new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</span></div>;
                      })}
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                      <div><p className="text-xs text-slate-500">In-person</p><p className="mt-1 text-xl font-semibold text-slate-950">{analytics?.inPerson ?? 0}</p></div>
                      <div><p className="text-xs text-slate-500">Online</p><p className="mt-1 text-xl font-semibold text-slate-950">{analytics?.online ?? 0}</p></div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardHeader><CardTitle>Recent check-ins</CardTitle><CardDescription>Your latest attendance activity</CardDescription></CardHeader>
                  <CardContent>
                    {analytics?.recent.length ? <div className="space-y-4">{analytics.recent.slice(0, 4).map((record) => <div key={record.id} className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{record.unitCode}</p><p className="text-xs text-slate-500">{new Date(record.markedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p></div><Badge variant="outline" className="capitalize">{record.method}</Badge></div>)}</div> : <p className="text-sm text-slate-500">Your recent check-ins will appear here.</p>}
                  </CardContent>
                </Card>
              </section>
              <section className="grid gap-6 xl:grid-cols-3">
                <Card className="border-emerald-100 shadow-sm">
                  <CardHeader><CardTitle>Attendance methods</CardTitle><CardDescription>How your check-ins are distributed</CardDescription></CardHeader>
                  <CardContent>
                    <ChartContainer config={attendanceChartConfig} className="mx-auto h-56 w-full max-w-[260px]">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie data={[{ name: "inPerson", value: analytics?.inPerson ?? 0 }, { name: "online", value: analytics?.online ?? 0 }]} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={4} strokeWidth={0}>
                          <Cell fill="var(--color-inPerson)" /><Cell fill="var(--color-online)" />
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="-mt-2 flex justify-center gap-5 text-xs text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />In-person {analytics?.inPerson ?? 0}</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-500" />Online {analytics?.online ?? 0}</span></div>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100 shadow-sm xl:col-span-2">
                  <CardHeader><CardTitle>Weekly progress</CardTitle><CardDescription>Daily check-ins over the last seven days</CardDescription></CardHeader>
                  <CardContent>
                    <ChartContainer config={attendanceChartConfig} className="h-56 w-full">
                      <LineChart data={analytics?.trend ?? []} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={(value: string) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-count)" }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100 shadow-sm xl:col-span-3">
                  <CardHeader><CardTitle>Unit analysis</CardTitle><CardDescription>Attendance activity by teaching unit</CardDescription></CardHeader>
                  <CardContent>
                    {analytics?.units.length ? <ChartContainer config={attendanceChartConfig} className="w-full" style={{ height: Math.max(256, analytics.units.length * 42) }}><BarChart data={analytics.units} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}><CartesianGrid horizontal={false} strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} hide /><YAxis dataKey="unitCode" type="category" axisLine={false} tickLine={false} width={72} /><ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} /><Bar dataKey="count" fill="var(--color-count)" radius={[0, 6, 6, 0]} barSize={22} /></BarChart></ChartContainer> : <div className="flex h-32 items-center justify-center text-sm text-slate-500">Unit analytics will appear after your first check-in.</div>}
                  </CardContent>
                </Card>
              </section>              
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
