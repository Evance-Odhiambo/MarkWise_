"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  GraduationCap,
  RefreshCw,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RoleWorkspaceShell } from "@/components/layout/role-workspace-shell";

interface AttendanceRecord {
  id: string;
  unitCode: string;
  unitName?: string;
  markedAt: string;
  method?: string;
  status: string;
}

interface AttendanceSummary {
  total: number;
  inPerson: number;
  online: number;
  recent: AttendanceRecord[];
}

interface StudentSession {
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  course?: string;
  admissionNumber?: string;
}

export default function StudentAttendancePage() {
  const router = useRouter();
  const [studentProfile, setStudentProfile] = useState<StudentSession | null>(null);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const fetchLiveRecords = async (token: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch student identity
      const profileRes = await fetch("/api/v1/students/me", { headers });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setStudentProfile((prev) => ({
          ...prev,
          userId: profileData.userId,
          name: profileData.name,
          admissionNumber: profileData.admissionNumber,
          course: profileData.course,
        }));
      } else if (profileRes.status === 401 || profileRes.status === 403) {
        localStorage.removeItem("user");
        router.push("/student/login");
        return;
      }

      // 2. Fetch summary
      const response = await fetch("/api/v1/attendance/student/summary", { headers });
      if (response.ok) {
        const result: AttendanceSummary = await response.json();
        setSummary(result);
      }
    } catch {
      // keep existing
    }
  };

  useEffect(() => {
    let cancelled = false;
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "null") as (StudentSession & { token?: string }) | null;
      if (!user?.token || user.role !== "student") {
        localStorage.removeItem("user");
        router.push("/student/login");
        return;
      }

      setStudentProfile(user);

      fetchLiveRecords(user.token).finally(() => {
        if (!cancelled) setLoading(false);
      });
    } catch {
      router.push("/student/login");
    }
    return () => { cancelled = true; };
  }, [router]);

  const handleRefresh = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "null") as { token?: string } | null;
      if (user?.token) {
        setRefreshing(true);
        await fetchLiveRecords(user.token);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const records = summary?.recent ?? [];

  const filteredRecords = records.filter((r) => {
    const matchSearch = r.unitCode.toLowerCase().includes(search.toLowerCase()) || 
      (r.unitName || "").toLowerCase().includes(search.toLowerCase());
    const matchUnit = unitFilter === "ALL" || r.unitCode === unitFilter;
    return matchSearch && matchUnit;
  });

  const availableUnits = Array.from(new Set(records.map((r) => r.unitCode)));

  const exportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = ["Unit Code", "Date & Time", "Channel", "Status"];
    const rows = filteredRecords.map((r) => [
      r.unitCode,
      new Date(r.markedAt).toLocaleString(),
      r.method || "Verified",
      r.status,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <RoleWorkspaceShell
      role="student"
      eyebrow="Student Workspace"
      title="Attendance Ledger"
      name={studentProfile?.name}
      email={studentProfile?.email}
      actions={
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-7 px-2.5 text-[10px] bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-medium gap-1 shadow-2xs"
          >
            <RefreshCw className={`h-3 w-3 text-emerald-600 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportCSV}
            disabled={filteredRecords.length === 0}
            className="h-7 px-2.5 text-[10px] bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-medium gap-1 shadow-2xs"
          >
            <Download className="h-3 w-3" />
            <span>Export CSV</span>
          </Button>
        </div>
      }
    >
      <main className="p-3 sm:p-4 space-y-3 max-w-[1500px] mx-auto text-[11px]">
        {/* Header Bar */}
        <div className="rounded-xl border border-emerald-900/40 bg-gradient-to-r from-emerald-950 via-slate-950 to-emerald-950 p-3.5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="flex items-center gap-1 w-fit rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-300 border border-emerald-500/30">
              <CalendarCheck2 className="h-3 w-3 text-emerald-400" />
              Verified Audit Ledger
            </span>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Course Attendance Records
            </h2>
            <p className="text-[10px] text-emerald-200/70">
              Student: {studentProfile?.name || "Student"} ({studentProfile?.admissionNumber || "ADMISSION ID"}) · {studentProfile?.course || "Academic Program"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/student/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[10.5px] border-emerald-800 bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900 hover:text-white"
              >
                Dashboard Overview
              </Button>
            </Link>
            <Link href="/attend">
              <Button
                size="sm"
                className="h-7 px-3 text-[10.5px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold gap-1 shadow-xs"
              >
                <Zap className="h-3 w-3" />
                <span>Mark Attendance</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <section className="grid gap-2.5 sm:grid-cols-3">
          <Card className="border-slate-200/90 bg-white p-3 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Verified Check-ins
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-extrabold font-mono text-slate-900">
                {loading ? "..." : summary?.total ?? 0}
              </span>
              <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">
                Verified
              </span>
            </div>
            <p className="mt-2 text-[9.5px] text-slate-500 border-t border-slate-100 pt-1.5 font-mono">
              {summary?.inPerson ?? 0} In-Person · {summary?.online ?? 0} Online
            </p>
          </Card>

          <Card className="border-slate-200/90 bg-white p-3 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              In-Person Attendance Records
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-extrabold font-mono text-emerald-700">
                {loading ? "..." : summary?.inPerson ?? 0}
              </span>
              <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-1 rounded">
                Mobile BLE
              </span>
            </div>
            <p className="mt-2 text-[9.5px] text-slate-500 border-t border-slate-100 pt-1.5">
              Verified inside lecture rooms
            </p>
          </Card>

          <Card className="border-slate-200/90 bg-white p-3 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Online Attendance Records
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-extrabold font-mono text-slate-900">
                {loading ? "..." : summary?.online ?? 0}
              </span>
              <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-1 rounded font-mono">
                Web Portal
              </span>
            </div>
            <p className="mt-2 text-[9.5px] text-slate-500 border-t border-slate-100 pt-1.5">
              Verified during remote lectures
            </p>
          </Card>
        </section>

        {/* Detailed Attendance Ledger Table */}
        <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900">
                Verified Lecture Check-in History
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-500">
                Showing {filteredRecords.length} recorded lecture sessions
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative min-w-[180px]">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by course code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-6 w-full rounded-md border border-slate-200 bg-white pl-6 pr-2 text-[10px] outline-none focus:border-emerald-500"
                />
              </div>

              {availableUnits.length > 0 && (
                <select
                  value={unitFilter}
                  onChange={(e) => setUnitFilter(e.target.value)}
                  className="h-6 rounded border border-slate-200 bg-white px-2 text-[10px] font-medium text-slate-700 outline-none"
                >
                  <option value="ALL">All Units</option>
                  {availableUnits.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-[10.5px]">
                Loading live attendance records...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-[10.5px]">
                No attendance records found matching your filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-[9.5px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Unit Code</th>
                      <th className="py-2 px-3">Date &amp; Timestamp</th>
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredRecords.map((rec, idx) => (
                      <tr key={rec.id || idx} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="py-2 px-3 font-mono text-slate-400 text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-bold font-mono text-emerald-950 text-[11px]">
                          {rec.unitCode}
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">
                          {new Date(rec.markedAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-2 px-3">
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[8.5px] font-mono font-bold text-slate-700 uppercase">
                            {rec.method || "Verified"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="rounded bg-emerald-100 text-emerald-800 font-mono text-[8.5px] font-bold px-1.5 py-0.2">
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </RoleWorkspaceShell>
  );
}
