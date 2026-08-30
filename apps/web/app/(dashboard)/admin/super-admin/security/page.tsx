"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCode,
  Globe,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  User,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AdminWorkspaceShell } from "@/components/features/admin/admin-workspace-shell";
import { AdminInspectorDrawer } from "@/components/features/admin/admin-inspector-drawer";

interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  actorRole: "SUPER_ADMIN" | "INSTITUTION_ADMIN" | "SYSTEM_DAEMON";
  action: string;
  category: "AUTH" | "TENANT" | "SETUP" | "BLE_HARDWARE" | "SECURITY";
  severity: "INFO" | "WARN" | "CRITICAL" | "SUCCESS";
  ipAddress: string;
  location: string;
  payload: Record<string, unknown>;
}

const mockAuditLogs: AuditLog[] = [
  {
    id: "evt-9042",
    timestamp: "2 mins ago",
    actorName: "Evance Odhiambo",
    actorEmail: "evance@markwise.edu",
    actorRole: "SUPER_ADMIN",
    action: "Approved Institution Onboarding",
    category: "TENANT",
    severity: "SUCCESS",
    ipAddress: "197.232.84.112",
    location: "Nairobi, KE",
    payload: {
      institutionId: "inst-uon-01",
      institutionName: "University of Nairobi",
      domain: "uonbi.ac.ke",
      issuedAt: new Date().toISOString(),
    },
  },
  {
    id: "evt-9041",
    timestamp: "14 mins ago",
    actorName: "Hardware Mapping Daemon",
    actorEmail: "ble-worker@internal",
    actorRole: "SYSTEM_DAEMON",
    action: "Generated 32 BLE Hex Unit IDs",
    category: "BLE_HARDWARE",
    severity: "INFO",
    ipAddress: "10.0.4.18",
    location: "VPC Internal",
    payload: {
      batchId: "batch-381",
      allocatedRange: ["0x3F1A", "0x3F3A"],
      collisionChecked: true,
    },
  },
  {
    id: "evt-9040",
    timestamp: "45 mins ago",
    actorName: "Dr. Chris Otieno",
    actorEmail: "c.otieno@maseno.ac.ke",
    actorRole: "INSTITUTION_ADMIN",
    action: "Mutated Academic Curriculum Structure",
    category: "SETUP",
    severity: "WARN",
    ipAddress: "196.201.214.5",
    location: "Kisumu, KE",
    payload: {
      institutionId: "inst-msu-02",
      courseId: "course-cs-101",
      unitsUpdated: 6,
      semestersModified: 2,
    },
  },
  {
    id: "evt-9039",
    timestamp: "1h 12m ago",
    actorName: "Security Guard Monitor",
    actorEmail: "secops@markwise.edu",
    actorRole: "SYSTEM_DAEMON",
    action: "Invalid Super Admin Sign-in Attempt",
    category: "AUTH",
    severity: "CRITICAL",
    ipAddress: "45.142.122.9",
    location: "Frankfurt, DE",
    payload: {
      attemptedEmail: "root@markwise.edu",
      reason: "Invalid password hash",
      rateLimitRemaining: 2,
    },
  },
  {
    id: "evt-9038",
    timestamp: "2h 4m ago",
    actorName: "Evance Odhiambo",
    actorEmail: "evance@markwise.edu",
    actorRole: "SUPER_ADMIN",
    action: "Purged Redis Gateway Session Cache",
    category: "SECURITY",
    severity: "INFO",
    ipAddress: "197.232.84.112",
    location: "Nairobi, KE",
    payload: {
      keysRemoved: 1420,
      executionMs: 14,
    },
  },
];

const activeAdminSessions = [
  {
    id: "sess-1",
    user: "Evance Odhiambo (You)",
    role: "SUPER_ADMIN",
    ip: "197.232.84.112",
    device: "Chrome / Windows 11",
    status: "Active Now",
    expiresIn: "18h 40m",
  },
  {
    id: "sess-2",
    user: "Security Ops Daemon",
    role: "SYSTEM_DAEMON",
    ip: "10.0.4.18",
    device: "Node Fastify Cluster",
    status: "Active Now",
    expiresIn: "Permanent Token",
  },
];

