"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  LogOut,
  Settings2,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminWorkspaceShell } from "@/components/features/admin/admin-workspace-shell";

interface StoredUser {
  name?: string;
  contactTitle?: string | null;
  role?: string;
  institutionId?: string | null;
  institutionName?: string | null;
}

const actions = [
  {
    href: "/setup",
    title: "Academic setup",
    description: "Configure courses, years, semesters, and units.",
    icon: BookOpen,
  },
  {
    href: "/setup/students",
    title: "Manage students",
    description: "Import and maintain student records for your institution.",
    icon: GraduationCap,
  },
  {
    href: "/setup/lecturers",
    title: "Manage lecturers",
    description: "Import lecturers and connect them to teaching units.",
    icon: UsersRound,
  },
  {
    href: "/setup",
    title: "Institution settings",
    description: "Review your institution setup and operating preferences.",
    icon: Settings2,
  },
];

export default function InstitutionAdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      router.replace("/admin/school-admin/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser) as StoredUser;
    if (parsedUser.role !== "INSTITUTION_ADMIN") {
      router.replace("/admin/super-admin/institutions");
      return;
    }

    setUser(parsedUser);
  }, [router]);

  const handleSignOut = () => {
    localStorage.removeItem("user");
    router.replace("/admin/school-admin/login");
  };

  if (!user) return null;

  return (
    <AdminWorkspaceShell
      eyebrow={user.contactTitle ?? "Institutional representative"}
      title={user.institutionName ?? "Institution dashboard"}
    >
      <main className="min-h-dvh bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="flex flex-col gap-4 border-b border-emerald-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {user.contactTitle ?? "Institutional representative"}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Welcome, {user.name ?? "Admin"}
              </h1>
              <p className="mt-2 text-slate-600">
                Manage {user.institutionName ?? "your institution"} from one
                workspace.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full sm:w-auto"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {actions.map(({ href, title, description, icon: Icon }) => (
              <Link key={title} href={href} className="group">
                <Card className="h-full border-white/80 bg-white/90 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg">
                  <CardHeader>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="pt-2 text-lg">{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="leading-6">
                      {description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </section>

          <Card className="border-emerald-100 bg-white/80">
            <CardHeader>
              <CardTitle>Getting started</CardTitle>
              <CardDescription>
                Complete these steps before inviting your teaching team.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <p className="rounded-lg bg-emerald-50 p-3">
                1. Configure academic structure
              </p>
              <p className="rounded-lg bg-emerald-50 p-3">
                2. Add lecturers and students
              </p>
              <p className="rounded-lg bg-emerald-50 p-3">
                3. Launch your first attendance session
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </AdminWorkspaceShell>
  );
}
