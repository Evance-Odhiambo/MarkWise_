"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {

  BellRing,
  BriefcaseBusiness,
  Building2,
  Command,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Radio,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Zap,
} from "lucide-react";

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
import { AdminCommandPalette } from "./admin-command-palette";

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeTone?: "emerald" | "amber" | "sky" | "slate";
}

const navSections: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "Core Operations",
    items: [
      {
        title: "Control Center",
        href: "/admin/super-admin",
        icon: LayoutDashboard,
      },
      {
        title: "Approvals Queue",
        href: "/admin/super-admin/onboarding",
        icon: FileCheck2,
        badge: "Active",
        badgeTone: "amber",
      },
      {
        title: "Institutions",
        href: "/admin/super-admin/institutions",
        icon: Building2,
      },
      {
        title: "Readiness Matrix",
        href: "/admin/super-admin/institutions/overview",
        icon: Sparkles,
      },
    ],
  },
  {
    label: "Setup Workspaces",
    items: [
      {
        title: "Curriculum",
        href: "/setup",
        icon: BriefcaseBusiness,
      },
      {
        title: "Lecturers",
        href: "/setup/lecturers",
        icon: UsersRound,
      },
      {
        title: "Students",
        href: "/setup/students",
        icon: GraduationCap,
      },
    ],
  },
  {
    label: "Governance & Infra",
    items: [
      {
        title: "Security & Audit",
        href: "/admin/super-admin/security",
        icon: ShieldAlert,
      },
      {
        title: "System Telemetry",
        href: "/admin/super-admin/system",
        icon: Radio,
        badge: "Live",
        badgeTone: "emerald",
      },
      {
        title: "Feature Flags",
        href: "/admin/super-admin/settings",
        icon: Settings2,
      },
    ],
  },
];

interface AdminWorkspaceShellProps {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function AdminWorkspaceShell({
  eyebrow = "Operations",
  title,
  children,
  actions,
}: AdminWorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<{
    name?: string;
    email?: string;
    role?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setAdminUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("user");
    router.replace("/admin/super-admin/login");
  };

  const getBadgeClass = (tone?: "emerald" | "amber" | "sky" | "slate") => {
    switch (tone) {
      case "emerald":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "amber":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "sky":
        return "bg-sky-50 text-sky-700 border-sky-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <SidebarProvider style={{ "--sidebar-width": "13.25rem" } as React.CSSProperties}>
      <div className="flex min-h-screen w-full bg-[#f8fafc] text-[11px] font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-900">
        <Sidebar className="border-r border-slate-200/90 bg-white shadow-xs">
          {/* Brand Header */}
          <SidebarHeader className="border-b border-slate-100/90 px-3 py-2.5">
            <Link
              href="/admin/super-admin"
              className="group flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xs">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-bold tracking-tight text-slate-900">
                      MarkWise
                    </span>
                    <span className="rounded bg-emerald-100 px-1 py-0.2 text-[8.5px] font-bold text-emerald-800 uppercase tracking-wide">
                      Super
                    </span>
                  </div>
                  <p className="text-[9.5px] font-medium text-slate-400">
                    Platform Admin Suite
                  </p>
                </div>
              </div>
            </Link>

            {/* Quick Command Trigger Button */}
            <button
              onClick={() => setCommandOpen(true)}
              className="mt-2.5 flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1 text-[10.5px] text-slate-500 hover:border-slate-300 hover:bg-slate-100 transition shadow-2xs"
            >
              <span className="flex items-center gap-1.5">
                <Search className="h-3 w-3 text-slate-400" />
                <span>Search or jump...</span>
              </span>
              <kbd className="flex items-center gap-0.5 rounded bg-white px-1 py-0.2 text-[9px] font-mono font-medium text-slate-400 border border-slate-200">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>
          </SidebarHeader>

          {/* Navigation Sections */}
          <SidebarContent className="px-1.5 py-1.5 space-y-2">
            {navSections.map((section) => (
              <SidebarGroup key={section.label} className="p-0">
                <SidebarGroupLabel className="h-5 px-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {section.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/admin/super-admin" &&
                          item.href !== "/setup" &&
                          pathname.startsWith(item.href));

                      return (
                        <SidebarMenuItem key={item.title}>
                          <Link
                            href={item.href}
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-medium transition-all ${
                              isActive
                                ? "bg-emerald-600 text-white font-semibold shadow-xs shadow-emerald-700/20"
                                : "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  isActive ? "text-white" : "text-slate-400"
                                }`}
                              />
                              <span className="truncate">{item.title}</span>
                            </div>
                            {item.badge && (
                              <span
                                className={`rounded px-1.5 py-0.2 text-[8.5px] font-semibold border ${
                                  isActive
                                    ? "bg-emerald-500/40 text-emerald-100 border-transparent"
                                    : getBadgeClass(item.badgeTone)
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          {/* Sidebar Footer: System Status & User Info */}
          <SidebarFooter className="border-t border-slate-100 p-2 space-y-1.5">
            <Link
              href="/admin/super-admin/system"
              className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-slate-50/90 p-1.5 text-[10px] hover:border-emerald-200 hover:bg-emerald-50/40 transition"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-slate-700 truncate">
                  Cluster Healthy
                </span>
              </div>
              <span className="font-mono text-[9px] font-medium text-emerald-700 bg-emerald-100/70 rounded px-1">
                22ms
              </span>
            </Link>

            {/* Profile Row */}
            <div className="flex items-center justify-between pt-1 text-[10px]">
              <div className="min-w-0 flex items-center gap-1.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-700">
                  {adminUser?.name?.[0]?.toUpperCase() || "A"}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate leading-none text-[10.5px]">
                    {adminUser?.name || "Super Administrator"}
                  </p>
                  <p className="text-slate-400 truncate text-[9px] mt-0.5">
                    {adminUser?.email || "admin@markwise.edu"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Inset Main View */}
        <SidebarInset className="min-w-0 flex-1 flex flex-col">
          {/* Header Bar */}
          <header className="sticky top-0 z-20 flex h-10 items-center justify-between border-b border-slate-200/90 bg-white/90 px-3 py-1.5 backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="h-6 w-6 text-slate-500 hover:text-slate-900" />
              <div className="h-3.5 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {eyebrow}
                </span>
                <span className="text-slate-300">/</span>
                <h1 className="text-xs font-bold text-slate-900 truncate">
                  {title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {actions}
              <button
                onClick={() => setCommandOpen(true)}
                className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10.5px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs"
              >
                <Command className="h-3 w-3 text-slate-400" />
                <span className="hidden sm:inline">Commands</span>
              </button>
              <Link
                href="/admin/super-admin/security"
                className="rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition"
                title="Security Notifications"
              >
                <BellRing className="h-3.5 w-3.5" />
              </Link>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 min-w-0">{children}</div>
        </SidebarInset>

        {/* Global Command Palette */}
        <AdminCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      </div>
    </SidebarProvider>
  );
}
