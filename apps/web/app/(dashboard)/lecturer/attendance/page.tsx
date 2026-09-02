"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  History,
  Plus,
  Radio,
  Search,
  Send,
  Share2,
  Square,
  UserPlus,
  Users,
  X,
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
  getLecturerOnlineSessions,
  getLecturerUnits,
  getUnitRoster,
  type OnlineSession,
  type OnlineSessionHistoryEntry,
  type RosterStudent,
  type TeachingUnit,
} from "@/lib/attendance/online-attendance";
import {
  createDelegation,
  getDelegations,
  revokeDelegation,
  type Delegation,
} from "@/lib/attendance/delegation";
import { RoleWorkspaceShell } from "@/components/layout/role-workspace-shell";

interface Attendee {
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  markedAt: string;
  method?: string;
}

type Tab = "broadcast" | "history" | "roster" | "delegate";

const TABS: { id: Tab; label: string; icon: typeof Radio }[] = [
  { id: "broadcast", label: "Broadcast", icon: Radio },
  { id: "history", label: "History", icon: History },
  { id: "roster", label: "Roster", icon: Users },
  { id: "delegate", label: "Delegate", icon: UserPlus },
];

function delegationStatus(d: Delegation): { label: string; className: string } {
  if (d.endedAt) return { label: "Revoked", className: "bg-slate-100 text-slate-600" };
  if (d.used) return { label: "Accepted", className: "bg-emerald-100 text-emerald-800" };
  if (d.validUntil < Date.now()) return { label: "Expired", className: "bg-amber-100 text-amber-800" };
  return { label: "Pending", className: "bg-sky-100 text-sky-800" };
}

