"use client";

import { useEffect, useState } from "react";
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
  Trash2,
  UserRound,
} from "lucide-react";

type Role = "student" | "lecturer";

export function AccountSettings({ role }: { role: Role }) {
  const [token, setToken] = useState<string | null>(null);
  const [name, setName] = useState("Account");
  const [email, setEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginPath = `/${role}/login`;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") ?? "null") as {
        token?: string;
        name?: string;
        email?: string;
      } | null;
      setToken(stored?.token ?? null);
      setName(stored?.name || (role === "student" ? "Student" : "Lecturer"));
      setEmail(stored?.email ?? "");
    } catch {
      setToken(null);
    }
  }, [role]);

  const signOut = () => {
    localStorage.removeItem("user");
    window.location.href = loginPath;
  };

  const deleteAccount = async () => {
    if (
      !token ||
      !window.confirm("Delete your account? This action cannot be undone.")
    )
      return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/${role}s/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "Unable to delete account");
      localStorage.removeItem("user");
      window.location.href = loginPath;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete account",
      );
      setDeleting(false);
    }
  };

  const isStudent = role === "student";
  const dashboardPath = `/${role}/dashboard`;
  const navigation = isStudent
    ? [
        { label: "Overview", href: dashboardPath, icon: LayoutDashboard },
        { label: "Attendance", href: "/attend", icon: CalendarCheck2 },
        { label: "My Units", href: "/student/units", icon: BookOpen },
        { label: "Notifications", href: "/student/notifications", icon: Bell },
      ]
    : [
        { label: "Overview", href: dashboardPath, icon: LayoutDashboard },
        {
          label: "Attendance",
          href: "/lecturer/attendance/online",
          icon: Radio,
        },
        { label: "My Units", href: "/lecturer/units", icon: BookOpen },
        { label: "Notifications", href: "/lecturer/notifications", icon: Bell },
      ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="border-b border-slate-200 p-5">
          <Link href={dashboardPath} className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${isStudent ? "bg-emerald-600" : "bg-slate-900"} text-white`}
            >
              {isStudent ? (
                <GraduationCap className="h-5 w-5" />
              ) : (
                <BookOpen className="h-5 w-5" />
              )}
            </span>
            <span>
              <span
                className={`block text-[10px] font-semibold uppercase tracking-[0.22em] ${isStudent ? "text-emerald-700" : "text-sky-700"}`}
              >
                MarkWise
              </span>
              <span className="block text-sm font-semibold text-slate-900">
                {isStudent ? "Student space" : "Lecturer workspace"}
              </span>
            </span>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-5" aria-label="Workspace navigation">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
          <div className="mt-3 space-y-1">
            {navigation.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
          <p className="mt-7 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Account
          </p>
          <div className="mt-3 space-y-1">
            <Link
              href={dashboardPath}
              className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <UserRound className="h-4 w-4" />
              Profile
            </Link>
            <Link
              href={`/${role}/settings`}
              aria-current="page"
              className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold ${isStudent ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}
            >
              <Settings2 className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div
            className={`rounded-xl ${isStudent ? "bg-emerald-50" : "bg-sky-50"} p-3`}
          >
            <p className="truncate text-sm font-semibold text-slate-900">
              {name}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {email || `${isStudent ? "Student" : "Lecturer"} account`}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div
        className={`min-w-0 flex-1 overflow-hidden ${isStudent ? "bg-emerald-50/30" : "bg-sky-50/30"}`}
      >
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur sm:px-8">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.2em] ${isStudent ? "text-emerald-700" : "text-sky-700"}`}
          >
            Account
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-950">
            Account settings
          </h1>
        </header>
        <main className="h-[calc(100vh-73px)] w-full overflow-y-auto overflow-x-hidden p-5 sm:p-8">
          <div className="mx-auto w-full max-w-4xl space-y-6">
            <p className="text-sm text-slate-600">
              Manage your MarkWise account and access.
            </p>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${isStudent ? "bg-emerald-100" : "bg-sky-100"}`}
                >
                  <UserRound
                    className={`h-5 w-5 ${isStudent ? "text-emerald-700" : "text-sky-700"}`}
                  />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-950">{name}</h2>
                  <p className="text-sm text-slate-500">
                    {email || `${isStudent ? "Student" : "Lecturer"} account`}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
                <button
                  type="button"
                  onClick={() => void deleteAccount()}
                  disabled={deleting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />{" "}
                  {deleting ? "Deleting…" : "Delete account"}
                </button>
              </div>
              {error && (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