export default function SuperAdminSecurityPage() {
  const [logs, setLogs] = useState<AuditLog[]>(mockAuditLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actorEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ipAddress.includes(searchTerm);

      const matchSeverity = severityFilter === "ALL" || log.severity === severityFilter;
      const matchCategory = categoryFilter === "ALL" || log.category === categoryFilter;

      return matchSearch && matchSeverity && matchCategory;
    });
  }, [logs, searchTerm, severityFilter, categoryFilter]);

  const exportAuditTrail = () => {
    const headers = ["ID", "Timestamp", "Actor", "Role", "Action", "Category", "Severity", "IP Address", "Location"];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      `"${l.actorName} (${l.actorEmail})"`,
      l.actorRole,
      `"${l.action}"`,
      l.category,
      l.severity,
      l.ipAddress,
      l.location,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `markwise_audit_trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminWorkspaceShell
      eyebrow="Governance & SecOps"
      title="Security & Audit Trail"
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={exportAuditTrail}
          className="h-7 px-2.5 text-[10.5px] text-slate-700 bg-white border-slate-200 hover:bg-slate-50 gap-1.5 shadow-2xs"
        >
          <Download className="h-3 w-3 text-slate-500" />
          <span>Export Audit Log</span>
        </Button>
      }
    >
      <main className="p-3 sm:p-4 space-y-3.5 max-w-[1700px] mx-auto text-[11px]">
        {/* Security Overview Cards */}
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200/90 bg-white p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Super Admin Sessions
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-1 text-xl font-extrabold font-mono text-slate-900">
              2 Active
            </p>
            <p className="text-[9.5px] text-emerald-700 font-medium mt-1">
              Zero unverified origins
            </p>
          </Card>

          <Card className="border-slate-200/90 bg-white p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Failed Auth Attempts (24h)
              </span>
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-1 text-xl font-extrabold font-mono text-slate-900">
              1 Flagged
            </p>
            <p className="text-[9.5px] text-slate-500 mt-1">
              Auto-isolated via rate limiter
            </p>
          </Card>

          <Card className="border-slate-200/90 bg-white p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                JWT Token Signer Key
              </span>
              <KeyRound className="h-4 w-4 text-sky-600" />
            </div>
            <p className="mt-1 text-xl font-extrabold font-mono text-slate-900">
              Ed25519
            </p>
            <p className="text-[9.5px] text-emerald-700 font-medium mt-1">
              Hardware Secure enclave
            </p>
          </Card>

          <Card className="border-slate-200/90 bg-white p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Compliance Status
              </span>
              <Shield className="h-4 w-4 text-purple-600" />
            </div>
            <p className="mt-1 text-xl font-extrabold font-mono text-emerald-700">
              ISO 27001 / GDPR
            </p>
            <p className="text-[9.5px] text-slate-500 mt-1">
              Audit trails immutable
            </p>
          </Card>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit actions, emails, IPs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 pl-8 pr-2 text-[10.5px] text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>

            {/* Severity Filter */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[10px]">
              {["ALL", "CRITICAL", "WARN", "SUCCESS", "INFO"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`rounded-md px-2 py-0.5 font-medium transition ${
                    severityFilter === sev
                      ? "bg-white text-slate-900 font-semibold shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[10px]">
              {["ALL", "AUTH", "TENANT", "SETUP", "BLE_HARDWARE"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-md px-2 py-0.5 font-medium transition ${
                    categoryFilter === cat
                      ? "bg-white text-slate-900 font-semibold shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <span className="text-[10px] text-slate-500 font-mono">
            {filteredLogs.length} events recorded
          </span>
        </div>

        {/* High Density Audit Table */}
        <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">Actor & Role</th>
                  <th className="py-2 px-3">Action Event</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Severity</th>
                  <th className="py-2 px-3">IP Address / Geo</th>
                  <th className="py-2 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-2 px-3">
                      <p className="font-semibold text-slate-900 text-[11px]">
                        {log.actorName}
                      </p>
                      <p className="text-[9.5px] text-slate-400 font-mono">
                        {log.actorEmail}
                      </p>
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800 text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-2 px-3">
                      <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[8.5px] font-bold font-mono text-slate-600">
                        {log.category}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[9px] font-bold ${
                          log.severity === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : log.severity === "INFO"
                              ? "bg-sky-50 text-sky-700 border border-sky-200"
                              : log.severity === "WARN"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[10px] text-slate-600">
                      {log.ipAddress} <span className="text-slate-400">({log.location})</span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        className="h-6 px-2 text-[10px] text-slate-700 hover:bg-slate-100 gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Inspect</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Active Sessions Drawer / Panel */}
        <Card className="border-slate-200/90 bg-white p-3 shadow-2xs">
          <CardHeader className="p-0 pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-slate-700" />
                <CardTitle className="text-xs font-bold text-slate-900">
                  Active Administrative Sessions
                </CardTitle>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Real-time Heartbeat
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-2 space-y-2">
            {activeAdminSessions.map((sess) => (
              <div
                key={sess.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-[10.5px] gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{sess.user}</span>
                    <Badge variant="outline" className="text-[8.5px] font-mono px-1 py-0">
                      {sess.role}
                    </Badge>
                  </div>
                  <p className="text-slate-500 text-[10px]">
                    {sess.device} · IP {sess.ip} · Expires in {sess.expiresIn}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[9.5px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {sess.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* JSON Payload Inspector Drawer */}
        <AdminInspectorDrawer
          open={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={selectedLog?.action || "Audit Event Payload"}
          subtitle={`Event ID: ${selectedLog?.id || ""}`}
          badge={
            <Badge
              variant="outline"
              className="text-[9px] border-slate-200 bg-slate-100 font-mono"
            >
              {selectedLog?.severity}
            </Badge>
          }
          footer={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLog(null)}
              className="h-7 text-[10.5px]"
            >
              Close
            </Button>
          }
        >
          {selectedLog && (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-1 text-[10.5px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="font-mono text-slate-700">{selectedLog.timestamp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Actor:</span>
                  <span className="font-bold text-slate-800">{selectedLog.actorName} ({selectedLog.actorEmail})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Origin IP:</span>
                  <span className="font-mono text-slate-800">{selectedLog.ipAddress} ({selectedLog.location})</span>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 text-[11px] mb-1">
                  Structured Payload Data (JSON)
                </p>
                <pre className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-[10px] font-mono text-emerald-400 overflow-x-auto">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </AdminInspectorDrawer>
      </main>
    </AdminWorkspaceShell>
  );
}

