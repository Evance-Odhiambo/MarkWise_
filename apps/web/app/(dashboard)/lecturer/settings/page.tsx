"use client";

import { useState } from "react";
import { CheckCircle2, Radio, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleWorkspaceShell } from "@/components/layout/role-workspace-shell";

export default function LecturerSettingsPage() {
  const [bleAutoCheckin, setBleAutoCheckin] = useState(true);
  const [sessionAutoExpiry, setSessionAutoExpiry] = useState("45");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSavePreferences = () => {
    setToastMessage("Preferences updated successfully.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <RoleWorkspaceShell
      role="lecturer"
      eyebrow="Lecturer Account"
      title="Settings"
      actions={
        <Button
          size="sm"
          onClick={handleSavePreferences}
          className="h-6 px-2.5 text-[10px] text-white font-bold gap-1 shadow-xs bg-sky-600 hover:bg-sky-700"
        >
          <Save className="h-2.5 w-2.5" />
          <span>Save Preferences</span>
        </Button>
      }
    >
      <main className="p-3 sm:p-4 max-w-[700px] mx-auto text-[11px] space-y-3">
        {toastMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[10.5px] text-emerald-800 flex items-center gap-1.5 animate-in fade-in duration-150">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <Card className="border-slate-200/90 bg-white shadow-2xs">
          <CardHeader className="border-b border-slate-100 px-3 py-2 bg-slate-50/40">
            <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-slate-500" />
              <span>Attendance System Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 text-[10.5px]">
                  Automatic BLE Beacon Detection
                </p>
                <p className="text-[9.5px] text-slate-500">
                  Scan for classroom bluetooth signals automatically
                </p>
              </div>
              <input
                type="checkbox"
                checked={bleAutoCheckin}
                onChange={(e) => setBleAutoCheckin(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2">
              <div>
                <p className="font-bold text-slate-800 text-[10.5px]">
                  Session Auto-Timeout
                </p>
                <p className="text-[9.5px] text-slate-500">
                  Close online broadcast session after duration
                </p>
              </div>
              <select
                value={sessionAutoExpiry}
                onChange={(e) => setSessionAutoExpiry(e.target.value)}
                className="h-6 rounded border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-medium text-slate-800"
              >
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">60 Minutes</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </main>
    </RoleWorkspaceShell>
  );
}
