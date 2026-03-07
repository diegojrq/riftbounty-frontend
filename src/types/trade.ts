/** API contract: /v1/trades */

import type { PublicProfileCard } from "./auth";

export type TradeStatus = "PENDING" | "COUNTERED" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export interface TradeItem {
  id: string;
  tradeId: string;
  cardId: string;
  quantity: number;
  /** "initiator" | "recipient" — de qual lado é este item */
  side: "initiator" | "recipient";
  card: PublicProfileCard;
}

export interface TradeMessage {
  id: string;
  tradeId: string;
  senderSlug: string;
  senderDisplayName: string | null;
  message: string;
  createdAt: string;
}

export interface Trade {
  id: string;
  status: TradeStatus;
  initiatorId: string;
  initiatorSlug: string;
  initiatorDisplayName: string | null;
  recipientId: string;
  recipientSlug: string;
  recipientDisplayName: string | null;
  /** Slug de quem deve agir agora (PENDING → recipient; COUNTERED → initiator) */
  currentTurnSlug: string;
  initiatorItems: TradeItem[] | undefined;
  recipientItems: TradeItem[] | undefined;
  messages: TradeMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface TradeSummary {
  id: string;
  status: TradeStatus;
  initiatorSlug: string;
  initiatorDisplayName: string | null;
  recipientSlug: string;
  recipientDisplayName: string | null;
  currentTurnSlug: string;
  initiatorItemCount: number;
  recipientItemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTradePayload {
  recipientSlug: string;
  items: { cardId: string; quantity: number }[];
  message?: string;
}

export type TradeStatusFilter = TradeStatus | "all";
export type TradeRoleFilter = "initiator" | "recipient" | "all";
