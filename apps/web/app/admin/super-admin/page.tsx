"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CheckCheck,
  ChevronRight,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const sidebarSections = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/admin/super-admin",
        active: true,
        icon: LayoutDashboard,
      },
      {
        title: "Approvals",
        href: "/admin/super-admin/onboarding",
        icon: FileCheck2,
      },
      {
        title: "Institutions",
        href: "/admin/super-admin/institutions",
        icon: Building2,
      },
    ],
  },
  {
    label: "Setup Operations",
    items: [
      { title: "Academics", href: "/setup", icon: BriefcaseBusiness },
      { title: "Lecturers", href: "/setup/lecturers", icon: UsersRound },
      { title: "Students", href: "/setup/students", icon: GraduationCap },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Security", href: "/admin/super-admin", icon: ShieldCheck },
      { title: "Settings", href: "/admin/super-admin", icon: Settings2 },
    ],
  },
];

const statCards = [
  {
    title: "Pending approvals",
    value: "12",
    delta: "+4 today",
    icon: FileCheck2,
    accent: "emerald",
  },
  {
    title: "Institutions",
    value: "48",
    delta: "+3 this month",
    icon: Building2,
    accent: "sky",
  },
  {
    title: "Active setups",
    value: "31",
    delta: "72% coverage",
    icon: CheckCheck,
    accent: "violet",
  },
  {
    title: "Security alerts",
    value: "2",
    delta: "1 needs review",
    icon: ShieldCheck,
    accent: "amber",
  },
];

const approvalQueue = [
  {
    name: "University of Nairobi",
    type: "Institution onboarding",
    status: "Awaiting review",
    time: "8 min ago",
  },
  {
    name: "Maseno University",
    type: "Admin activation",
    status: "Needs action",
    time: "24 min ago",
  },
  {
    name: "Kisii Technical College",
    type: "Academic setup",
    status: "In progress",
    time: "1 hr ago",
  },
  {
    name: "Strathmore Academy",
    type: "Institution onboarding",
    status: "Approved",
    time: "3 hr ago",
  },
];

const setupProgress = [
  { name: "Academic structure", value: 72, tone: "emerald" },
  { name: "Student profiles", value: 54, tone: "sky" },
  { name: "Attendance readiness", value: 81, tone: "violet" },
];

const roadmap = [
  {
    title: "Attendance analytics",
    description:
      "Performance trends, attendance exceptions, and compliance reporting.",
    icon: Sparkles,
    status: "Planned",
  },
  {
    title: "Student lifecycle",
    description:
      "Transfers, academic risk, enrollment tracking, and records health checks.",
    icon: UsersRound,
    status: "Planned",
  },
  {
    title: "Automation rules",
    description:
      "Approval workflows, account triggers, and school onboarding policies.",
    icon: BellRing,
    status: "Roadmap",
  },
];

