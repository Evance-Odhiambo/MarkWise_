"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarCheck2, CheckCircle2, Clock3, QrCode } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleWorkspaceShell } from "@/components/workspace/RoleWorkspaceShell";

interface AttendanceSummary {
  total: number;
  inPerson: number;
  online: number;
  recent: Array<{ id: string; unitCode: string; markedAt: string; method: string; status: string }>;
}

export default function StudentAttendancePage() {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "null") as { token?: string } | null;
      if (!user?.token) return;
      fetch("/api/v1/attendance/student/summary", { headers: { Authorization: `Bearer ${user.token}` } })
        .then((response) => response.ok ? response.json() : null)
        .then((result: AttendanceSummary | null) => { if (!cancelled) setSummary(result); })
        .catch(() => { if (!cancelled) setSummary(null); })
        .finally(() => { if (!cancelled) setLoading(false); });
    } catch {
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, []);

  return (
    <RoleWorkspaceShell role="student" eyebrow="Attendance" title="Attendance">
      <main className="min-h-screen bg-emerald-50/30 px-5 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
            <div className="relative z-10 max-w-2xl">
              <p className="text-sm font-medium text-emerald-300">Your attendance centre</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Stay present, stay on track.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">Open the secure link shared by your lecturer to mark attendance. Your check-in history is summarized below.</p>
              <Link href="/attend" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">Open attendance link <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <CalendarCheck2 className="absolute -bottom-8 -right-4 h-48 w-48 text-white/5" />
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="flex items-center gap-4 p-5"><CheckCircle2 className="h-8 w-8 text-emerald-600" /><div><p className="text-sm text-slate-500">Total check-ins</p><p className="mt-1 text-2xl font-semibold text-slate-950">{loading ? "—" : summary?.total ?? 0}</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-4 p-5"><QrCode className="h-8 w-8 text-sky-600" /><div><p className="text-sm text-slate-500">Online attendance</p><p className="mt-1 text-2xl font-semibold text-slate-950">{loading ? "—" : summary?.online ?? 0}</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-4 p-5"><Clock3 className="h-8 w-8 text-violet-600" /><div><p className="text-sm text-slate-500">In-person attendance</p><p className="mt-1 text-2xl font-semibold text-slate-950">{loading ? "—" : summary?.inPerson ?? 0}</p></div></CardContent></Card>
          </section>

          <Card>
            <CardHeader><CardTitle>Recent check-ins</CardTitle><CardDescription>Your latest attendance records across all methods</CardDescription></CardHeader>
            <CardContent>
              {summary?.recent.length ? <div className="divide-y divide-slate-100">{summary.recent.map((record) => <div key={record.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div><p className="font-semibold text-slate-900">{record.unitCode}</p><p className="mt-1 text-sm text-slate-500">{new Date(record.markedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p></div><div className="flex items-center gap-2"><Badge variant="outline" className="capitalize">{record.method}</Badge><Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{record.status}</Badge></div></div>)}</div> : <div className="rounded-xl bg-slate-50 p-6 text-center"><p className="font-medium text-slate-900">No attendance records yet</p><p className="mt-1 text-sm text-slate-500">Your check-ins will appear here after you join a lecturer’s session.</p></div>}
            </CardContent>
          </Card>
        </div>
      </main>
    </RoleWorkspaceShell>
  );
}
