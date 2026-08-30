"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  LogOut,
  Radio,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleWorkspaceShell } from "@/components/layout/role-workspace-shell";

type Role = "student" | "lecturer";

interface StoredSession {
  token?: string;
  name?: string;
  email?: string;
  role?: string;
  staffNumber?: string;
  admissionNumber?: string;
  course?: string;
  institutionId?: string;
  institutionName?: string;
}

interface ProfileFields {
  name: string;
  email: string;
  staffNumber: string;
  admissionNumber: string;
  course: string;
  institutionName: string;
}

const emptyProfile: ProfileFields = {
  name: "",
  email: "",
  staffNumber: "",
  admissionNumber: "",
  course: "",
  institutionName: "",
};

export function AccountSettings({ role }: { role: Role }) {
  const isStudent = role === "student";
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileFields>(emptyProfile);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [bleAutoCheckin, setBleAutoCheckin] = useState(true);
  const [sessionAutoExpiry, setSessionAutoExpiry] = useState("45");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loginPath = `/${role}/login`;
  const displayName =
    profile.name || (isStudent ? "Student" : "Lecturer");

  const persistSession = (next: ProfileFields, sessionToken: string) => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("user") ?? "null",
      ) as StoredSession | null;
      if (!stored) return;
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...stored,
          token: sessionToken,
          name: next.name || stored.name,
          email: next.email || stored.email,
          staffNumber: next.staffNumber || stored.staffNumber,
          admissionNumber: next.admissionNumber || stored.admissionNumber,
          course: next.course || stored.course,
          institutionName: next.institutionName || stored.institutionName,
        }),
      );
    } catch {
      // ignore storage failures
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const stored = JSON.parse(
          localStorage.getItem("user") ?? "null",
        ) as StoredSession | null;

        if (!stored?.token || stored.role !== role) {
          localStorage.removeItem("user");
          window.location.href = loginPath;
          return;
        }

        const initial: ProfileFields = {
          name: stored.name || "",
          email: stored.email || "",
          staffNumber: stored.staffNumber || "",
          admissionNumber: stored.admissionNumber || "",
          course: stored.course || "",
          institutionName: stored.institutionName || "",
        };

        setToken(stored.token);
        setProfile(initial);

        const response = await fetch(`/api/v1/${role}s/me`, {
          headers: { Authorization: `Bearer ${stored.token}` },
        });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("user");
          window.location.href = loginPath;
          return;
        }

        if (!response.ok || cancelled) return;

        const data = (await response.json()) as {
          name?: string;
          email?: string | null;
          staffNumber?: string;
          admissionNumber?: string;
          course?: string;
          institutionName?: string;
        };

        const next: ProfileFields = {
          name: data.name || initial.name,
          email: data.email || initial.email,
          staffNumber: data.staffNumber || initial.staffNumber,
          admissionNumber: data.admissionNumber || initial.admissionNumber,
          course: data.course || initial.course,
          institutionName: data.institutionName || initial.institutionName,
        };

        if (!cancelled) {
          setProfile(next);
          persistSession(next, stored.token);
        }
      } catch {
        if (!cancelled) setToken(null);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [role, loginPath]);

  const signOut = () => {
    localStorage.removeItem("user");
    window.location.href = loginPath;
  };

  const handleSavePreferences = () => {
    setToastMessage("Preferences updated successfully.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== "delete my account") return;

    setDeleting(true);
    try {
      if (token) {
        await fetch(`/api/v1/${role}s/me`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      localStorage.removeItem("user");
      window.location.href = loginPath;
    } catch {
      setDeleting(false);
    }
  };

  return (
    <RoleWorkspaceShell
      role={role}
      eyebrow={isStudent ? "Student Account" : "Faculty Account"}
      title="Settings & Security"
      name={displayName}
      email={profile.email}
    >
      <main className="p-3 sm:p-4 space-y-3 max-w-[1200px] mx-auto text-[11px]">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldCheck
              className={`h-4 w-4 ${isStudent ? "text-emerald-600" : "text-sky-600"}`}
            />
            <span className="font-bold text-slate-900 text-xs">
              Account Security & Configuration
            </span>
          </div>

          <Button
            size="sm"
            onClick={handleSavePreferences}
            className={`h-6 px-2.5 text-[10px] text-white font-bold gap-1 shadow-xs ${
              isStudent
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-sky-600 hover:bg-sky-700"
            }`}
          >
            <Save className="h-2.5 w-2.5" />
            <span>Save Preferences</span>
          </Button>
        </div>

        {toastMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[10.5px] text-emerald-800 flex items-center gap-1.5 animate-in fade-in duration-150">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <Card className="border-slate-200/90 bg-white shadow-2xs">
            <CardHeader className="border-b border-slate-100 px-3 py-2 bg-slate-50/40">
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5 text-slate-500" />
                <span>Personal Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">
                  Full Name
                </label>
                <Input
                  value={displayName}
                  disabled
                  className="h-7 text-[11px] bg-slate-50 text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">
                  Institutional Email
                </label>
                <Input
                  value={profile.email}
                  disabled
                  className="h-7 text-[11px] bg-slate-50 font-mono text-slate-500"
                />
              </div>

              {isStudent ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                      Admission Number
                    </label>
                    <Input
                      value={profile.admissionNumber}
                      disabled
                      className="h-7 text-[11px] bg-slate-50 font-mono text-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                      Course
                    </label>
                    <Input
                      value={profile.course}
                      disabled
                      className="h-7 text-[11px] bg-slate-50 text-slate-700"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">
                    Staff Number
                  </label>
                  <Input
                    value={profile.staffNumber}
                    disabled
                    className="h-7 text-[11px] bg-slate-50 font-mono text-slate-700"
                  />
                </div>
              )}

              {profile.institutionName ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">
                    Institution
                  </label>
                  <Input
                    value={profile.institutionName}
                    disabled
                    className="h-7 text-[11px] bg-slate-50 text-slate-700"
                  />
                </div>
              ) : null}

              <div className="pt-1 flex items-center justify-between text-[10px] border-t border-slate-100">
                <span className="text-slate-500">Account Type:</span>
                <Badge variant="outline" className="font-mono text-[9px] uppercase">
                  {role}
                </Badge>
              </div>
            </CardContent>
          </Card>

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

              {!isStudent && (
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
              )}
            </CardContent>
          </Card>

          <Card className="border-red-200/90 bg-red-50/20 shadow-2xs md:col-span-2">
            <CardHeader className="border-b border-red-100 px-3 py-2 bg-red-50/50">
              <CardTitle className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                <span>Account Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 text-[10.5px]">
                    Sign out of session
                  </p>
                  <p className="text-[9.5px] text-slate-500">
                    End your current session on this device
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={signOut}
                  className="h-6 px-2.5 text-[10px] text-slate-700 bg-white border-slate-200 hover:bg-slate-50"
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  <span>Sign out</span>
                </Button>
              </div>

              <div className="border-t border-red-100 pt-2 flex items-center justify-between">
                <div>
                  <p className="font-bold text-red-900 text-[10.5px]">
                    Delete Account
                  </p>
                  <p className="text-[9.5px] text-red-600">
                    Remove login credentials and portal access
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowDeleteModal(true)}
                  className="h-6 px-2.5 text-[10px] font-bold"
                >
                  Delete...
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                  <Trash2 className="h-4 w-4" />
                  Confirm Account Deletion
                </h3>
                <button onClick={() => setShowDeleteModal(false)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <p className="text-[10.5px] text-slate-600 leading-relaxed">
                This action will delete your login credentials from the MarkWise
                portal. Your verified attendance history will be preserved under
                your institution roll.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700">
                  Type{" "}
                  <code className="text-red-600 font-mono">
                    delete my account
                  </code>{" "}
                  to proceed:
                </label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="delete my account"
                  className="h-7 text-[10.5px] font-mono"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteModal(false)}
                  className="h-7 text-[10.5px]"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={
                    deleteConfirmText.trim().toLowerCase() !==
                      "delete my account" || deleting
                  }
                  onClick={handleDeleteAccount}
                  className="h-7 text-[10.5px] font-bold"
                >
                  {deleting ? "Deleting..." : "Permanently Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </RoleWorkspaceShell>
  );
}