export default function SuperAdminDashboardPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50">
        <Sidebar className="border-r border-slate-200 bg-white/80 backdrop-blur-sm">
          <SidebarHeader className="border-b border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">
                  MarkWise
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  Super admin
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            {sidebarSections.map((section) => (
              <SidebarGroup key={section.label}>
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map(
                      ({ title, href, icon: Icon, active }) => (
                        <SidebarMenuItem key={title}>
                          <Link
                            href={href}
                            className={
                              active
                                ? "flex w-full items-center gap-2 rounded-md bg-slate-100 px-2 py-2 text-sm font-medium text-slate-900"
                                : "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                            }
                          >
                            <Icon className="h-4 w-4" />
                            <span>{title}</span>
                          </Link>
                        </SidebarMenuItem>
                      ),
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200 p-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                System status
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">
                  All services online
                </span>
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="md:hidden" />
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Operations overview
                </p>
                <h1 className="text-xl font-semibold text-slate-900">
                  Control center
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2">
                <BellRing className="h-4 w-4" />
                Alerts
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Building2 className="h-4 w-4" />
                New institution
              </Button>
            </div>
          </header>

          <main className="space-y-6 p-4 sm:p-6 lg:p-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                    System admin
                  </Badge>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    Welcome back, admin
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">
                    Approve institutions, review setup readiness, and monitor
                    the next stage of platform growth in one place.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/admin/super-admin/onboarding"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Review queue
                  </Link>
                  <Button className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                    Create institution
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {statCards.map(({ title, value, delta, icon: Icon, accent }) => (
                <Card
                  key={title}
                  className="border-slate-200 bg-white/90 shadow-sm"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-slate-500">
                        {title}
                      </CardTitle>
                      <div
                        className={
                          accent === "emerald"
                            ? "rounded-lg bg-emerald-100 p-2 text-emerald-600"
                            : accent === "sky"
                              ? "rounded-lg bg-sky-100 p-2 text-sky-600"
                              : accent === "violet"
                                ? "rounded-lg bg-violet-100 p-2 text-violet-600"
                                : "rounded-lg bg-amber-100 p-2 text-amber-600"
                        }
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold tracking-tight text-slate-950">
                      {value}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">{delta}</p>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="border-b border-slate-200 pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl text-slate-950">
                        Approval queue
                      </CardTitle>
                      <CardDescription>
                        Institution and admin actions waiting for a decision.
                      </CardDescription>
                    </div>
                    <Link
                      href="/admin/super-admin/onboarding"
                      className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Open queue
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  {approvalQueue.map((item) => (
                    <div
                      key={item.name}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            item.status === "Approved"
                              ? "default"
                              : item.status === "Awaiting review"
                                ? "outline"
                                : item.status === "Needs action"
                                  ? "secondary"
                                  : "secondary"
                          }
                          className={
                            item.status === "Approved"
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : item.status === "Awaiting review"
                                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"
                                : item.status === "Needs action"
                                  ? "bg-red-100 text-red-700 hover:bg-red-100"
                                  : "bg-sky-100 text-sky-700 hover:bg-sky-100"
                          }
                        >
                          {item.status}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {item.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-950">
                    Quick actions
                  </CardTitle>
                  <CardDescription>Most-used admin workflows.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    {
                      title: "Review onboarding",
                      href: "/admin/super-admin/onboarding",
                      icon: FileCheck2,
                    },
                    {
                      title: "Manage institutions",
                      href: "/admin/super-admin/institutions",
                      icon: Building2,
                    },
                    {
                      title: "School setup",
                      href: "/setup",
                      icon: BriefcaseBusiness,
                    },
                    {
                      title: "System settings",
                      href: "/admin/super-admin",
                      icon: Settings2,
                    },
                  ].map(({ title, href, icon: Icon }) => (
                    <Link key={title} href={href} className="block">
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-emerald-200 hover:bg-emerald-50/40">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-white p-2 text-slate-700 shadow-sm">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-slate-900">
                            {title}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-950">
                    School setup readiness
                  </CardTitle>
                  <CardDescription>
                    Institution progress before launch.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {setupProgress.map((progress) => (
                    <div key={progress.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>{progress.name}</span>
                        <span className="font-medium text-slate-900">
                          {progress.value}%
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100">
                        <div
                          className={
                            progress.tone === "emerald"
                              ? "h-2.5 rounded-full bg-emerald-500"
                              : progress.tone === "sky"
                                ? "h-2.5 rounded-full bg-sky-500"
                                : "h-2.5 rounded-full bg-violet-500"
                          }
                          style={{ width: `${progress.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-950">
                    Future roadmap
                  </CardTitle>
                  <CardDescription>
                    Upcoming product work for system-wide scaling.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {roadmap.map(({ title, description, icon: Icon, status }) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-white p-2 text-slate-700 shadow-sm">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {title}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {description}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-slate-200 bg-white text-slate-600"
                        >
                          {status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <footer className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
              <span>System status: healthy</span>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-slate-700 hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </footer>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
