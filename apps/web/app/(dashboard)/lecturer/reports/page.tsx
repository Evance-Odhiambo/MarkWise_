"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bell,
  Download,
  FileBarChart,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleWorkspaceShell } from "@/components/layout/role-workspace-shell";

interface UnitStat {
  unitCode: string;
  unitName: string;
  semesterName: string;
  enrolled: number;
  sessions: number;
  checkIns: number;
  averageAttendance: number;
  attendanceRate: number;
  atRiskCount: number;
  status: string;
}

interface AtRiskStudent {
  id: string;
  name: string;
  admissionNumber: string;
  unitCode: string;
  attendanceRate: number;
  missedCount: number;
}

interface LecturerSummary {
  units: UnitStat[];
  atRiskStudents: AtRiskStudent[];
  currentTerm: string;
}

const authHeaders = (): Record<string, string> => {
  try {
    const user = JSON.parse(localStorage.getItem("user") ?? "{}") as {
      token?: string;
    };
    return user.token ? { Authorization: `Bearer ${user.token}` } : {};
  } catch {
    return {};
  }
};

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "Optimal":
      return "border-emerald-300 bg-emerald-50 text-emerald-800";
    case "Compliant":
      return "border-sky-300 bg-sky-50 text-sky-800";
    case "Watchlist":
      return "border-amber-300 bg-amber-50 text-amber-800";
    default:
      return "border-slate-300 bg-slate-50 text-slate-600";
  }
};

type SortField =
  | "unitCode"
  | "enrolled"
  | "sessions"
  | "checkIns"
  | "attendanceRate"
  | "atRiskCount";

const SORT_COLUMNS: { field: SortField; label: string }[] = [
  { field: "unitCode", label: "Unit" },
  { field: "enrolled", label: "Enrolled" },
  { field: "sessions", label: "Sessions" },
  { field: "checkIns", label: "Check-ins" },
  { field: "attendanceRate", label: "Attendance" },
  { field: "atRiskCount", label: "At-risk" },
];

