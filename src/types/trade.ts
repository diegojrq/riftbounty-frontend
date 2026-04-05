/** API contract: /v1/trades */

import type { PublicProfileCard } from "./auth";

export type TradeStatus = "PENDING" | "COUNTERED" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export interface TradeItem {
  id: string;
  tradeId: string;
  cardId: string;
  quantity: number;
  /** Valor declarado informativo: null ou string com 2 decimais (ex. "15.50"). */
  declaredValue: string | null;
  /** "initiator" | "recipient" — de qual lado é este item */
  side: "initiator" | "recipient";
  /** Pode vir null no GET /trades/:id se o backend não embutir a carta */
  card: PublicProfileCard | null;
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

export type CreateTradeLinePayload = {
  cardId: string;
  quantity: number;
  /** Opcional; omitir = sem valor declarado. */
  declaredValue?: number;
};

export interface CreateTradePayload {
  recipientSlug: string;
  /** Sua oferta — cartas que você dá. Pelo menos 1 item. */
  items: CreateTradeLinePayload[];
  /** O que você quer do outro (opcional). O outro vê no trade e pode aceitar ou contrapropor. */
  requestedItems?: CreateTradeLinePayload[];
  message?: string;
}

export type TradeStatusFilter = TradeStatus | "all";
export type TradeRoleFilter = "initiator" | "recipient" | "all";

export type UpdateTradeItemPayload = {
  quantity: number;
  /** Omitir = não alterar; `null` = remover valor declarado. */
  declaredValue?: number | null;
};
