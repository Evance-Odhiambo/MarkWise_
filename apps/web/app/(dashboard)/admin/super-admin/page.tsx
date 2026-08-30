"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Radio,
  RefreshCw,
  Search,
  Server,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AdminWorkspaceShell } from "@/components/features/admin/admin-workspace-shell";

const kpiStats = [
  {
    title: "Registered Institutions",
    value: "48",
    delta: "+3 this month",
    subtext: "42 active · 6 onboarding",
    icon: Building2,
    tone: "emerald",
  },
  {
    title: "Pending Approvals",
    value: "5",
    delta: "Action needed",
    subtext: "Avg review time 1.4h",
    icon: FileCheck2,
    tone: "amber",
  },
  {
    title: "BLE Beacon Units",
    value: "328",
    delta: "99.8% mapped",
    subtext: "Signal health optimal",
    icon: Radio,
    tone: "sky",
  },
  {
    title: "System Throughput",
    value: "1.4k",
    delta: "22ms p95 latency",
    subtext: "Zero error spikes today",
    icon: Activity,
    tone: "violet",
  },
];

const pendingQueue = [
  {
    id: "app-1",
    institution: "University of Nairobi",
    code: "UON",
    requester: "Jane Wambui",
    role: "Registrar Academic",
    email: "j.wambui@uonbi.ac.ke",
    submitted: "12m ago",
    domainVerified: true,
  },
  {
    id: "app-2",
    institution: "Maseno University",
    code: "MSU",
    requester: "Dr. Chris Otieno",
    role: "Dean of Science",
    email: "c.otieno@maseno.ac.ke",
    submitted: "45m ago",
    domainVerified: true,
  },
  {
    id: "app-3",
    institution: "Kisii Technical College",
    code: "KTC",
    requester: "Mary Njeri",
    role: "ICT Director",
    email: "m.njeri@kisiitech.ac.ke",
    submitted: "2h ago",
    domainVerified: false,
  },
];

const institutionPipeline = [
  {
    name: "Strathmore University",
    code: "SU",
    status: "Production Live",
    progress: 96,
    students: "4,200",
    lecturers: "180",
    bleBeacons: 64,
  },
  {
    name: "Kenyatta University",
    code: "KU",
    status: "Curriculum Setup",
    progress: 74,
    students: "12,500",
    lecturers: "420",
    bleBeacons: 112,
  },
  {
    name: "Egerton University",
    code: "EGU",
    status: "Roster Ingest",
    progress: 58,
    students: "6,100",
    lecturers: "210",
    bleBeacons: 48,
  },
  {
    name: "Jomo Kenyatta Univ. of Ag & Tech",
    code: "JKUAT",
    status: "Beacon Calibration",
    progress: 88,
    students: "8,900",
    lecturers: "340",
    bleBeacons: 96,
  },
];

const recentAuditLogs = [
  {
    id: "log-1",
    actor: "Admin (Evance O.)",
    action: "Approved Institution Onboarding",
    target: "Strathmore University",
    time: "4m ago",
    type: "SUCCESS",
  },
  {
    id: "log-2",
    actor: "System Sync",
    action: "Assigned 18 BLE Beacon IDs",
    target: "CompSci Unit Batch #4",
    time: "18m ago",
    type: "INFO",
  },
  {
    id: "log-3",
    actor: "Admin (Evance O.)",
    action: "Updated Global Feature Flags",
    target: "BLE Quick Beacon Canary",
    time: "1h ago",
    type: "WARN",
  },
  {
    id: "log-4",
    actor: "Auth Guard",
    action: "Super Admin Access Token Issued",
    target: "Session IP 192.168.1.104",
    time: "2h ago",
    type: "SUCCESS",
  },
];

