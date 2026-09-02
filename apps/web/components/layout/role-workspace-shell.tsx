"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck2,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Radio,
  Settings2,
  ShieldCheck,
  UserRound,
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

interface RoleWorkspaceShellProps {
  role: "student" | "lecturer";
  eyebrow: string;
  title: string;
  name?: string;
  email?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function RoleWorkspaceShell({
  role,
  eyebrow,
  title,
  name,
  email,
  children,
  actions,
}: RoleWorkspaceShellProps) {
  const pathname = usePathname();
  const isStudent = role === "student";

  // Grouped so lecturer can have extra sections (Insights, a three-way
  // Account split) without touching student's single Workspace + Account
  // layout at all — student's groups render exactly as they did before this
  // was split into groups.
  const navGroups = isStudent
    ? [
        {
          label: "Workspace",
          items: [
            {
              label: "Dashboard",
              href: "/student/dashboard",
              icon: LayoutDashboard,
            },
            {
              label: "Attendance",
              href: "/student/dashboard/attendance",
              icon: CalendarCheck2,
            },
            { label: "Units", href: "/student/units", icon: BookOpen },
            {
              label: "Notifications",
              href: "/student/notifications",
              icon: Bell,
            },
          ],
        },
        {
          label: "Account",
          items: [
            {
              label: "Settings & Security",
              href: "/student/settings",
              icon: Settings2,
            },
          ],
        },
      ]
    : [
        {
          label: "Workspace",
          items: [
            {
              label: "Dashboard",
              href: "/lecturer/dashboard",
              icon: LayoutDashboard,
            },
            {
              label: "Attendance",
              href: "/lecturer/attendance",
              icon: Radio,
            },
            {
              label: "Notifications",
              href: "/lecturer/notifications",
              icon: Bell,
            },
            { label: "Units", href: "/lecturer/units", icon: BookOpen },
          ],
        },
        {
          label: "Insights",
          items: [
            {
              label: "Analytics",
              href: "/lecturer/analytics",
              icon: BarChart3,
            },
            {
              label: "Reports",
              href: "/lecturer/reports",
              icon: FileBarChart,
            },
          ],
        },
        {
          label: "Account",
          items: [
            { label: "Profile", href: "/lecturer/profile", icon: UserRound },
            {
              label: "Settings",
              href: "/lecturer/settings",
              icon: Settings2,
            },
            {
              label: "Security",
              href: "/lecturer/security",
              icon: ShieldCheck,
            },
          ],
        },
      ];

  const dashboardHref = isStudent ? "/student/dashboard" : "/lecturer/dashboard";
  const loginHref = isStudent ? "/student/login" : "/lecturer/login";
  const displayName = name || (isStudent ? "Student" : "Lecturer");
  const BrandIcon = isStudent ? GraduationCap : BookOpen;

  const signOut = () => {
    localStorage.removeItem("user");
    window.location.href = loginHref;
  };

  return (
    <SidebarProvider style={{ "--sidebar-width": "13.5rem" } as React.CSSProperties}>
      <div className="flex min-h-screen w-full bg-[#f8fafc] text-[11px] font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-900">
        <Sidebar className="border-r border-slate-200/90 bg-white shadow-xs">
          {/* Brand Header */}
          <SidebarHeader className="border-b border-slate-100 px-3 py-2.5">
            <Link href={dashboardHref} className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <BrandIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold tracking-tight text-slate-900">
                    MarkWise
                  </span>
                  <span className="rounded bg-emerald-100 px-1 py-0.2 text-[8.5px] font-bold uppercase tracking-wide text-emerald-800">
                    {isStudent ? "Student" : "Lecturer"}
                  </span>
                </div>
                <p className="text-[9.5px] font-medium text-slate-400">
                  Academic Portal
                </p>
              </div>
            </Link>
          </SidebarHeader>

          {/* Navigation */}
          <SidebarContent className="px-1.5 py-2 space-y-2">
            {navGroups.map((group) => (
              <SidebarGroup key={group.label} className="p-0">
                <SidebarGroupLabel className="h-5 px-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;

                      return (
                        <SidebarMenuItem key={item.label}>
                          <Link
                            href={item.href}
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-medium transition-all ${
                              isActive
                                ? "bg-emerald-600 text-white font-semibold shadow-xs"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  isActive ? "text-white" : "text-slate-400"
                                }`}
                              />
                              <span className="truncate">{item.label}</span>
                            </div>
                          </Link>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          {/* Footer Info: User Profile */}
          <SidebarFooter className="border-t border-slate-100 p-2 space-y-1.5">
            <div className="flex items-center justify-between pt-1 text-[10px]">
              <div className="min-w-0 flex items-center gap-1.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-800">
                  {displayName[0]?.toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate leading-none text-[10.5px]">
                    {displayName}
                  </p>
                  <p className="text-slate-400 truncate text-[9px] mt-0.5">
                    {email || `${isStudent ? "Student" : "Lecturer"} space`}
                  </p>
                </div>
              </div>
              <button
                onClick={signOut}
                title="Sign out"
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main Inset View */}
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
              <Link
                href={`/${role}/notifications`}
                className="rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition"
                title="Notifications"
              >
                <Bell className="h-3.5 w-3.5" />
              </Link>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 min-w-0">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
