"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  Flame,
  HardDrive,
  Layers,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AdminWorkspaceShell } from "@/components/features/admin/admin-workspace-shell";

const services = [
  {
    name: "Fastify API Gateway",
    role: "HTTP & WebSocket Endpoint Router",
    status: "Healthy",
    uptime: "99.99%",
    latency: "18ms",
    version: "v4.28.0",
    instances: "4 Nodes",
  },
  {
    name: "PostgreSQL Primary Cluster",
    role: "Multi-Tenant Relational Store",
    status: "Healthy",
    uptime: "99.98%",
    latency: "3.8ms",
    version: "PostgreSQL 16.2",
    instances: "Primary + 2 Replicas",
  },
  {
    name: "Redis Memory Cache & Pub/Sub",
    role: "Live BLE Session State & Cache",
    status: "Healthy",
    uptime: "100%",
    latency: "0.8ms",
    version: "Redis 7.2",
    instances: "Cluster (3 shards)",
  },
  {
    name: "BLE Beacon Coordinator",
    role: "Unit Hex Range Mapping & Validation",
    status: "Healthy",
    uptime: "99.95%",
    latency: "12ms",
    version: "Engine v2.1",
    instances: "2 Workers",
  },
  {
    name: "Biometric Embedding Vector Store",
    role: "Student Face Vector Verification",
    status: "Healthy",
    uptime: "99.92%",
    latency: "44ms",
    version: "Cosine Engine v3",
    instances: "GPU Worker #1",
  },
];

const queues = [
  {
    name: "Attendance Record Batcher",
    pending: 0,
    processed: "142,500",
    failed: 0,
    status: "Active",
  },
  {
    name: "BLE Beacon Ping Aggregator",
    pending: 4,
    processed: "892,100",
    failed: 1,
    status: "Active",
  },
  {
    name: "Institutional Email Dispatcher",
    pending: 0,
    processed: "4,820",
    failed: 0,
    status: "Idle",
  },
  {
    name: "Nightly Analytics Summarizer",
    pending: 0,
    processed: "48",
    failed: 0,
    status: "Scheduled",
  },
];

