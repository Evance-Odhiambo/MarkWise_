"use client";

import { useState } from "react";
import { CheckCircle2, Globe, RefreshCw, Server, Zap } from "lucide-react";
import type { Lecturer } from "../../../types/setup-lecturer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ApiImportFormProps {
  institutionId: string;
  onDataImported: (data: Lecturer[]) => void;
}

export function LecturerApiImportForm({
  institutionId,
  onDataImported,
}: ApiImportFormProps) {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFetch = async () => {
    if (!apiUrl.trim()) {
      setError("API Endpoint URL is required");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey.trim()) headers["Authorization"] = `Bearer ${apiKey.trim()}`;

      const response = await fetch(apiUrl.trim(), { headers });
      if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);

      const data = await response.json();
      const rawList = Array.isArray(data) ? data : data.lecturers || data.staff || [];

      if (!Array.isArray(rawList) || rawList.length === 0) {
        throw new Error("No staff records found in API response payload");
      }

      const formatted: Lecturer[] = rawList.map((item, idx) => ({
        id: item.id || `api-lec-${Date.now()}-${idx}`,
        name: item.name || `${item.firstName || ""} ${item.lastName || ""}`.trim(),
        staffNumber: item.staffNumber || item.employeeId || item.code || `EMP-${idx + 1}`,
      }));

      setSuccess(`Synced ${formatted.length} lecturer profiles successfully`);
      onDataImported(formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 text-[11px]">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-[10.5px] text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-[10.5px] text-emerald-800 flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
            External LMS/HR API Endpoint
          </label>
          <Input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://hr.university.edu/api/v1/lecturers"
            className="h-7 text-[10.5px] font-mono"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
            Bearer Token / API Secret (Optional)
          </label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="••••••••••••••••"
            className="h-7 text-[10.5px] font-mono"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
        <Button
          type="button"
          size="sm"
          disabled={loading}
          onClick={handleFetch}
          className="h-7 px-3 text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Connecting..." : "Trigger API Sync"}</span>
        </Button>
      </div>
    </div>
  );
}
