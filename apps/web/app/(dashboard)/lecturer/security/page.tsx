"use client";

import { useState } from "react";
import { LogOut, ShieldCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleWorkspaceShell } from "@/components/layout/role-workspace-shell";

interface StoredSession {
  token?: string;
}

export default function LecturerSecurityPage() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const loginPath = "/lecturer/login";

  const getToken = (): string | null => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("user") ?? "null",
      ) as StoredSession | null;
      return stored?.token ?? null;
    } catch {
      return null;
    }
  };

  const signOut = () => {
    localStorage.removeItem("user");
    window.location.href = loginPath;
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== "delete my account") return;

    setDeleting(true);
    try {
      const token = getToken();
      if (token) {
        await fetch("/api/v1/lecturers/me", {
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
    <RoleWorkspaceShell role="lecturer" eyebrow="Lecturer Account" title="Security">
      <main className="p-3 sm:p-4 max-w-[700px] mx-auto text-[11px]">
        <Card className="border-red-200/90 bg-red-50/20 shadow-2xs">
          <CardHeader className="border-b border-red-100 px-3 py-2 bg-red-50/50">
            <CardTitle className="text-xs font-bold text-red-900 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-red-600" />
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
                portal. Your conducted sessions and attendance records will be
                preserved under your institution roll.
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
