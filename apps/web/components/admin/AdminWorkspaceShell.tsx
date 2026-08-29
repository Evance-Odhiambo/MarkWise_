"use client";

import Link from "next/link";
import {
  BellRing,
  BriefcaseBusiness,
  Building2,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  UsersRound,
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

const sections = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/admin/super-admin", icon: LayoutDashboard },
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
    label: "Operations",
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

interface AdminWorkspaceShellProps {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}

export function AdminWorkspaceShell({
  eyebrow,
  title,
  children,
}: AdminWorkspaceShellProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50">
        <Sidebar className="border-r border-slate-200 bg-white/90">
          <SidebarHeader className="border-b border-slate-200 p-4">
            <Link href="/admin/super-admin" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">
                  MarkWise
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  Admin workspace
                </p>
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            {sections.map((section) => (
              <SidebarGroup key={section.label}>
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map(
                      ({ title: itemTitle, href, icon: Icon }) => (
                        <SidebarMenuItem key={itemTitle}>
                          <Link
                            href={href}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Icon className="h-4 w-4" />
                            <span>{itemTitle}</span>
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
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-sm sm:px-6">
            <SidebarTrigger className="md:hidden" />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {eyebrow}
              </p>
              <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            </div>
            <BellRing className="ml-auto h-4 w-4 text-slate-500" />
          </header>
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
