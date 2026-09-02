"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  Radio,
  RotateCcw,
  Trash2,
  TriangleAlert,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RoleWorkspaceShell } from "@/components/layout/role-workspace-shell";
import {
  deleteNotification,
  deletePermanently,
  getBin,
  getNotifications,
  markAllRead,
  markRead,
  restoreNotification,
  type BinNotificationItem,
  type NotificationItem,
} from "@/lib/notifications";
import { acceptDelegation } from "@/lib/attendance/delegation";

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
  const [view, setView] = useState<"inbox" | "bin">("inbox");
  const [bin, setBin] = useState<BinNotificationItem[]>([]);
  const [loadingBin, setLoadingBin] = useState(false);
  const [binLoaded, setBinLoaded] = useState(false);
  // delegationId -> "accepting" | "accepted" | error message
  const [delegationState, setDelegationState] = useState<Record<string, string>>({});

  const load = async () => {
    const result = await getNotifications();
    setNotifications(result.notifications);
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
      void load()
        .catch(() => {
          setNotifications([]);
        })
        .finally(() => setLoading(false));
    } catch {
      setLoading(false);
    }
  }, [isStudent]);

  // Load the bin the first time that view is opened.
  useEffect(() => {
    if (view !== "bin" || binLoaded || !user?.token) return;
    setLoadingBin(true);
    getBin()
      .then((res) => setBin(res.notifications))
      .catch(() => setBin([]))
      .finally(() => {
        setLoadingBin(false);
        setBinLoaded(true);
      });
  }, [view, binLoaded, user?.token]);

  const handleMarkRead = async (notification: NotificationItem) => {
    if (notification.read) return;
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item,
      ),
    );
    if (user?.token) {
      await markRead(notification.id).catch(() => {});
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((current) => current.map((n) => ({ ...n, read: true })));
    if (user?.token) {
      await markAllRead().catch(() => {});
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((current) => current.filter((n) => n.id !== id));
    if (user?.token) {
      await deleteNotification(id).catch(() => {});
      setBinLoaded(false);
    }
  };

  const handleRestore = async (id: string) => {
    setBin((current) => current.filter((n) => n.id !== id));
    await restoreNotification(id).catch(() => {});
    await load().catch(() => {});
  };

  const handleDeletePermanent = async (id: string) => {
    if (!window.confirm("Permanently delete this notification? This can't be undone.")) return;
    setBin((current) => current.filter((n) => n.id !== id));
    await deletePermanently(id).catch(() => {});
  };

  const handleAcceptDelegation = async (
    notification: NotificationItem,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const data = notification.data as
      | { delegationId?: string; grantToken?: string }
      | null
      | undefined;
    if (!data?.delegationId || !data?.grantToken) return;
    setDelegationState((s) => ({ ...s, [data.delegationId!]: "accepting" }));
    try {
      await acceptDelegation(data.delegationId, data.grantToken);
      setDelegationState((s) => ({ ...s, [data.delegationId!]: "accepted" }));
    } catch (err) {
      setDelegationState((s) => ({
        ...s,
        [data.delegationId!]: err instanceof Error ? err.message : "Failed to accept",
      }));
    }
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
        view === "inbox" &&
        unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllRead}
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

          <div className="flex items-center gap-2">
            {view === "inbox" && (
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
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setView(view === "inbox" ? "bin" : "inbox")}
              className="h-6 px-2 text-[10px] bg-white border-slate-200 text-slate-600 hover:bg-slate-50 gap-1"
            >
              <Trash2 className="h-3 w-3" />
              <span>{view === "inbox" ? "View Bin" : "Back to Inbox"}</span>
            </Button>
          </div>
        </div>

        {/* Inbox View */}
        {view === "inbox" && (
          loading ? (
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
                const delegationData = notification.data as
                  | { delegationId?: string; grantToken?: string; action?: string }
                  | null
                  | undefined;
                const isDelegation = delegationData?.action === "accept-attendance-delegation";
                const delegationStatus = delegationData?.delegationId
                  ? delegationState[delegationData.delegationId]
                  : undefined;

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleMarkRead(notification)}
                    className={`group rounded-lg border p-3 transition shadow-2xs flex items-start gap-3 cursor-pointer ${
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

                      {isDelegation && delegationData?.delegationId && (
                        <div className="pt-1">
                          {delegationStatus === "accepted" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                              <UserCheck className="h-3 w-3" />
                              Accepted — open the MarkWise mobile app to run this session
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => handleAcceptDelegation(notification, e)}
                              disabled={delegationStatus === "accepting"}
                              className="h-6 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
                            >
                              <UserCheck className="h-3 w-3" />
                              <span>
                                {delegationStatus === "accepting"
                                  ? "Accepting..."
                                  : "Accept Delegation"}
                              </span>
                            </Button>
                          )}
                          {delegationStatus &&
                            delegationStatus !== "accepting" &&
                            delegationStatus !== "accepted" && (
                              <p className="text-[9.5px] text-red-600 mt-1">{delegationStatus}</p>
                            )}
                        </div>
                      )}
                    </div>

                    {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                    )}
                    <button
                      onClick={(e) => handleDelete(notification.id, e)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Bin View */}
        {view === "bin" && (
          loadingBin ? (
            <div className="py-12 text-center text-slate-400 text-[10.5px]">
              Loading bin...
            </div>
          ) : bin.length === 0 ? (
            <Card className="border-dashed border-slate-200 bg-white">
              <CardContent className="py-10 text-center space-y-1">
                <Trash2 className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-800 text-xs">Bin is empty</p>
                <p className="text-[10px] text-slate-500">
                  Deleted notifications stay here for 30 days before being removed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {bin.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-lg border border-slate-200/90 bg-white p-3 shadow-2xs flex items-start gap-3"
                >
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h4 className="text-[11px] font-bold text-slate-600">{notification.title}</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      {notification.message}
                    </p>
                    <p className="text-[9px] font-mono text-amber-600">
                      {notification.daysRemaining} day{notification.daysRemaining === 1 ? "" : "s"} left before permanent deletion
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRestore(notification.id)}
                      className="p-1 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                      aria-label="Restore notification"
                      title="Restore"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePermanent(notification.id)}
                      className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
                      aria-label="Delete permanently"
                      title="Delete permanently"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>
    </RoleWorkspaceShell>
  );
}