export default function LecturerReportsPage() {
  const [summary, setSummary] = useState<LecturerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifying, setNotifying] = useState<string | "all" | "selected" | null>(null);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [sortField, setSortField] = useState<SortField>("attendanceRate");
  const [sortAsc, setSortAsc] = useState(true);
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/v1/attendance/lecturer/summary", {
          headers: authHeaders(),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as LecturerSummary;
        if (!cancelled) setSummary(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not load reports");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedUnits = useMemo(() => {
    if (!summary) return [];
    const sorted = [...summary.units].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === "string" || typeof bv === "string")
        return String(av).localeCompare(String(bv));
      return (av as number) - (bv as number);
    });
    return sortAsc ? sorted : sorted.reverse();
  }, [summary, sortField, sortAsc]);

  const filteredAtRisk = useMemo(() => {
    if (!summary) return [];
    const q = studentQuery.trim().toLowerCase();
    if (!q) return summary.atRiskStudents;
    return summary.atRiskStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.admissionNumber.toLowerCase().includes(q) ||
        s.unitCode.toLowerCase().includes(q),
    );
  }, [summary, studentQuery]);

  const toggleSort = (field: SortField) => {
    if (field === sortField) setSortAsc((prev) => !prev);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const notify = async (studentIds?: string[], mode: string | "all" | "selected" = "all") => {
    setNotifying(mode);
    setNotifyMessage("");
    try {
      const response = await fetch("/api/v1/attendance/lecturer/warnings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(studentIds ? { studentIds } : {}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not send notice");
      setNotifyMessage(
        `Sent attendance advisory to ${data.notified} student${data.notified === 1 ? "" : "s"}.`,
      );
      setSelectedIds(new Set());
    } catch (e) {
      setNotifyMessage(e instanceof Error ? e.message : "Could not send notice");
    } finally {
      setNotifying(null);
      setTimeout(() => setNotifyMessage(""), 4000);
    }
  };

  const exportUnitsCSV = () => {
    if (!summary || summary.units.length === 0) return;
    const headers = [
      "Unit Code",
      "Unit Name",
      "Enrolled",
      "Sessions",
      "Check-ins",
      "Attendance Rate",
      "At-risk",
      "Status",
    ];
    const rows = summary.units.map((u) => [
      u.unitCode,
      `"${u.unitName}"`,
      u.enrolled,
      u.sessions,
      u.checkIns,
      `${u.attendanceRate}%`,
      u.atRiskCount,
      u.status,
    ]);
    const csv =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `unit-report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <RoleWorkspaceShell
      role="lecturer"
      eyebrow="Lecturer Insights"
      title="Reports"
      actions={
        summary && summary.units.length > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={exportUnitsCSV}
            className="h-6 px-2.5 text-[10px] gap-1"
          >
            <Download className="h-3 w-3" />
            <span>Export CSV</span>
          </Button>
        ) : undefined
      }
    >
      <main className="p-3 sm:p-4 max-w-[1100px] mx-auto text-[11px] space-y-3">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-[10.5px] text-red-700">
            {error}
          </div>
        )}
        {notifyMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[10.5px] text-emerald-800">
            {notifyMessage}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-[10.5px]">
            Loading reports...
          </div>
        ) : summary ? (
          <>
            <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50">
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileBarChart className="h-3.5 w-3.5 text-slate-500" />
                  <span>Unit report</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  {summary.currentTerm} · click a column to sort
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {summary.units.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-[10.5px]">
                    No teaching units selected yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        {SORT_COLUMNS.map((col) => (
                          <TableHead
                            key={col.field}
                            onClick={() => toggleSort(col.field)}
                            className={`h-8 cursor-pointer select-none text-[9.5px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 ${
                              col.field === "unitCode" ? "" : "text-right"
                            }`}
                          >
                            <span
                              className={`inline-flex items-center gap-0.5 ${
                                col.field === "unitCode" ? "" : "flex-row-reverse"
                              }`}
                            >
                              {col.label}
                              {sortField === col.field ? (
                                sortAsc ? (
                                  <ArrowUp className="h-2.5 w-2.5" />
                                ) : (
                                  <ArrowDown className="h-2.5 w-2.5" />
                                )
                              ) : (
                                <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />
                              )}
                            </span>
                          </TableHead>
                        ))}
                        <TableHead className="h-8 text-right text-[9.5px] font-bold uppercase tracking-wider text-slate-500">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedUnits.map((unit) => (
                        <TableRow key={unit.unitCode} className="text-[10.5px]">
                          <TableCell className="py-1.5">
                            <p className="font-bold text-slate-900 font-mono">{unit.unitCode}</p>
                            <p className="text-[9.5px] text-slate-500">{unit.unitName}</p>
                          </TableCell>
                          <TableCell className="py-1.5 text-right font-mono">{unit.enrolled}</TableCell>
                          <TableCell className="py-1.5 text-right font-mono">{unit.sessions}</TableCell>
                          <TableCell className="py-1.5 text-right font-mono">{unit.checkIns}</TableCell>
                          <TableCell className="py-1.5 text-right font-mono">{unit.attendanceRate}%</TableCell>
                          <TableCell className="py-1.5 text-right font-mono">
                            {unit.atRiskCount > 0 ? (
                              <span className="text-amber-600 font-bold">{unit.atRiskCount}</span>
                            ) : (
                              "0"
                            )}
                          </TableCell>
                          <TableCell className="py-1.5 text-right">
                            <Badge
                              variant="outline"
                              className={`text-[8.5px] font-mono ${statusBadgeClass(unit.status)}`}
                            >
                              {unit.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-200/90 bg-amber-50/20 shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-amber-100 px-3.5 py-2.5 bg-amber-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span>At-risk students ({summary.atRiskStudents.length})</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] text-amber-700/80">
                    Below the exam attendance threshold
                  </CardDescription>
                </div>
                {summary.atRiskStudents.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {selectedIds.size > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => notify([...selectedIds], "selected")}
                        disabled={notifying !== null}
                        className="h-6 px-2.5 text-[10px] gap-1 border-amber-300 text-amber-800 hover:bg-amber-50"
                      >
                        <Bell className="h-3 w-3" />
                        <span>
                          {notifying === "selected"
                            ? "Sending..."
                            : `Notify selected (${selectedIds.size})`}
                        </span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => notify(undefined, "all")}
                      disabled={notifying !== null}
                      className="h-6 px-2.5 text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1"
                    >
                      <Bell className="h-3 w-3" />
                      <span>{notifying === "all" ? "Sending..." : "Notify all"}</span>
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {summary.atRiskStudents.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-[10.5px] flex flex-col items-center gap-1.5">
                    <Users className="h-5 w-5 text-emerald-400" />
                    <span>No students currently below the attendance threshold.</span>
                  </div>
                ) : (
                  <>
                    <div className="border-b border-amber-100 px-3 py-2">
                      <div className="relative max-w-xs">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={studentQuery}
                          onChange={(e) => setStudentQuery(e.target.value)}
                          placeholder="Search by name, admission no., or unit..."
                          className="h-7 pl-7 text-[10.5px]"
                        />
                      </div>
                    </div>
                    <div className="divide-y divide-amber-100">
                      {filteredAtRisk.map((student) => (
                        <div
                          key={`${student.id}:${student.unitCode}`}
                          className="flex items-center justify-between px-3 py-2 gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(student.id)}
                              onChange={() => toggleSelected(student.id)}
                              className="h-3.5 w-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{student.name}</p>
                              <p className="text-[9.5px] text-slate-500 font-mono">
                                {student.admissionNumber} · {student.unitCode} ·{" "}
                                <span className="text-amber-700 font-bold">
                                  {student.attendanceRate}%
                                </span>{" "}
                                · {student.missedCount} missed
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => notify([student.id], student.id)}
                            disabled={notifying !== null}
                            className="h-6 px-2 text-[9.5px] gap-1 shrink-0 border-amber-300 text-amber-800 hover:bg-amber-50"
                          >
                            <Bell className="h-2.5 w-2.5" />
                            <span>{notifying === student.id ? "..." : "Notify"}</span>
                          </Button>
                        </div>
                      ))}
                      {filteredAtRisk.length === 0 && (
                        <div className="py-6 text-center text-slate-400 text-[10.5px]">
                          No students match &quot;{studentQuery}&quot;.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </RoleWorkspaceShell>
  );
}