export default function SuperAdminDashboardPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [liveUptime, setLiveUptime] = useState("99.98%");
  const [liveConns, setLiveConns] = useState(38);

  const handleManualRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setLiveConns(Math.floor(35 + Math.random() * 8));
    }, 600);
  };

  return (
    <AdminWorkspaceShell
      eyebrow="Mission Control"
      title="Platform Operations Center"
      actions={
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            className="h-7 px-2 text-[10.5px] gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <RefreshCw
              className={`h-3 w-3 text-slate-500 ${
                refreshing ? "animate-spin text-emerald-600" : ""
              }`}
            />
            <span>Refresh</span>
          </Button>
          <Link href="/admin/super-admin/institutions">
            <Button
              size="sm"
              className="h-7 px-2.5 text-[10.5px] gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
            >
              <Building2 className="h-3 w-3" />
              <span>Institutions</span>
            </Button>
          </Link>
        </div>
      }
    >
      <main className="p-3 sm:p-4 space-y-3.5 max-w-[1700px] mx-auto text-[11px]">
        {/* Top Executive Mission Banner */}
        <div className="rounded-xl border border-slate-200/90 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-4 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                Root Authority Mode
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Cluster: af-south-1 · v2.4.0
              </span>
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Platform Mission Control & Multi-Tenant Fleet
            </h2>
            <p className="text-[10.5px] text-slate-300 max-w-2xl leading-relaxed">
              Supervising 48 institutional tenants, active BLE attendance broadcast beacons, 
              identity sync pipelines, and governance approval workflows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/super-admin/onboarding">
              <Button
                size="sm"
                className="h-7 px-3 text-[10.5px] bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold gap-1.5 shadow-xs"
              >
                <FileCheck2 className="h-3 w-3" />
                <span>Review Approvals (5)</span>
              </Button>
            </Link>
            <Link href="/admin/super-admin/system">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-[10.5px] border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white gap-1.5"
              >
                <Radio className="h-3 w-3 text-emerald-400" />
                <span>Telemetry Status</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 4-KPI Metric Cards Grid */}
        <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {kpiStats.map((stat) => {
            const Icon = stat.icon;
            const toneBorder =
              stat.tone === "emerald"
                ? "border-emerald-200/80 hover:border-emerald-300"
                : stat.tone === "amber"
                  ? "border-amber-200/80 hover:border-amber-300"
                  : stat.tone === "sky"
                    ? "border-sky-200/80 hover:border-sky-300"
                    : "border-purple-200/80 hover:border-purple-300";

            const toneIcon =
              stat.tone === "emerald"
                ? "bg-emerald-50 text-emerald-600"
                : stat.tone === "amber"
                  ? "bg-amber-50 text-amber-600"
                  : stat.tone === "sky"
                    ? "bg-sky-50 text-sky-600"
                    : "bg-purple-50 text-purple-600";

            return (
              <Card
                key={stat.title}
                className={`bg-white shadow-2xs transition-all ${toneBorder} p-3`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {stat.title}
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-extrabold tracking-tight text-slate-900 font-mono">
                        {stat.value}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-semibold ${
                          stat.tone === "emerald"
                            ? "bg-emerald-50 text-emerald-700"
                            : stat.tone === "amber"
                              ? "bg-amber-50 text-amber-700"
                              : stat.tone === "sky"
                                ? "bg-sky-50 text-sky-700"
                                : "bg-purple-50 text-purple-700"
                        }`}
                      >
                        {stat.delta}
                      </span>
                    </div>
                  </div>
                  <div className={`rounded-lg p-2 ${toneIcon}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-[9.5px] text-slate-500 border-t border-slate-100 pt-1.5">
                  {stat.subtext}
                </p>
              </Card>
            );
          })}
        </section>

        {/* Main 2-Column Split View */}
        <section className="grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
          {/* Left Column: Approvals & Pipeline */}
          <div className="space-y-3">
            {/* Urgent Approval Queue Preview */}
            <Card className="border-slate-200/90 bg-white shadow-2xs">
              <CardHeader className="border-b border-slate-100 px-3.5 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-amber-800">
                      <FileCheck2 className="h-3 w-3" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-bold text-slate-900">
                        Pending Institution Approvals
                      </CardTitle>
                      <CardDescription className="text-[10px] text-slate-500">
                        Applications waiting for Super Admin authorization & provisioning
                      </CardDescription>
                    </div>
                  </div>
                  <Link
                    href="/admin/super-admin/onboarding"
                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <span>View All Queue</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {pendingQueue.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 hover:bg-slate-50/80 transition"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-[11.5px]">
                            {item.institution}
                          </span>
                          <Badge
                            variant="outline"
                            className="bg-slate-50 text-[9px] px-1 py-0 border-slate-200 font-mono"
                          >
                            {item.code}
                          </Badge>
                          {item.domainVerified ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Domain Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                              Unverified Domain
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {item.requester} · {item.role} · <span className="font-mono text-slate-600">{item.email}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9.5px] text-slate-400 font-mono">
                          {item.submitted}
                        </span>
                        <Link href="/admin/super-admin/onboarding">
                          <Button
                            size="sm"
                            className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs"
                          >
                            Review Dossier
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Institution Rollout & Readiness Pipeline */}
            <Card className="border-slate-200/90 bg-white shadow-2xs">
              <CardHeader className="border-b border-slate-100 px-3.5 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-800">
                      <Sparkles className="h-3 w-3" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-bold text-slate-900">
                        Institution Rollout & Readiness Pipeline
                      </CardTitle>
                      <CardDescription className="text-[10px] text-slate-500">
                        Academic setup, BLE beacon assignment, and staff onboarding status
                      </CardDescription>
                    </div>
                  </div>
                  <Link
                    href="/admin/super-admin/institutions/overview"
                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <span>Full Matrix</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {institutionPipeline.map((row) => (
                    <div
                      key={row.code}
                      className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 transition"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-[11.5px]">
                            {row.name}
                          </span>
                          <span className="rounded bg-slate-100 px-1 py-0 text-[8.5px] font-mono text-slate-600">
                            {row.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span>{row.students} Students</span>
                          <span>·</span>
                          <span>{row.lecturers} Lecturers</span>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-sky-700 font-medium">
                            <Radio className="h-2.5 w-2.5" />
                            {row.bleBeacons} BLE Units
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 md:w-60">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-medium text-slate-700 truncate">
                              {row.status}
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {row.progress}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                row.progress > 85
                                  ? "bg-emerald-500"
                                  : row.progress > 60
                                    ? "bg-sky-500"
                                    : "bg-amber-500"
                              }`}
                              style={{ width: `${row.progress}%` }}
                            />
                          </div>
                        </div>
                        <Link href={`/admin/super-admin/institutions`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-900"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Telemetry & Live Stream */}
          <div className="space-y-3">
            {/* Live Telemetry Health Box */}
            <Card className="border-slate-200/90 bg-white shadow-2xs">
              <CardHeader className="border-b border-slate-100 px-3 py-2 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5 text-emerald-600" />
                    <CardTitle className="text-xs font-bold text-slate-900">
                      Live Telemetry Health
                    </CardTitle>
                  </div>
                  <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded font-bold">
                    ONLINE
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                    <div className="flex items-center gap-1 text-slate-500 text-[9.5px]">
                      <Database className="h-3 w-3 text-slate-400" />
                      <span>PostgreSQL Pool</span>
                    </div>
                    <p className="mt-1 font-mono font-bold text-xs text-slate-900">
                      {liveConns}/50 conns
                    </p>
                    <p className="text-[8.5px] text-emerald-600 font-medium">
                      Healthy · 4.2ms avg
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                    <div className="flex items-center gap-1 text-slate-500 text-[9.5px]">
                      <Cpu className="h-3 w-3 text-slate-400" />
                      <span>Redis Cache Hit</span>
                    </div>
                    <p className="mt-1 font-mono font-bold text-xs text-slate-900">
                      97.4%
                    </p>
                    <p className="text-[8.5px] text-emerald-600 font-medium">
                      Optimal (1.2k op/s)
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200/80 bg-slate-900 p-2.5 text-white">
                  <div className="flex items-center justify-between text-[9.5px] text-slate-400 mb-1">
                    <span>BLE BLEID Broadcast Queue</span>
                    <span className="text-emerald-400 font-mono">0 pending</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-200">
                      Hardware Synced
                    </span>
                    <span className="font-mono text-[10px] text-slate-300">
                      328 Units Active
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] pt-1">
                  <span className="text-slate-500">Service SLA Target</span>
                  <span className="font-mono font-bold text-slate-800">
                    {liveUptime}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Audit Log Stream */}
            <Card className="border-slate-200/90 bg-white shadow-2xs">
              <CardHeader className="border-b border-slate-100 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-slate-700" />
                    <CardTitle className="text-xs font-bold text-slate-900">
                      Live Audit Stream
                    </CardTitle>
                  </div>
                  <Link
                    href="/admin/super-admin/security"
                    className="text-[10px] font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    All Logs
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-2 space-y-1.5">
                {recentAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-md border border-slate-100 bg-slate-50/70 p-2 text-[10px] space-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 truncate">
                        {log.action}
                      </span>
                      <span className="font-mono text-[9px] text-slate-400 shrink-0">
                        {log.time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[9.5px]">
                      <span>{log.actor}</span>
                      <span className="text-slate-400 font-mono truncate max-w-[130px]">
                        {log.target}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Admin Quick Actions Bar */}
            <Card className="border-slate-200/90 bg-gradient-to-br from-emerald-50/60 to-teal-50/30 p-3 shadow-2xs">
              <p className="text-[10.5px] font-bold text-slate-900 mb-2">
                Fast Administrative Tasks
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <Link
                  href="/admin/super-admin/institutions?action=new"
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-white p-2 text-[10px] font-medium text-slate-800 hover:bg-emerald-50/50 hover:border-emerald-300 transition"
                >
                  <Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Add Institution</span>
                </Link>
                <Link
                  href="/setup"
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-white p-2 text-[10px] font-medium text-slate-800 hover:bg-emerald-50/50 hover:border-emerald-300 transition"
                >
                  <BriefcaseBusiness className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Setup School</span>
                </Link>
                <Link
                  href="/admin/super-admin/system"
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-white p-2 text-[10px] font-medium text-slate-800 hover:bg-emerald-50/50 hover:border-emerald-300 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Flush Cache</span>
                </Link>
                <Link
                  href="/admin/super-admin/settings"
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-white p-2 text-[10px] font-medium text-slate-800 hover:bg-emerald-50/50 hover:border-emerald-300 transition"
                >
                  <Settings2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Feature Flags</span>
                </Link>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </AdminWorkspaceShell>
  );
}
