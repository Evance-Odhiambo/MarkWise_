"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleWorkspaceShell } from "@/components/layout/role-workspace-shell";

interface StoredSession {
  token?: string;
  name?: string;
  email?: string;
  role?: string;
  staffNumber?: string;
  institutionName?: string;
}

interface ProfileFields {
  name: string;
  email: string;
  staffNumber: string;
  institutionName: string;
}

const emptyProfile: ProfileFields = {
  name: "",
  email: "",
  staffNumber: "",
  institutionName: "",
};

export default function LecturerProfilePage() {
  const [profile, setProfile] = useState<ProfileFields>(emptyProfile);
  const loginPath = "/lecturer/login";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const stored = JSON.parse(
        localStorage.getItem("user") ?? "null",
      ) as StoredSession | null;

      if (!stored?.token || stored.role !== "lecturer") {
        localStorage.removeItem("user");
        window.location.href = loginPath;
        return;
      }

      const initial: ProfileFields = {
        name: stored.name || "",
        email: stored.email || "",
        staffNumber: stored.staffNumber || "",
        institutionName: stored.institutionName || "",
      };
      setProfile(initial);

      try {
        const response = await fetch("/api/v1/lecturers/me", {
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
          institutionName?: string;
        };
        if (!cancelled) {
          setProfile({
            name: data.name || initial.name,
            email: data.email || initial.email,
            staffNumber: data.staffNumber || initial.staffNumber,
            institutionName: data.institutionName || initial.institutionName,
          });
        }
      } catch {
        // keep the locally-cached profile fields on a transient fetch failure
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <RoleWorkspaceShell
      role="lecturer"
      eyebrow="Lecturer Account"
      title="Profile"
      name={profile.name || "Lecturer"}
      email={profile.email}
    >
      <main className="p-3 sm:p-4 max-w-[700px] mx-auto text-[11px]">
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
                value={profile.name}
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
                lecturer
              </Badge>
            </div>
          </CardContent>
        </Card>
      </main>
    </RoleWorkspaceShell>
  );
}
