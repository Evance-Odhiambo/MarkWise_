"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCheck,
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

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "Navigation" | "Actions" | "Institutions" | "System";
  shortcut?: string;
  onSelect: () => void;
}

interface AdminCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminCommandPalette({ open, onOpenChange }: AdminCommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const items: CommandItem[] = [
    {
      id: "nav-dash",
      title: "Operations Control Center",
      subtitle: "Main Super Admin dashboard & telemetry",
      icon: LayoutDashboard,
      category: "Navigation",
      shortcut: "G D",
      onSelect: () => {
        router.push("/admin/super-admin");
        onOpenChange(false);
      },
    },
    {
      id: "nav-inst",
      title: "Institutions Directory",
      subtitle: "Manage all registered university & college tenants",
      icon: Building2,
      category: "Navigation",
      shortcut: "G I",
      onSelect: () => {
        router.push("/admin/super-admin/institutions");
        onOpenChange(false);
      },
    },
    {
      id: "nav-overview",
      title: "Readiness & Rollout Matrix",
      subtitle: "Multi-school setup pipeline & compliance health",
      icon: Sparkles,
      category: "Navigation",
      shortcut: "G O",
      onSelect: () => {
        router.push("/admin/super-admin/institutions/overview");
        onOpenChange(false);
      },
    },
    {
      id: "nav-approvals",
      title: "Institution Approvals Queue",
      subtitle: "Review pending onboarding applications",
      icon: FileCheck2,
      category: "Navigation",
      shortcut: "G A",
      onSelect: () => {
        router.push("/admin/super-admin/onboarding");
        onOpenChange(false);
      },
    },
    {
      id: "nav-sec",
      title: "Security & Audit Logs",
      subtitle: "Track administrative activities, logins, and API access",
      icon: ShieldAlert,
      category: "Navigation",
      shortcut: "G S",
      onSelect: () => {
        router.push("/admin/super-admin/security");
        onOpenChange(false);
      },
    },
    {
      id: "nav-sys",
      title: "System Telemetry & Health",
      subtitle: "API latency, Redis cache, DB pool, and BLE beacon fleet",
      icon: Radio,
      category: "Navigation",
      shortcut: "G T",
      onSelect: () => {
        router.push("/admin/super-admin/system");
        onOpenChange(false);
      },
    },
    {
      id: "nav-flags",
      title: "Feature Flags & Settings",
      subtitle: "Platform toggles, maintenance mode, and announcements",
      icon: Settings2,
      category: "Navigation",
      shortcut: "G F",
      onSelect: () => {
        router.push("/admin/super-admin/settings");
        onOpenChange(false);
      },
    },
    {
      id: "nav-setup",
      title: "Curriculum Setup Workspace",
      subtitle: "Configure academic programs, semesters, and course units",
      icon: CheckCheck,
      category: "Navigation",
      onSelect: () => {
        router.push("/setup");
        onOpenChange(false);
      },
    },
    {
      id: "action-add-inst",
      title: "Add New Institution",
      subtitle: "Provision a new tenant immediately",
      icon: Zap,
      category: "Actions",
      onSelect: () => {
        router.push("/admin/super-admin/institutions?action=new");
        onOpenChange(false);
      },
    },
    {
      id: "action-signout",
      title: "Sign Out",
      subtitle: "Terminate your active super admin session",
      icon: LogOut,
      category: "Actions",
      onSelect: () => {
        localStorage.removeItem("user");
        router.push("/admin/super-admin/login");
        onOpenChange(false);
      },
    },
  ];

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(search.toLowerCase())) ||
      item.category.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-4 pt-[12vh] backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 text-slate-100 shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="relative flex items-center border-b border-slate-800 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) =>
                  prev === 0 ? filteredItems.length - 1 : prev - 1,
                );
              } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
                e.preventDefault();
                filteredItems[selectedIndex].onSelect();
              }
            }}
            placeholder="Type a command or search (e.g. Institutions, Telemetry, Security)..."
            className="ml-2.5 flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9.5px] font-mono font-medium text-slate-400 border border-slate-700">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[320px] overflow-y-auto p-1.5">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No matching commands or pages found.
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                          isSelected
                            ? "bg-emerald-500/30 text-emerald-300"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[11.5px]">{item.title}</p>
                        {item.subtitle && (
                          <p className="truncate text-[10px] text-slate-400">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-400">
                        {item.category}
                      </span>
                      {item.shortcut && (
                        <span className="font-mono text-[10px] text-slate-500">
                          {item.shortcut}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/50 px-3 py-1.5 text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>Use ↑↓ to navigate</span>
            <span>·</span>
            <span>↵ to select</span>
          </div>
          <span className="font-mono text-emerald-400/80">Super Admin v2.4</span>
        </div>
      </div>
    </div>
  );
}

