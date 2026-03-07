import { apiGet, apiPatch, apiPost } from "./api";
import type { Notification, UnreadCountResponse } from "@/types/notification";

const BASE = "/notifications";

/** GET /v1/notifications — lista notificações */
export async function listNotifications(unreadOnly = false): Promise<Notification[]> {
  const res = await apiGet<Notification[] | { items: Notification[] }>(
    BASE,
    unreadOnly ? { unreadOnly: "true" } : undefined
  );
  return Array.isArray(res.data) ? res.data : (res.data as { items: Notification[] })?.items ?? [];
}

/** GET /v1/notifications/unread-count — retorna { count } para badge */
export async function getUnreadCount(): Promise<number> {
  const res = await apiGet<UnreadCountResponse>(`${BASE}/unread-count`);
  return res.data?.count ?? 0;
}

/** PATCH /v1/notifications/:id/read — marca uma notificação como lida */
export async function markNotificationRead(id: string): Promise<void> {
  await apiPatch(`${BASE}/${encodeURIComponent(id)}/read`, {});
}

/** POST /v1/notifications/read-all — marca todas como lidas */
export async function markAllNotificationsRead(): Promise<void> {
  await apiPost(`${BASE}/read-all`, {});
}
