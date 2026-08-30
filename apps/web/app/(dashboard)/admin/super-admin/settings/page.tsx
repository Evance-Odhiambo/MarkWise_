"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Cpu,
  Globe,
  Radio,
  Save,
  Settings2,
  Shield,
  ShieldAlert,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AdminWorkspaceShell } from "@/components/features/admin/admin-workspace-shell";

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  category: "HARDWARE" | "SECURITY" | "PERFORMANCE" | "ONBOARDING";
  enabled: boolean;
  canaryPercent?: number;
}

const initialFlags: FeatureFlag[] = [
  {
    id: "flag-1",
    name: "BLE Quick Beacon Aggregation",
    key: "ble.quick_beacon_v2",
    description: "Enables sub-second BLE packet coalescing on student mobile devices.",
    category: "HARDWARE",
    enabled: true,
    canaryPercent: 100,
  },
  {
    id: "flag-2",
    name: "Enforce Multi-Factor WebAuthn",
    key: "security.mfa_enforced",
    description: "Requires FIDO2 / Passkeys for all institution administrators.",
    category: "SECURITY",
    enabled: true,
    canaryPercent: 100,
  },
  {
    id: "flag-3",
    name: "GPU Biometric Face Vector Acceleration",
    key: "ai.biometric_gpu_vectors",
    description: "Routes facial embedding similarity queries through dedicated CUDA workers.",
    category: "PERFORMANCE",
    enabled: true,
    canaryPercent: 75,
  },
  {
    id: "flag-4",
    name: "Offline IndexedDB Attendance Cache",
    key: "mobile.offline_sync_buffer",
    description: "Allows lecturers to record offline attendance when classroom Wi-Fi drops.",
    category: "PERFORMANCE",
    enabled: true,
    canaryPercent: 100,
  },
  {
    id: "flag-5",
    name: "Public Self-Service Institution Onboarding",
    key: "tenant.public_onboarding",
    description: "Allows university administrators to submit self-service onboarding applications.",
    category: "ONBOARDING",
    enabled: true,
    canaryPercent: 100,
  },
  {
    id: "flag-6",
    name: "Canary Automated BLE Range Reallocation",
    key: "ble.auto_reallocation_canary",
    description: "Experimental automated hex range defragmentation engine.",
    category: "HARDWARE",
    enabled: false,
    canaryPercent: 0,
  },
];

export default function SuperAdminSettingsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [bannerText, setBannerText] = useState("");
  const [bannerActive, setBannerActive] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const toggleFlag = (id: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    );
  };

  const handleSaveSettings = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <AdminWorkspaceShell
      eyebrow="Platform Controls"
      title="Feature Flags & Global Config"
      actions={
        <Button
          size="sm"
          onClick={handleSaveSettings}
          className="h-7 px-2.5 text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-xs"
        >
          <Save className="h-3 w-3" />
          <span>Save Changes</span>
        </Button>
      }
    >
      <main className="p-3 sm:p-4 space-y-3.5 max-w-[1700px] mx-auto text-[11px]">
        {/* Banner feedback */}
        {saveSuccess && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-[10.5px] text-emerald-800 flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Platform configurations synced to all distributed Fastify gateway nodes.</span>
          </div>
        )}

        {/* Global Banner Announcer */}
        <Card className="border-slate-200/90 bg-white shadow-2xs">
          <CardHeader className="border-b border-slate-100 px-3.5 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="h-3.5 w-3.5 text-slate-700" />
                <CardTitle className="text-xs font-bold text-slate-900">
                  System-Wide Announcement Banner
                </CardTitle>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-[10px] font-semibold text-slate-700">
                <span>Broadcast Live</span>
                <input
                  type="checkbox"
                  checked={bannerActive}
                  onChange={(e) => setBannerActive(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <p className="text-[10.5px] text-slate-500">
              Displays a notification bar at the top of every institution admin and student portal.
            </p>
            <div className="flex items-center gap-2">
              <Input
                placeholder="e.g. Scheduled system upgrade this Sunday from 02:00 to 04:00 UTC."
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                className="h-8 text-[11px]"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBannerText("")}
                className="h-8 px-2.5 text-[10.5px] shrink-0"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags Management Table */}
        <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-emerald-600" />
                <CardTitle className="text-xs font-bold text-slate-900">
                  Dynamic Feature Flags & Canary Engine
                </CardTitle>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                6 Configured Flags
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2 px-3">Feature Name & Key</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Rollout Scope</th>
                    <th className="py-2 px-3 text-right">Status Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {flags.map((flag) => (
                    <tr key={flag.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900 text-[11.5px]">
                          {flag.name}
                        </p>
                        <p className="text-[9px] font-mono text-slate-400">
                          {flag.key}
                        </p>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className="text-[8.5px] font-mono border-slate-200 text-slate-600"
                        >
                          {flag.category}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[10.5px] max-w-sm">
                        {flag.description}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-700">
                        {flag.enabled ? `${flag.canaryPercent}% Fleet` : "Disabled"}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => toggleFlag(flag.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold transition ${
                            flag.enabled
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              flag.enabled ? "bg-emerald-600" : "bg-slate-400"
                            }`}
                          />
                          {flag.enabled ? "ENABLED" : "DISABLED"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Mode Danger Zone */}
        <Card className="border-red-200 bg-red-50/30 shadow-2xs">
          <CardHeader className="border-b border-red-100 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <CardTitle className="text-xs font-bold text-slate-900">
                Emergency Maintenance Mode Freeze
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="font-bold text-slate-900 text-[11px]">
                Platform-Wide Read-Only Lock
              </p>
              <p className="text-[10px] text-slate-600 max-w-xl leading-relaxed">
                When enabled, all student check-ins and institution curriculum writes are temporarily suspended 
                with a maintenance page. Super admin root bypass remains active.
              </p>
            </div>
            <button
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`rounded-lg px-3 py-1.5 text-[10.5px] font-bold transition shrink-0 ${
                maintenanceMode
                  ? "bg-red-600 text-white shadow-xs"
                  : "border border-red-300 bg-white text-red-700 hover:bg-red-50"
              }`}
            >
              {maintenanceMode ? "MAINTENANCE ACTIVE (CLICK TO DISENGAGE)" : "Enable Maintenance Mode"}
            </button>
          </CardContent>
        </Card>
      </main>
    </AdminWorkspaceShell>
  );
}

