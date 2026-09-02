function token() {
  if (typeof window === "undefined") return "";
  try {
    return (
      (JSON.parse(localStorage.getItem("user") ?? "{}") as { token?: string })
        .token ?? ""
    );
  } catch {
    return "";
  }
}

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`/api/v1/notifications${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? body.message ?? `HTTP ${response.status}`);
  }
  return body as T;
}

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type?: string | null;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown> | null;
};

export type BinNotificationItem = NotificationItem & { daysRemaining: number };

export function getNotifications() {
  return request<{
    notifications: NotificationItem[];
    unreadCount: number;
    hasMore: boolean;
  }>("/");
}

export function markRead(id: string) {
  return request<{ success: true }>(`/${encodeURIComponent(id)}/read`, {
    method: "POST",
  });
}

export function markAllRead() {
  return request<{ success: true }>("/read-all", { method: "POST" });
}

export function deleteNotification(id: string) {
  return request<{ success: true }>(`/${encodeURIComponent(id)}/delete`, {
    method: "POST",
  });
}

export function getBin() {
  return request<{ notifications: BinNotificationItem[] }>("/bin");
}

export function restoreNotification(id: string) {
  return request<{ success: true }>(`/${encodeURIComponent(id)}/restore`, {
    method: "POST",
  });
}

export function deletePermanently(id: string) {
  return request<{ success: true }>(
    `/${encodeURIComponent(id)}/delete-permanent`,
    { method: "POST" },
  );
}
