import { apiDelete, apiGet, apiPatch, apiPost } from "./api";
import type {
  Trade,
  TradeStatus,
  TradeSummary,
  CreateTradePayload,
  TradeItem,
  TradeMessage,
  TradeStatusFilter,
  TradeRoleFilter,
} from "@/types/trade";

const BASE = "/trades";

type RawUser = { id?: string; slug?: string; displayName?: string | null };
type RawSender = { slug?: string; displayName?: string | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeItem(raw: any, initiatorId: string): TradeItem {
  // Determine side: prefer explicit side field, else derive from offeredByUserId
  const side: "initiator" | "recipient" =
    raw.side === "initiator" || raw.side === "recipient"
      ? raw.side
      : raw.offeredByUserId === initiatorId
      ? "initiator"
      : "recipient";

  return {
    id: raw.id,
    tradeId: raw.tradeId ?? "",
    // API may use cardUuid or cardId
    cardId: raw.cardId ?? raw.cardUuid ?? "",
    quantity: raw.quantity ?? 1,
    side,
    card: raw.card ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeTrade(raw: Record<string, any>): Trade {
  // Support both flat (initiatorSlug) and nested (initiator.slug) shapes
  const initiator = (raw.initiator ?? {}) as RawUser;
  const recipient = (raw.recipient ?? {}) as RawUser;

  const initiatorId: string = raw.initiatorId ?? initiator.id ?? "";
  const initiatorSlug: string = raw.initiatorSlug ?? initiator.slug ?? "";
  const initiatorDisplayName: string | null = raw.initiatorDisplayName ?? initiator.displayName ?? null;

  const recipientId: string = raw.recipientId ?? recipient.id ?? "";
  const recipientSlug: string = raw.recipientSlug ?? recipient.slug ?? "";
  const recipientDisplayName: string | null = raw.recipientDisplayName ?? recipient.displayName ?? null;

  // Normalize status: backend may return lowercase ("pending") or uppercase ("PENDING")
  const status = (raw.status as string).toUpperCase() as TradeStatus;

  // Items: flat array with offeredByUserId (or side field) → split by initiator/recipient
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawItems: any[] = raw.items ?? [];
  const normalizedItems = rawItems.map((i) => normalizeItem(i, initiatorId));

  const initiatorItems: TradeItem[] =
    raw.initiatorItems != null
      ? raw.initiatorItems
      : normalizedItems.filter((i) => i.side === "initiator");
  const recipientItems: TradeItem[] =
    raw.recipientItems != null
      ? raw.recipientItems
      : normalizedItems.filter((i) => i.side === "recipient");

  // currentTurnSlug: derive from status if not provided
  // PENDING = recipient's turn; COUNTERED = initiator's turn
  const currentTurnSlug: string =
    raw.currentTurnSlug ??
    (status === "PENDING" ? recipientSlug : status === "COUNTERED" ? initiatorSlug : "");

  // Messages: sender may be nested (sender.slug / user.slug) or flat (senderSlug)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: TradeMessage[] = (raw.messages ?? []).map((m: any) => {
    const sender = (m.sender ?? m.user ?? {}) as RawSender;
    return {
      ...m,
      senderSlug: m.senderSlug ?? sender.slug ?? "",
      senderDisplayName: m.senderDisplayName ?? sender.displayName ?? null,
    };
  });

  return {
    id: raw.id,
    status,
    initiatorId,
    initiatorSlug,
    initiatorDisplayName,
    recipientId,
    recipientSlug,
    recipientDisplayName,
    currentTurnSlug,
    initiatorItems,
    recipientItems,
    messages,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export interface ListTradesParams {
  status?: TradeStatusFilter;
  role?: TradeRoleFilter;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSummary(raw: any): TradeSummary {
  const initiator = (raw.initiator ?? {}) as RawUser;
  const recipient = (raw.recipient ?? {}) as RawUser;
  const initiatorId: string = raw.initiatorId ?? initiator.id ?? "";

  // Derive counts: prefer pre-computed fields, fall back to counting items[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = raw.items ?? [];
  const initiatorItemCount: number =
    raw.initiatorItemCount ??
    items.filter((i) => (i.offeredByUserId ?? i.userId) === initiatorId || i.side === "initiator").length;
  const recipientItemCount: number =
    raw.recipientItemCount ??
    items.filter((i) => (i.offeredByUserId ?? i.userId) !== initiatorId && i.side !== "initiator" || i.side === "recipient").length;

  const status = (raw.status as string).toUpperCase() as TradeStatus;
  const recipientSlug: string = raw.recipientSlug ?? (raw.recipient as RawUser | undefined)?.slug ?? "";

  return {
    id: raw.id,
    status,
    initiatorSlug: raw.initiatorSlug ?? initiator.slug ?? "",
    initiatorDisplayName: raw.initiatorDisplayName ?? initiator.displayName ?? null,
    recipientSlug,
    recipientDisplayName: raw.recipientDisplayName ?? (raw.recipient as RawUser | undefined)?.displayName ?? null,
    currentTurnSlug: raw.currentTurnSlug ?? (status === "PENDING" ? recipientSlug : raw.initiatorSlug ?? initiator.slug ?? ""),
    initiatorItemCount,
    recipientItemCount,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/** GET /v1/trades — lista meus trades com filtros opcionais */
export async function listTrades(params?: ListTradesParams): Promise<TradeSummary[]> {
  const query: Record<string, string | undefined> = {};
  if (params?.status && params.status !== "all") query.status = params.status.toLowerCase();
  if (params?.role && params.role !== "all") query.role = params.role;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await apiGet<any>(BASE, query);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.items)
    ? res.data.items
    : [];
  return items.map(normalizeSummary);
}

/** GET /v1/trades/:id — detalhe completo com itens e mensagens */
export async function getTrade(id: string): Promise<Trade> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await apiGet<any>(`${BASE}/${encodeURIComponent(id)}`);
  // Backend may return a single object or an array with one item
  const raw = Array.isArray(res.data) ? res.data[0] : res.data;
  return normalizeTrade(raw);
}

/** POST /v1/trades — cria e envia proposta */
export async function createTrade(payload: CreateTradePayload): Promise<Trade> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await apiPost<any>(BASE, payload);
  return normalizeTrade(res.data);
}

/** POST /v1/trades/:id/items — adiciona carta à própria oferta */
export async function addTradeItem(
  tradeId: string,
  cardId: string,
  quantity: number
): Promise<TradeItem> {
  const res = await apiPost<TradeItem>(`${BASE}/${encodeURIComponent(tradeId)}/items`, {
    cardId,
    quantity,
  });
  return res.data;
}

/** PATCH /v1/trades/:id/items/:itemId — atualiza quantidade */
export async function updateTradeItem(
  tradeId: string,
  itemId: string,
  quantity: number
): Promise<TradeItem> {
  const res = await apiPatch<TradeItem>(
    `${BASE}/${encodeURIComponent(tradeId)}/items/${encodeURIComponent(itemId)}`,
    { quantity }
  );
  return res.data;
}

/** DELETE /v1/trades/:id/items/:itemId — remove item da oferta */
export async function removeTradeItem(tradeId: string, itemId: string): Promise<void> {
  await apiDelete(`${BASE}/${encodeURIComponent(tradeId)}/items/${encodeURIComponent(itemId)}`);
}

/** POST /v1/trades/:id/messages — envia mensagem */
export async function sendTradeMessage(tradeId: string, message: string): Promise<TradeMessage> {
  const res = await apiPost<TradeMessage>(
    `${BASE}/${encodeURIComponent(tradeId)}/messages`,
    { message }
  );
  return res.data;
}

/** POST /v1/trades/:id/submit — submete para o outro revisar */
export async function submitTrade(tradeId: string): Promise<Trade> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await apiPost<any>(`${BASE}/${encodeURIComponent(tradeId)}/submit`, {});
  return normalizeTrade(res.data);
}

/** POST /v1/trades/:id/accept — aceita → ACCEPTED */
export async function acceptTrade(tradeId: string): Promise<Trade> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await apiPost<any>(`${BASE}/${encodeURIComponent(tradeId)}/accept`, {});
  return normalizeTrade(res.data);
}

/** POST /v1/trades/:id/reject — rejeita → REJECTED */
export async function rejectTrade(tradeId: string): Promise<Trade> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await apiPost<any>(`${BASE}/${encodeURIComponent(tradeId)}/reject`, {});
  return normalizeTrade(res.data);
}

/** DELETE /v1/trades/:id — cancela → CANCELLED (só iniciador) */
export async function cancelTrade(tradeId: string): Promise<void> {
  await apiDelete(`${BASE}/${encodeURIComponent(tradeId)}`);
}
