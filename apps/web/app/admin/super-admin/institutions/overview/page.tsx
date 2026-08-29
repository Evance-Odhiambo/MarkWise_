"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock3,
  Search,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminWorkspaceShell } from "@/components/admin/AdminWorkspaceShell";

const institutionRows = [
  {
    name: "University of Nairobi",
    code: "UON",
    stage: "Live",
    progress: 92,
    admin: "Jane Wambui",
    lastUpdate: "2h ago",
  },
  {
    name: "Maseno University",
    code: "MSU",
    stage: "Setup",
    progress: 68,
    admin: "Chris Otieno",
    lastUpdate: "5h ago",
  },
  {
    name: "Kisii Technical College",
    code: "KTC",
    stage: "Review",
    progress: 44,
    admin: "Mary Njeri",
    lastUpdate: "1d ago",
  },
  {
    name: "Strathmore Academy",
    code: "STR",
    stage: "Live",
    progress: 88,
    admin: "Amina Kibet",
    lastUpdate: "3d ago",
  },
];

const healthStats = [
  { label: "Academic structure", value: 72, accent: "emerald" },
  { label: "Student records", value: 58, accent: "sky" },
  { label: "Lecturer setup", value: 64, accent: "violet" },
  { label: "Attendance readiness", value: 81, accent: "amber" },
];

export default function InstitutionOverviewPage() {
  return (
    <AdminWorkspaceShell
      eyebrow="Institution operations"
      title="School setup & readiness"
    >
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  <Building2 className="mr-2 h-3.5 w-3.5" />
                  Institution overview
                </Badge>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  School setup & readiness
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Review academic progress, institutional readiness, and
                  operating state across all schools connected to the platform.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-[220px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search institutions"
                    className="h-11 bg-slate-50 pl-9"
                  />
                </div>
                <Link href="/admin/super-admin/institutions">
                  <Button variant="outline" className="h-11 gap-2">
                    All institutions
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {healthStats.map((stat) => (
              <Card
                key={stat.label}
                className="border-slate-200 bg-white shadow-sm"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between gap-2">
                    <span className="text-3xl font-semibold tracking-tight text-slate-950">
                      {stat.value}%
                    </span>
                    <div
                      className={
                        stat.accent === "emerald"
                          ? "h-2.5 w-16 rounded-full bg-emerald-500"
                          : stat.accent === "sky"
                            ? "h-2.5 w-16 rounded-full bg-sky-500"
                            : stat.accent === "violet"
                              ? "h-2.5 w-16 rounded-full bg-violet-500"
                              : "h-2.5 w-16 rounded-full bg-amber-500"
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.5fr_0.5fr]">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-200 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl text-slate-950">
                      Institution pipeline
                    </CardTitle>
                    <CardDescription>
                      Progress by institution across setup milestones.
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Export summary
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-5">
                <div className="space-y-4">
                  {institutionRows.map((row) => (
                    <div
                      key={row.name}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {row.name}
                            </p>
                            <Badge
                              variant="outline"
                              className="border-slate-200 bg-white text-slate-600"
                            >
                              {row.code}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                            <span>{row.admin}</span>
                            <span className="flex items-center gap-1">
                              <Clock3 className="h-3.5 w-3.5" />
                              {row.lastUpdate}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 xl:min-w-[220px]">
                          <div className="flex items-center justify-between text-sm text-slate-600">
                            <span>{row.stage}</span>
                            <span className="font-medium text-slate-900">
                              {row.progress}%
                            </span>
                          </div>
                          <div className="h-2.5 rounded-full bg-slate-200">
                            <div
                              className={
                                row.stage === "Live"
                                  ? "h-2.5 rounded-full bg-emerald-500"
                                  : row.stage === "Setup"
                                    ? "h-2.5 rounded-full bg-sky-500"
                                    : "h-2.5 rounded-full bg-amber-500"
                              }
                              style={{ width: `${row.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-slate-950">Status</CardTitle>
                <CardDescription>System signals this week.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">3 schools live</span>
                  </div>
                  <p className="mt-2 text-sm text-emerald-800">
                    No critical platform issues reported in the last 24 hours.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Pending review</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    5
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Setup in progress</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    7
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </AdminWorkspaceShell>
  );
}
