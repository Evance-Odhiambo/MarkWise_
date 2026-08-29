"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleWorkspaceShell } from "@/components/workspace/RoleWorkspaceShell";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: string | null;
  read: boolean;
  createdAt: string;
}
interface Session {
  token?: string;
  name?: string;
  email?: string;
}

export function NotificationsPage({ role }: { role: "student" | "lecturer" }) {
  const isStudent = role === "student";
  const accent = isStudent
    ? { text: "text-emerald-700", icon: "text-emerald-600", unread: "border-emerald-200 bg-emerald-50/30", dot: "bg-emerald-500", action: "text-emerald-700 hover:text-emerald-800" }
    : { text: "text-sky-700", icon: "text-sky-600", unread: "border-sky-200 bg-sky-50/30", dot: "bg-sky-500", action: "text-sky-700 hover:text-sky-800" };
  const [user, setUser] = useState<Session | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (token: string) => {
    const response = await fetch("/api/v1/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(result.error || "Unable to load notifications");
    setNotifications(
      Array.isArray(result.notifications) ? result.notifications : [],
    );
  };

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("user") ?? "null",
      ) as Session | null;
      setUser(stored);
      if (!stored?.token)
        throw new Error("Please sign in to view notifications");
      void load(stored.token)
        .catch((requestError: unknown) =>
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load notifications",
          ),
        )
        .finally(() => setLoading(false));
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load notifications",
      );
      setLoading(false);
    }
  }, []);

  const markRead = async (notification: NotificationItem) => {
    if (notification.read || !user?.token) return;
    const response = await fetch(
      `/api/v1/notifications/${encodeURIComponent(notification.id)}/read`,
      { method: "POST", headers: { Authorization: `Bearer ${user.token}` } },
    );
    if (response.ok)
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item,
        ),
      );
  };

  const unread = notifications.filter(
    (notification) => !notification.read,
  ).length;
  const date = (value: string) =>
    new Date(value).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <RoleWorkspaceShell
      role={role}
      eyebrow={isStudent ? "Student workspace" : "Lecturer workspace"}
      title="Notifications"
      name={user?.name}
      email={user?.email}
    >
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {isStudent ? "Student updates and alerts" : "Teaching updates and alerts"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Notifications
              </h2>
              <p className={`mt-2 text-sm ${accent.text}`}>
                {unread
                  ? `${unread} unread update${unread === 1 ? "" : "s"}`
                  : "You are all caught up."}
              </p>
            </div>
            <Bell className={`h-6 w-6 ${accent.icon}`} />
          </div>
          {loading ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Loading notifications...
            </div>
          ) : error ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <Bell className="mx-auto h-8 w-8 text-slate-300" />
              <h3 className="mt-4 font-semibold text-slate-900">
                No notifications yet
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                New attendance and account updates will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-3">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm ${notification.read ? "border-slate-200" : accent.unread}`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notification.read ? "bg-slate-300" : accent.dot}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row">
                        <h3 className="font-semibold text-slate-950">
                          {notification.title}
                        </h3>
                        <time className="text-xs text-slate-500">
                          {date(notification.createdAt)}
                        </time>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {notification.message}
                      </p>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void markRead(notification)}
                          className={`mt-3 gap-2 px-0 hover:bg-transparent ${accent.action}`}
                        >
                          <CheckCheck className="h-4 w-4" /> Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </RoleWorkspaceShell>
  );
}
