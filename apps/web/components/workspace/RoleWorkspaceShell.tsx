"use client";

import Link from "next/link";
import {
  Bell,
  BookOpen,
  CalendarCheck2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Radio,
  Settings2,
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
  SidebarMenuButton,
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
}

export function RoleWorkspaceShell({
  role,
  eyebrow,
  title,
  name,
  email,
  children,
}: RoleWorkspaceShellProps) {
  const isStudent = role === "student";
  const navigation = isStudent
    ? [
        {
          label: "Overview",
          href: "/student/dashboard",
          icon: LayoutDashboard,
        },
        { label: "Attendance", href: "/attend", icon: CalendarCheck2 },
        { label: "My Units", href: "/student/units", icon: BookOpen },
        { label: "Notifications", href: "/student/notifications", icon: Bell },
      ]
    : [
        {
          label: "Overview",
          href: "/lecturer/dashboard",
          icon: LayoutDashboard,
        },
        {
          label: "Attendance",
          href: "/lecturer/attendance/online",
          icon: Radio,
        },
        { label: "My Units", href: "/lecturer/units", icon: BookOpen },
        { label: "Notifications", href: "/lecturer/notifications", icon: Bell },
      ];
  const dashboardHref = isStudent
    ? "/student/dashboard"
    : "/lecturer/dashboard";
  const loginHref = isStudent ? "/student/login" : "/lecturer/login";
  const displayName = name || (isStudent ? "Student" : "Lecturer");
  const accentText = isStudent ? "text-emerald-700" : "text-sky-700";
  const activeMenu = isStudent
    ? "data-active:bg-emerald-100 data-active:text-emerald-800"
    : "data-active:bg-sky-100 data-active:text-sky-800";
  const BrandIcon = isStudent ? GraduationCap : BookOpen;

  const signOut = () => {
    localStorage.removeItem("user");
    window.location.href = loginHref;
  };

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-slate-200 bg-white text-slate-900">
        <SidebarHeader className="border-b border-slate-200 p-5">
          <Link href={dashboardHref} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <BrandIcon className="h-5 w-5" />
            </span>
            <span>
              <span
                className={`block text-[10px] font-semibold uppercase tracking-[0.22em] ${accentText}`}
              >
                MarkWise
              </span>
              <span className="block text-sm font-semibold text-slate-900">
                {isStudent ? "Student space" : "Lecturer workspace"}
              </span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-3 py-5">
          <SidebarGroup>
            <SidebarGroupLabel className="text-slate-500">Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map(({ label, href, icon: Icon }) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton
                      render={<Link href={href} />}
                      isActive={label === title}
                      className={`h-10 text-slate-700 hover:bg-slate-100 hover:text-slate-950 ${activeMenu}`}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="mt-5">
            <SidebarGroupLabel className="text-slate-500">Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={dashboardHref} />}
                    className="h-10 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  >
                    <UserRound />
                    <span>Profile</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`/${role}/settings`} />}
                    className={`h-10 text-slate-700 hover:bg-slate-100 hover:text-slate-950 ${activeMenu}`}
                  >
                    <Settings2 />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-slate-200 p-4">
          <div
            className={`rounded-xl border ${isStudent ? "border-emerald-200 bg-emerald-50" : "border-sky-200 bg-sky-50"} p-3`}
          >
            <p className="truncate text-sm font-semibold text-slate-900">
              {displayName}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {email || `${isStudent ? "Student" : "Lecturer"} account`}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </SidebarFooter>
      </Sidebar>
      <SidebarTrigger className="absolute top-4 left-4 z-50 md:hidden" />
      <SidebarInset>
        <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