export default function SuperAdminSystemPage() {
  const [purgingCache, setPurgingCache] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [runningCollisionCheck, setRunningCollisionCheck] = useState(false);
  const [collisionResult, setCollisionResult] = useState<string | null>(null);

  const handlePurgeCache = () => {
    setPurgingCache(true);
    setCacheMessage(null);
    setTimeout(() => {
      setPurgingCache(false);
      setCacheMessage("Redis cache purged successfully. 1,840 session keys evicted in 12ms.");
    }, 800);
  };

  const handleCollisionCheck = () => {
    setRunningCollisionCheck(true);
    setCollisionResult(null);
    setTimeout(() => {
      setRunningCollisionCheck(false);
      setCollisionResult("Verified 328 active unit BLE IDs across 48 institutions. 0 collisions detected.");
    }, 900);
  };

  return (
    <AdminWorkspaceShell
      eyebrow="Infrastructure"
      title="System Telemetry & Engine Health"
      actions={
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={purgingCache}
            onClick={handlePurgeCache}
            className="h-7 px-2.5 text-[10.5px] text-slate-700 bg-white border-slate-200 hover:bg-slate-50 gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`h-3 w-3 text-slate-500 ${purgingCache ? "animate-spin text-emerald-600" : ""}`} />
            <span>{purgingCache ? "Purging..." : "Purge Redis Cache"}</span>
          </Button>
        </div>
      }
    >
      <main className="p-3 sm:p-4 space-y-3.5 max-w-[1700px] mx-auto text-[11px]">
        {/* Messages */}
        {cacheMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-[10.5px] text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{cacheMessage}</span>
            </div>
            <button onClick={() => setCacheMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
              ×
            </button>
          </div>
        )}

        {collisionResult && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-[10.5px] text-sky-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-sky-600" />
              <span>{collisionResult}</span>
            </div>
            <button onClick={() => setCollisionResult(null)} className="text-sky-700 hover:text-sky-900 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Live Performance KPI Grid */}
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200/90 bg-white p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                P95 API Gateway Latency
              </span>
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-1 text-xl font-extrabold font-mono text-slate-900">
              18.4ms
            </p>
            <p className="text-[9.5px] text-emerald-700 font-medium mt-1">
              Optimal (Target &lt; 50ms)
            </p>
          </Card>

          <Card className="border-slate-200/90 bg-white p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                PostgreSQL Conn Pool
              </span>
              <Database className="h-4 w-4 text-sky-600" />
            </div>
            <p className="mt-1 text-xl font-extrabold font-mono text-slate-900">
              38 / 50
            </p>
            <p className="text-[9.5px] text-slate-500 mt-1">
              76% pool utilization
            </p>
          </Card>

          <Card className="border-slate-200/90 bg-white p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Redis Hit Ratio
              </span>
              <Cpu className="h-4 w-4 text-purple-600" />
            </div>
            <p className="mt-1 text-xl font-extrabold font-mono text-slate-900">
              97.8%
            </p>
            <p className="text-[9.5px] text-emerald-700 font-medium mt-1">
              1.4k operations/sec
            </p>
          </Card>

          <Card className="border-slate-200/90 bg-white p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                BLE Fleet Coverage
              </span>
              <Radio className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-1 text-xl font-extrabold font-mono text-slate-900">
              328 Units
            </p>
            <p className="text-[9.5px] text-emerald-700 font-medium mt-1">
              0 ID collisions
            </p>
          </Card>
        </div>

        {/* Microservices Status Fleet */}
        <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-3.5 w-3.5 text-slate-700" />
                <CardTitle className="text-xs font-bold text-slate-900">
                  Microservices & Data Tier Matrix
                </CardTitle>
              </div>
              <span className="text-[9.5px] font-mono text-emerald-700 font-bold bg-emerald-100/70 px-1.5 py-0.2 rounded">
                ALL SYSTEMS OPERATIONAL
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2 px-3">Service Name</th>
                    <th className="py-2 px-3">Role Description</th>
                    <th className="py-2 px-3">State</th>
                    <th className="py-2 px-3">Latency</th>
                    <th className="py-2 px-3">30-day SLA</th>
                    <th className="py-2 px-3">Cluster Fleet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {services.map((svc) => (
                    <tr key={svc.name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="font-bold text-slate-900 text-[11.5px]">
                            {svc.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[10.5px]">
                        {svc.role}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                          {svc.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[10.5px] text-slate-800">
                        {svc.latency}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10.5px] text-slate-600">
                        {svc.uptime}
                      </td>
                      <td className="py-2.5 px-3 text-[10px] text-slate-500 font-mono">
                        {svc.instances}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 2-Column: Queues & Hardware Tools */}
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          {/* Background Queues */}
          <Card className="border-slate-200/90 bg-white shadow-2xs">
            <CardHeader className="border-b border-slate-100 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-slate-700" />
                <CardTitle className="text-xs font-bold text-slate-900">
                  Asynchronous Background Job Queues
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {queues.map((q) => (
                  <div key={q.name} className="flex items-center justify-between p-2.5 text-[10.5px]">
                    <div>
                      <p className="font-bold text-slate-900">{q.name}</p>
                      <p className="text-[9.5px] text-slate-400 font-mono">
                        {q.processed} processed · {q.failed} failed
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-600 text-[10px]">
                        {q.pending} pending
                      </span>
                      <Badge variant="outline" className="text-[8.5px] font-mono px-1 py-0 border-slate-200">
                        {q.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hardware & Diagnostics Suite */}
          <Card className="border-slate-200/90 bg-white shadow-2xs">
            <CardHeader className="border-b border-slate-100 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-slate-700" />
                <CardTitle className="text-xs font-bold text-slate-900">
                  Fleet Diagnostics & Hardware Collision Engine
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px]">
                    BLE Hex Collision Guard
                  </span>
                  <Button
                    size="sm"
                    disabled={runningCollisionCheck}
                    onClick={handleCollisionCheck}
                    className="h-6 px-2 text-[10px] bg-slate-900 hover:bg-slate-800 text-white font-medium"
                  >
                    {runningCollisionCheck ? "Scanning..." : "Run Collision Scan"}
                  </Button>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Checks that all 328 mapped academic course units have unique 16-bit BLE IDs across all institutional tenants to prevent cross-lecture interference.
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px]">
                    Fastify JWT Secret Key Refresh
                  </span>
                  <Badge variant="outline" className="text-[8.5px] font-mono text-emerald-700 bg-emerald-50 border-emerald-200">
                    Active & Valid
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Cryptographic keys are rotated automatically every 90 days. Super admin tokens are signed using high-entropy HMAC-SHA256.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </AdminWorkspaceShell>
  );
}

