"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  Globe,
  Plus,
  QrCode,
  Radio,
  Search,
  Share2,
  Sparkles,
  Square,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createOnlineSession,
  endOnlineSession,
  getAttendees,
  getLecturerUnits,
  type OnlineSession,
  type TeachingUnit,
} from "@/lib/attendance/online-attendance";
import { RoleWorkspaceShell } from "@/components/layout/role-workspace-shell";

interface Attendee {
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  markedAt: string;
  method?: string;
}

export default function LecturerOnlineAttendancePage() {
  const [unitCode, setUnitCode] = useState("");
  const [units, setUnits] = useState<TeachingUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [session, setSession] = useState<OnlineSession | null>(null);
  const [attendeeList, setAttendeeList] = useState<Attendee[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(10);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(10 * 60);

  // Manual check-in modal
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualAdmission, setManualAdmission] = useState("");

  useEffect(() => {
    getLecturerUnits()
      .then((result) => {
        const loadedUnits = Array.isArray(result.units) ? result.units : [];
        setUnits(loadedUnits);
        if (loadedUnits.length > 0 && !unitCode) {
          setUnitCode(loadedUnits[0].code);
        }
      })
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Could not load teaching units",
        ),
      )
      .finally(() => setLoadingUnits(false));
  }, []);

  // Poll attendees while session is active
  useEffect(() => {
    if (!session || session.endedAt) return;
    const refresh = async () => {
      try {
        const res = await getAttendees(session.id);
        if (Array.isArray(res.data)) {
          setAttendeeList(res.data);
        }
      } catch (error) {
        // Log error but keep last count - backend might be temporarily unavailable
        console.warn("Failed to refresh attendees:", error instanceof Error ? error.message : "Unknown error");
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 4000);
    return () => window.clearInterval(timer);
  }, [session]);

  // Countdown timer
  useEffect(() => {
    if (!session || session.endedAt) return;
    const timer = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          void end();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  async function start() {
    if (!unitCode) return;
    setBusy(true);
    setError("");
    try {
      const res = await createOnlineSession(unitCode);
      setSession(res.data);
      setSecondsRemaining(sessionDurationMinutes * 60);
      setAttendeeList([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start online session");
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    if (!session) return;
    setBusy(true);
    try {
      await endOnlineSession(session.id);
      setSession({
        ...session,
        endedAt: new Date().toISOString(),
        status: "ended",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not end session");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!session) return;
    const link = `${window.location.origin}/attend?session=${session.id}`;
    await navigator.clipboard?.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  }

  const exportAttendeesCSV = () => {
    if (attendeeList.length === 0) return;
    const headers = ["Admission Number", "Student Name", "Time", "Status"];
    const rows = attendeeList.map((a, idx) => [
      a.admissionNumber || `ADM-${idx + 1}`,
      `"${a.studentName || "Verified Student"}"`,
      new Date(a.markedAt).toLocaleTimeString(),
      "PRESENT",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendees_${session?.unitCode || "session"}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManualAddAttendee = () => {
    if (!manualName.trim() || !manualAdmission.trim()) return;
    const newAttendee: Attendee = {
      studentId: `manual-${Date.now()}`,
      studentName: manualName.trim(),
      admissionNumber: manualAdmission.trim().toUpperCase(),
      markedAt: new Date().toISOString(),
      method: "Manual Record",
    };
    setAttendeeList((prev) => [newAttendee, ...prev]);
    setManualName("");
    setManualAdmission("");
    setShowManualAdd(false);
  };

  const filteredAttendees = attendeeList.filter(
    (a) =>
      (a.studentName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.admissionNumber || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <RoleWorkspaceShell
      role="lecturer"
      eyebrow="Lecturer Operations"
      title="Live Session Broadcaster"
      actions={
        session && !session.endedAt && (
          <Button
            size="sm"
            variant="destructive"
            onClick={end}
            disabled={busy}
            className="h-7 px-3 text-[10.5px] font-bold gap-1 shadow-xs"
          >
            <Square className="h-3 w-3" />
            <span>End Session</span>
          </Button>
        )
      }
    >
      <main className="p-3 sm:p-4 space-y-3 max-w-[1500px] mx-auto text-[11px]">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <Link
              href="/lecturer/dashboard"
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Dashboard</span>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-slate-900 text-xs">
              Live Lecture Broadcaster
            </span>
          </div>

          {session && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[9.5px] font-mono ${
                  session.endedAt
                    ? "border-slate-300 bg-slate-100 text-slate-600"
                    : "border-emerald-300 bg-emerald-50 text-emerald-800 animate-pulse"
                }`}
              >
                <Radio className="mr-1 h-2.5 w-2.5 text-emerald-600" />
                {session.endedAt ? "SESSION CONCLUDED" : `BROADCASTING: ${session.unitCode}`}
              </Badge>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-[10.5px] text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {!session ? (
          /* Session Launcher */
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-slate-200/90 bg-white shadow-2xs">
              <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50">
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Launch Lecture Attendance Session</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Select your teaching unit and session duration
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600">
                    Teaching Unit
                  </label>
                  <select
                    value={unitCode}
                    onChange={(e) => setUnitCode(e.target.value)}
                    disabled={loadingUnits || units.length === 0}
                    className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-900 outline-none focus:border-emerald-500"
                  >
                    {loadingUnits ? (
                      <option value="">Loading teaching units...</option>
                    ) : units.length === 0 ? (
                      <option value="">No configured units found</option>
                    ) : (
                      units.map((u) => (
                        <option key={u.id} value={u.code}>
                          {u.code} — {u.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600">
                    Session Duration
                  </label>
                  <select
                    value={sessionDurationMinutes}
                    onChange={(e) => setSessionDurationMinutes(Number(e.target.value))}
                    className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-900 outline-none"
                  >
                    <option value={5}>5 Minutes</option>
                    <option value={10}>10 Minutes (Standard)</option>
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                    <option value={90}>90 Minutes</option>
                    <option value={120}>120 Minutes (2 Hours)</option>
                  </select>
                </div>

                <Button
                  onClick={start}
                  disabled={busy || !unitCode || units.length === 0}
                  className="w-full h-8 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs"
                >
                  <Radio className="h-3.5 w-3.5" />
                  <span>{busy ? "Starting Broadcaster..." : "Start Attendance Session"}</span>
                </Button>
              </CardContent>
            </Card>

            {/* Quick Metrics */}
            <Card className="border-slate-200/90 bg-white p-3.5 shadow-2xs space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Session Controls
              </span>
              <div className="space-y-2 text-[10.5px]">
                <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600">Configured Units:</span>
                  <span className="font-bold font-mono text-slate-900">{units.length}</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600">Security:</span>
                  <span className="font-bold font-mono text-emerald-800">Cryptographic Signing</span>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          /* Live Session Table & Controls */
          <div className="space-y-3">
            {/* Live Stats Row */}
            <div className="grid gap-2.5 sm:grid-cols-4">
              <Card className="border-emerald-200 bg-emerald-50/70 p-3 shadow-2xs">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-800">
                  Active Unit
                </span>
                <p className="mt-1 text-lg font-extrabold font-mono text-emerald-950">
                  {session.unitCode}
                </p>
                <p className="text-[9.5px] text-emerald-700">Lecture session active</p>
              </Card>

              <Card className="border-emerald-200 bg-emerald-50/70 p-3 shadow-2xs">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-800">
                  Verified Attendees
                </span>
                <p className="mt-1 text-lg font-extrabold font-mono text-emerald-950">
                  {attendeeList.length}
                </p>
                <p className="text-[9.5px] text-emerald-700">Live student check-ins</p>
              </Card>

              <Card className="border-slate-200 bg-white p-3 shadow-2xs">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">
                  Time Remaining
                </span>
                <p className="mt-1 text-lg font-extrabold font-mono text-slate-900">
                  {session.endedAt ? "00:00" : formatTimer(secondsRemaining)}
                </p>
                <p className="text-[9.5px] text-slate-400">Auto-expires at 00:00</p>
              </Card>

              <Card className="border-slate-200 bg-white p-3 shadow-2xs flex flex-col justify-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={share}
                  className="h-6 text-[10px] bg-white border-emerald-300 text-emerald-800 font-medium gap-1"
                >
                  <Share2 className="h-3 w-3 text-emerald-600" />
                  <span>{copiedLink ? "Link Copied!" : "Copy Student Link"}</span>
                </Button>
                {attendeeList.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportAttendeesCSV}
                    className="h-6 text-[10px] bg-white border-slate-200 font-medium gap-1"
                  >
                    <Download className="h-3 w-3 text-slate-600" />
                    <span>Export Roster CSV</span>
                  </Button>
                )}
              </Card>
            </div>

            {/* Live Student Check-in Roster Table */}
            <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Live Session Attendees ({attendeeList.length})</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] text-slate-500">
                    Real-time verification log
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative min-w-[160px]">
                    <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter attendees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-6 w-full rounded-md border border-slate-200 bg-white pl-6 pr-2 text-[10px] outline-none focus:border-emerald-500"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowManualAdd(true)}
                    className="h-6 px-2 text-[10px] bg-white border-slate-200 font-medium gap-1"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    <span>Manual Add</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {attendeeList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-[10.5px] space-y-1">
                    <Radio className="h-6 w-6 text-emerald-500 mx-auto animate-pulse" />
                    <p className="font-bold text-slate-700">Attendance Session Active</p>
                    <p>Waiting for student check-ins...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80 text-[9.5px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 z-10">
                          <th className="py-1.5 px-3">#</th>
                          <th className="py-1.5 px-3">Student Name</th>
                          <th className="py-1.5 px-3">Admission Number</th>
                          <th className="py-1.5 px-3">Timestamp</th>
                          <th className="py-1.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {filteredAttendees.map((att, idx) => (
                          <tr key={att.studentId || idx} className="hover:bg-emerald-50/20 transition-colors">
                            <td className="py-1.5 px-3 font-mono text-slate-400 text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 px-3 font-bold text-slate-900 text-[11px]">
                              {att.studentName || "Verified Student"}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-slate-600 text-[10.5px]">
                              {att.admissionNumber || `ADM-${idx + 1}`}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-slate-400 text-[10px]">
                              {new Date(att.markedAt).toLocaleTimeString()}
                            </td>
                            <td className="py-1.5 px-3 text-right">
                              <span className="rounded bg-emerald-100 text-emerald-800 font-mono text-[8.5px] font-bold px-1.5 py-0.2">
                                PRESENT
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
          </div>
        )}

        {/* Manual Add Modal */}
        {showManualAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-emerald-600" />
                  Manual Student Check-in
                </h3>
                <button onClick={() => setShowManualAdd(false)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-600">Student Name</label>
                  <Input
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g. Mary Muthoni"
                    className="h-7 text-[11px]"
                    autoFocus
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-600">Admission Number</label>
                  <Input
                    value={manualAdmission}
                    onChange={(e) => setManualAdmission(e.target.value)}
                    placeholder="e.g. SC211/0459/2023"
                    className="h-7 text-[11px] font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualAdd(false)}
                  className="h-7 text-[10.5px]"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!manualName.trim() || !manualAdmission.trim()}
                  onClick={handleManualAddAttendee}
                  className="h-7 text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Confirm Present
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </RoleWorkspaceShell>
  );
}
