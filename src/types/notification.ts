/** API contract: /v1/notifications */

export type NotificationType =
  | "trade_received"
  | "trade_countered"
  | "trade_updated"
  | "trade_accepted"
  | "trade_rejected"
  | "trade_cancelled";

export interface NotificationPayload {
  tradeId: string;
  counterpartSlug: string;
  counterpartDisplayName: string | null;
}

export interface Notification {
  id: string;
  type: NotificationType;
  read: boolean;
  payload: NotificationPayload;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}