export default function LecturerAttendancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("broadcast");

  // ─── Broadcast tab state (unchanged from before) ──────────────────
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
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualAdmission, setManualAdmission] = useState("");

  // ─── History tab state ─────────────────────────────────────────────
  const [historySessions, setHistorySessions] = useState<OnlineSessionHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [expandedAttendees, setExpandedAttendees] = useState<Attendee[]>([]);
  const [loadingExpanded, setLoadingExpanded] = useState(false);

  // ─── Roster tab state ───────────────────────────────────────────────
  const [rosterUnitCode, setRosterUnitCode] = useState("");
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterError, setRosterError] = useState("");

  // ─── Delegate tab state ─────────────────────────────────────────────
  const [delegateUnitCode, setDelegateUnitCode] = useState("");
  const [delegateRoster, setDelegateRoster] = useState<RosterStudent[]>([]);
  const [loadingDelegateRoster, setLoadingDelegateRoster] = useState(false);
  const [delegateStudentId, setDelegateStudentId] = useState("");
  const [creatingDelegation, setCreatingDelegation] = useState(false);
  const [delegationMessage, setDelegationMessage] = useState("");
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loadingDelegations, setLoadingDelegations] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

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

  // Load session history once, the first time that tab is opened.
  useEffect(() => {
    if (activeTab !== "history" || historyLoaded) return;
    setLoadingHistory(true);
    setHistoryError("");
    getLecturerOnlineSessions()
      .then((res) => setHistorySessions(res.data))
      .catch((e) =>
        setHistoryError(e instanceof Error ? e.message : "Could not load session history"),
      )
      .finally(() => {
        setLoadingHistory(false);
        setHistoryLoaded(true);
      });
  }, [activeTab, historyLoaded]);

  // Default the roster tab's unit picker to the first teaching unit.
  useEffect(() => {
    if (activeTab === "roster" && !rosterUnitCode && units.length > 0) {
      setRosterUnitCode(units[0].code);
    }
    if (activeTab === "delegate" && !delegateUnitCode && units.length > 0) {
      setDelegateUnitCode(units[0].code);
    }
  }, [activeTab, units, rosterUnitCode, delegateUnitCode]);

  useEffect(() => {
    if (activeTab !== "roster" || !rosterUnitCode) return;
    setLoadingRoster(true);
    setRosterError("");
    getUnitRoster(rosterUnitCode)
      .then((res) => setRoster(res.students))
      .catch((e) => {
        setRoster([]);
        setRosterError(e instanceof Error ? e.message : "Could not load roster");
      })
      .finally(() => setLoadingRoster(false));
  }, [activeTab, rosterUnitCode]);

  useEffect(() => {
    if (activeTab !== "delegate" || !delegateUnitCode) return;
    setLoadingDelegateRoster(true);
    getUnitRoster(delegateUnitCode)
      .then((res) => {
        setDelegateRoster(res.students);
        setDelegateStudentId(res.students[0]?.studentId ?? "");
      })
      .catch(() => {
        setDelegateRoster([]);
        setDelegateStudentId("");
      })
      .finally(() => setLoadingDelegateRoster(false));
  }, [activeTab, delegateUnitCode]);

  const refreshDelegations = async () => {
    setLoadingDelegations(true);
    try {
      const res = await getDelegations();
      setDelegations(res.delegations);
    } catch {
      // keep last known list on a transient failure
    } finally {
      setLoadingDelegations(false);
    }
  };

  useEffect(() => {
    if (activeTab === "delegate") void refreshDelegations();
  }, [activeTab]);

  async function handleCreateDelegation() {
    if (!delegateUnitCode || !delegateStudentId) return;
    setCreatingDelegation(true);
    setDelegationMessage("");
    try {
      const res = await createDelegation(delegateStudentId, delegateUnitCode);
      setDelegationMessage(
        `Delegated to ${res.data.studentName} for ${res.data.unitCode} — expires in 15 minutes.`,
      );
      await refreshDelegations();
    } catch (e) {
      setDelegationMessage(
        e instanceof Error ? e.message : "Could not create delegation",
      );
    } finally {
      setCreatingDelegation(false);
    }
  }

  async function handleRevoke(id: string) {
    setRevokingId(id);
    try {
      await revokeDelegation(id);
      await refreshDelegations();
    } finally {
      setRevokingId(null);
    }
  }

  async function toggleExpandSession(sessionId: string) {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      return;
    }
    setExpandedSessionId(sessionId);
    setLoadingExpanded(true);
    try {
      const res = await getAttendees(sessionId);
      setExpandedAttendees(Array.isArray(res.data) ? res.data : []);
    } catch {
      setExpandedAttendees([]);
    } finally {
      setLoadingExpanded(false);
    }
  }

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
      setHistoryLoaded(false);
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

  const filteredRoster = roster.filter(
    (s) =>
      s.studentName.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      s.admissionNumber.toLowerCase().includes(rosterSearch.toLowerCase()),
  );

  return (
    <RoleWorkspaceShell
      role="lecturer"
      eyebrow="Lecturer Operations"
      title="Attendance"
      actions={
        activeTab === "broadcast" &&
        session &&
        !session.endedAt && (
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
              Attendance Operations
            </span>
          </div>

          {activeTab === "broadcast" && session && (
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

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-0.5 text-[10.5px] w-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-white text-emerald-700 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {error && activeTab === "broadcast" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-[10.5px] text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ─── Broadcast Tab ──────────────────────────────────────── */}
        {activeTab === "broadcast" && (
          !session ? (
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
            <div className="space-y-3">
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
          )
        )}

        {/* ─── History Tab ────────────────────────────────────────── */}
        {activeTab === "history" && (
          <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
            <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50">
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-emerald-600" />
                <span>Past Online Sessions</span>
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-500">
                Every broadcast you've started — click a row for its attendee list
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {historyError && (
                <div className="p-3 text-[10.5px] text-red-700 bg-red-50 border-b border-red-200">
                  {historyError}
                </div>
              )}
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-400 text-[10.5px]">
                  Loading session history...
                </div>
              ) : historySessions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-[10.5px]">
                  No past sessions yet — start one from the Broadcast tab.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {historySessions.map((s) => {
                    const isExpanded = expandedSessionId === s.id;
                    const ended = Boolean(s.endedAt) || new Date(s.expiresAt) <= new Date();
                    return (
                      <div key={s.id}>
                        <button
                          onClick={() => toggleExpandSession(s.id)}
                          className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50/60 transition"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="font-bold font-mono text-slate-900 text-[11px]">
                              {s.unitCode}
                            </span>
                            <span className="text-slate-400 text-[10px] font-mono">
                              {new Date(s.createdAt).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono text-slate-500">
                              {s._count?.records ?? 0} attendees
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.2 text-[8.5px] font-mono font-bold ${
                                ended
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {ended ? "ENDED" : "ACTIVE"}
                            </span>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="bg-slate-50/50 border-t border-slate-100 px-3.5 py-2">
                            {loadingExpanded ? (
                              <p className="text-[10.5px] text-slate-400 py-2">Loading attendees...</p>
                            ) : expandedAttendees.length === 0 ? (
                              <p className="text-[10.5px] text-slate-400 py-2">No attendees recorded.</p>
                            ) : (
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                    <th className="py-1 px-2">Student</th>
                                    <th className="py-1 px-2">Admission No.</th>
                                    <th className="py-1 px-2 text-right">Time</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {expandedAttendees.map((a, idx) => (
                                    <tr key={a.studentId || idx}>
                                      <td className="py-1 px-2 font-semibold text-slate-800 text-[10.5px]">
                                        {a.studentName || "Verified Student"}
                                      </td>
                                      <td className="py-1 px-2 font-mono text-slate-500 text-[10px]">
                                        {a.admissionNumber || "—"}
                                      </td>
                                      <td className="py-1 px-2 text-right font-mono text-slate-400 text-[10px]">
                                        {new Date(a.markedAt).toLocaleTimeString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Roster Tab ─────────────────────────────────────────── */}
        {activeTab === "roster" && (
          <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
            <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Class Roster</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Everyone enrolled in this unit, independent of any session
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={rosterUnitCode}
                  onChange={(e) => setRosterUnitCode(e.target.value)}
                  disabled={loadingUnits || units.length === 0}
                  className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[10.5px] font-medium text-slate-900 outline-none focus:border-emerald-500"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.code}>
                      {u.code} — {u.name}
                    </option>
                  ))}
                </select>
                <div className="relative min-w-[150px]">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter students..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="h-7 w-full rounded-md border border-slate-200 bg-white pl-6 pr-2 text-[10.5px] outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {rosterError && (
                <div className="p-3 text-[10.5px] text-red-700 bg-red-50 border-b border-red-200">
                  {rosterError}
                </div>
              )}
              {loadingRoster ? (
                <div className="py-12 text-center text-slate-400 text-[10.5px]">
                  Loading roster...
                </div>
              ) : filteredRoster.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-[10.5px]">
                  No enrolled students found for this unit.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80 text-[9.5px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 z-10">
                        <th className="py-1.5 px-3">#</th>
                        <th className="py-1.5 px-3">Student Name</th>
                        <th className="py-1.5 px-3">Admission Number</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRoster.map((s, idx) => (
                        <tr key={s.studentId} className="hover:bg-emerald-50/20 transition-colors">
                          <td className="py-1.5 px-3 font-mono text-slate-400 text-[10px]">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-slate-900 text-[11px]">
                            {s.studentName}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-slate-600 text-[10.5px]">
                            {s.admissionNumber}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Delegate Tab ───────────────────────────────────────── */}
        {activeTab === "delegate" && (
          <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
            <Card className="border-slate-200/90 bg-white shadow-2xs">
              <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50">
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Delegate Attendance-Taking</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Authorize a trusted student to help mark others present
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600">
                    Teaching Unit
                  </label>
                  <select
                    value={delegateUnitCode}
                    onChange={(e) => setDelegateUnitCode(e.target.value)}
                    disabled={loadingUnits || units.length === 0}
                    className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-900 outline-none focus:border-emerald-500"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.code}>
                        {u.code} — {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600">
                    Student
                  </label>
                  <select
                    value={delegateStudentId}
                    onChange={(e) => setDelegateStudentId(e.target.value)}
                    disabled={loadingDelegateRoster || delegateRoster.length === 0}
                    className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-900 outline-none focus:border-emerald-500"
                  >
                    {loadingDelegateRoster ? (
                      <option value="">Loading enrolled students...</option>
                    ) : delegateRoster.length === 0 ? (
                      <option value="">No enrolled students found</option>
                    ) : (
                      delegateRoster.map((s) => (
                        <option key={s.studentId} value={s.studentId}>
                          {s.studentName} ({s.admissionNumber})
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-[9.5px] text-slate-400">
                    Only students enrolled in this unit can be delegated to.
                  </p>
                </div>

                <Button
                  onClick={handleCreateDelegation}
                  disabled={creatingDelegation || !delegateUnitCode || !delegateStudentId}
                  className="w-full h-8 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{creatingDelegation ? "Sending..." : "Send Delegation"}</span>
                </Button>

                {delegationMessage && (
                  <p className="text-[10.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                    {delegationMessage}
                  </p>
                )}

                <p className="text-[9.5px] text-slate-400 border-t border-slate-100 pt-2">
                  The student is notified instantly and has 15 minutes to accept.
                  Running the delegated session (generating QR/BLE for others to
                  scan) happens on their MarkWise mobile app, not from a browser.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50">
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Your Delegations</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Active and recent delegations you've granted
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingDelegations ? (
                  <div className="py-10 text-center text-slate-400 text-[10.5px]">
                    Loading delegations...
                  </div>
                ) : delegations.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-[10.5px]">
                    No delegations yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {delegations.map((d) => {
                      const status = delegationStatus(d);
                      const canRevoke = !d.endedAt;
                      return (
                        <div
                          key={d.id}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold font-mono text-slate-900 text-[11px]">
                                {d.unitCode}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.2 text-[8.5px] font-mono font-bold ${status.className}`}
                              >
                                {status.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">
                              {d.leaderStudentName ?? "Unknown student"}
                            </p>
                          </div>
                          {canRevoke && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevoke(d.id)}
                              disabled={revokingId === d.id}
                              className="h-6 px-2 text-[9.5px] shrink-0 border-red-200 text-red-700 hover:bg-red-50"
                            >
                              {revokingId === d.id ? "Revoking..." : "Revoke"}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Manual Add Modal (Broadcast tab only) */}
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
