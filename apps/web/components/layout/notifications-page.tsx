"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  Filter,
  Info,
  Radio,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleWorkspaceShell } from "@/components/layout/role-workspace-shell";

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
  const [user, setUser] = useState<Session | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "ATTENDANCE" | "SYSTEM">("ALL");
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
      if (!stored?.token) {
        // Mock notifications for demonstration if none exist
        setNotifications([
          {
            id: "n-1",
            title: isStudent ? "Attendance Goal Warning" : "Low Attendance Alert",
            message: isStudent
              ? "Your attendance in CS-303 Operating Systems is currently 75%. Attend upcoming lectures to maintain exam clearance."
              : "3 students in CS-301 have dropped below the 75% attendance threshold.",
            type: "ATTENDANCE",
            read: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: "n-2",
            title: "BLE Beacon System Active",
            message: "Classroom BLE beacon synchronization is operating normally across all academic complex halls.",
            type: "SYSTEM",
            read: false,
            createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          },
          {
            id: "n-3",
            title: isStudent ? "Lecture Verified" : "Session Concluded",
            message: isStudent
              ? "Your attendance for CS-301 Data Structures & Algorithms has been successfully recorded and verified."
              : "Attendance session for CS-301 concluded with 42 verified student check-ins.",
            type: "ATTENDANCE",
            read: true,
            createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          },
        ]);
        setLoading(false);
        return;
      }
      void load(stored.token)
        .catch(() => {
          setNotifications([]);
        })
        .finally(() => setLoading(false));
    } catch {
      setLoading(false);
    }
  }, [isStudent]);

  const markRead = async (notification: NotificationItem) => {
    if (notification.read) return;
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item,
      ),
    );

    if (user?.token) {
      await fetch(
        `/api/v1/notifications/${encodeURIComponent(notification.id)}/read`,
        { method: "POST", headers: { Authorization: `Bearer ${user.token}` } },
      ).catch(() => {});
    }
  };

  const markAllRead = () => {
    setNotifications((current) => current.map((n) => ({ ...n, read: true })));
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filter === "UNREAD") return !item.read;
    if (filter === "ATTENDANCE") return item.type === "ATTENDANCE" || item.title.toLowerCase().includes("attendance");
    if (filter === "SYSTEM") return item.type === "SYSTEM" || item.title.toLowerCase().includes("ble") || item.title.toLowerCase().includes("system");
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <RoleWorkspaceShell
      role={role}
      eyebrow={isStudent ? "Student Portal" : "Lecturer Portal"}
      title="Notifications & Alerts"
      name={user?.name}
      email={user?.email}
      actions={
        unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={markAllRead}
            className="h-7 px-2 text-[10px] text-slate-700 bg-white border-slate-200 hover:bg-slate-50 gap-1 shadow-2xs"
          >
            <CheckCheck className="h-3 w-3 text-emerald-600" />
            <span>Mark All Read</span>
          </Button>
        )
      }
    >
      <main className="p-3 sm:p-4 space-y-3 max-w-[1200px] mx-auto text-[11px]">
        {/* Header Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <Bell className={`h-4 w-4 ${isStudent ? "text-emerald-600" : "text-sky-600"}`} />
            <span className="font-bold text-slate-900 text-xs">Inbox</span>
            {unreadCount > 0 && (
              <Badge
                variant="outline"
                className={`text-[9.5px] font-mono ${
                  isStudent
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-sky-200 bg-sky-50 text-sky-800"
                }`}
              >
                {unreadCount} Unread
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-0.5 text-[10px]">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-2 py-0.5 rounded font-medium transition ${
                filter === "ALL"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("UNREAD")}
              className={`px-2 py-0.5 rounded font-medium transition ${
                filter === "UNREAD"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter("ATTENDANCE")}
              className={`px-2 py-0.5 rounded font-medium transition ${
                filter === "ATTENDANCE"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Attendance
            </button>
            <button
              onClick={() => setFilter("SYSTEM")}
              className={`px-2 py-0.5 rounded font-medium transition ${
                filter === "SYSTEM"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              System
            </button>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-[10.5px]">
            Loading updates...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="border-dashed border-slate-200 bg-white">
            <CardContent className="py-10 text-center space-y-1">
              <CheckCircle2 className="h-6 w-6 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-800 text-xs">You are all caught up!</p>
              <p className="text-[10px] text-slate-500">
                No notifications matching your current filter.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {filteredNotifications.map((notification) => {
              const isWarning =
                notification.title.toLowerCase().includes("warning") ||
                notification.title.toLowerCase().includes("alert");

              return (
                <div
                  key={notification.id}
                  onClick={() => markRead(notification)}
                  className={`rounded-lg border p-3 transition shadow-2xs flex items-start gap-3 cursor-pointer ${
                    !notification.read
                      ? isStudent
                        ? "border-emerald-200/90 bg-emerald-50/40 hover:bg-emerald-50/60"
                        : "border-sky-200/90 bg-sky-50/40 hover:bg-sky-50/60"
                      : "border-slate-200/90 bg-white hover:bg-slate-50/60"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                      isWarning
                        ? "bg-amber-100 text-amber-700"
                        : notification.type === "SYSTEM"
                          ? "bg-slate-100 text-slate-700"
                          : isStudent
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {isWarning ? (
                      <TriangleAlert className="h-3.5 w-3.5" />
                    ) : notification.type === "SYSTEM" ? (
                      <Info className="h-3.5 w-3.5" />
                    ) : (
                      <Radio className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-[11px] font-bold ${
                          !notification.read ? "text-slate-900" : "text-slate-700"
                        }`}
                      >
                        {notification.title}
                      </h4>
                      <span className="text-[9px] font-mono text-slate-400">
                        {new Date(notification.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      {notification.message}
                    </p>
                  </div>

                  {!notification.read && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </RoleWorkspaceShell>
  );
}
