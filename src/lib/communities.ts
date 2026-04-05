import { ApiClientError, apiGet, apiPatch, apiPost, apiPostMultipart } from "./api";
import type { PublicProfileCard } from "@/types/auth";
import type {
  Community,
  CommunitiesListResponse,
  CommunityAggregateLineMember,
  CommunityAggregateRow,
  CommunityAggregatesResponse,
  CommunityMember,
  CommunityMembersResponse,
  JoinCommunityResponse,
} from "@/types/community";

const MEMBER_STORAGE_PREFIX = "riftbounty.community.member.";

export function getStoredCommunityMembership(slug: string): boolean | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(MEMBER_STORAGE_PREFIX + slug);
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

export function setStoredCommunityMembership(slug: string, isMember: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MEMBER_STORAGE_PREFIX + slug, isMember ? "1" : "0");
}

export function resolveCommunityErrorMessage(
  t: (key: string) => string,
  err: unknown
): string {
  if (err instanceof ApiClientError && err.code) {
    const map: Record<string, string> = {
      "common.communities.not_found": "communities.errorNotFound",
      "common.communities.slug_taken": "communities.errorSlugTaken",
      "common.communities.not_member": "communities.errorNotMember",
      "r2_not_configured": "admin.communitiesErrorR2NotConfigured",
      "common.communities.r2_not_configured": "admin.communitiesErrorR2NotConfigured",
      "r2_public_base_missing": "admin.communitiesErrorR2PublicBaseMissing",
      "common.communities.r2_public_base_missing": "admin.communitiesErrorR2PublicBaseMissing",
      "invalid_image_type": "admin.communitiesErrorInvalidImageType",
      "common.communities.invalid_image_type": "admin.communitiesErrorInvalidImageType",
      "common.communities.aggregate_wishlist_members_only": "communities.aggregateWishlistMembersOnly",
    };
    const key = map[err.code];
    if (key) return t(key);
  }
  return err instanceof Error ? err.message : t("communities.errorGeneric");
}

/** PNG, JPEG, WebP, GIF — alinhado ao backend */
const AVATAR_ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
export const COMMUNITY_AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/** Devolve chave i18n `admin.communitiesAvatarClient*` ou null se OK */
export function validateCommunityAvatarFile(file: File): "size" | "type" | null {
  if (file.size > COMMUNITY_AVATAR_MAX_BYTES) return "size";
  if (!AVATAR_ALLOWED_MIME.has(file.type)) return "type";
  return null;
}

/** POST /admin/communities/:id/avatar — campo `file`, multipart */
export async function uploadCommunityAvatarAdmin(communityId: string, file: File): Promise<Community> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiPostMultipart<CommunityRaw>(`admin/communities/${encodeURIComponent(communityId)}/avatar`, fd);
  return normalizeCommunity(res.data as CommunityRaw);
}

type CommunityRaw = Community & {
  avatar_url?: string | null;
};

function normalizeCommunity(raw: CommunityRaw): Community {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description ?? null,
    avatarUrl: raw.avatarUrl ?? raw.avatar_url ?? null,
    memberCount: typeof raw.memberCount === "number" ? raw.memberCount : 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    isMember: raw.isMember,
  };
}

export interface ListCommunitiesParams {
  limit?: number;
  offset?: number;
}

export async function listCommunities(params: ListCommunitiesParams = {}): Promise<CommunitiesListResponse> {
  const res = await apiGet<CommunitiesListResponse & { items?: CommunityRaw[] }>("/communities", {
    limit: params.limit,
    offset: params.offset,
  });
  const d = res.data;
  return {
    items: (d.items ?? []).map((i) => normalizeCommunity(i as CommunityRaw)),
    total: d.total ?? 0,
    limit: d.limit ?? 50,
    offset: d.offset ?? 0,
  };
}

export async function getCommunity(slug: string): Promise<Community> {
  const res = await apiGet<CommunityRaw>(`/communities/${encodeURIComponent(slug)}`);
  return normalizeCommunity(res.data);
}

export async function joinCommunity(slug: string): Promise<JoinCommunityResponse> {
  const res = await apiPost<JoinCommunityResponse>(`/communities/${encodeURIComponent(slug)}/join`, {});
  return res.data;
}

export async function leaveCommunity(slug: string): Promise<void> {
  await apiPost<unknown>(`/communities/${encodeURIComponent(slug)}/leave`, {});
}

/** POST /admin/communities — slug é gerado no servidor a partir do name */
export interface CreateCommunityPayload {
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
}

/** PATCH /admin/communities/:id */
export interface UpdateCommunityPayload {
  name?: string;
  slug?: string;
  description?: string | null;
  avatarUrl?: string | null;
}

export async function createCommunityAdmin(payload: CreateCommunityPayload): Promise<Community> {
  const res = await apiPost<CommunityRaw>("admin/communities", payload);
  return normalizeCommunity(res.data as CommunityRaw);
}

export async function updateCommunityAdmin(id: string, payload: UpdateCommunityPayload): Promise<Community> {
  const res = await apiPatch<CommunityRaw>(`admin/communities/${encodeURIComponent(id)}`, payload);
  return normalizeCommunity(res.data as CommunityRaw);
}

function lowerKeyMap(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]));
}

function rawVal(row: Record<string, unknown>, ...names: string[]): unknown {
  const lower = lowerKeyMap(row);
  for (const n of names) {
    const v = row[n] ?? lower[n.toLowerCase()];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function normalizeCommunityMemberRow(row: Record<string, unknown>): CommunityMember {
  return {
    userId: String(rawVal(row, "userId", "user_id", "userid") ?? ""),
    slug: String(rawVal(row, "slug") ?? ""),
    displayName: (rawVal(row, "displayName", "display_name", "displayname") as string | null) ?? null,
    joinedAt: String(rawVal(row, "joinedAt", "joined_at", "joinedat") ?? ""),
  };
}

function normalizeAggregateCardSnippet(c: unknown): PublicProfileCard | null {
  if (!c || typeof c !== "object") return null;
  const row = c as Record<string, unknown>;
  const id = String(rawVal(row, "id", "uuid") ?? "");
  if (!id && !row.uuid) return null;
  return {
    id: id || String(row.uuid),
    uuid: row.uuid as string | undefined,
    scraperId: row.scraperId as string | undefined,
    name: (rawVal(row, "name") as string | null) ?? null,
    slug: row.slug as string | undefined,
    cardSet: (rawVal(row, "cardSet", "card_set") as string | null) ?? null,
    rarity: row.rarity as string | null,
    type: row.type as string | null,
    domain: row.domain as string | null,
    domains: row.domains as string[] | null,
    cardDomains: row.cardDomains as PublicProfileCard["cardDomains"],
    image_key: (rawVal(row, "image_key", "imageKey") as string | null) ?? null,
    imageUrl: (rawVal(row, "imageUrl", "image_url") as string | null) ?? null,
    image_url: (rawVal(row, "image_url", "imageUrl") as string | null) ?? null,
  };
}

function parsePricePerCard(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeAggregateLineMemberRow(r: Record<string, unknown>): CommunityAggregateLineMember {
  return {
    userId: String(rawVal(r, "userId", "user_id", "userid") ?? ""),
    slug: String(rawVal(r, "slug") ?? ""),
    displayName: (rawVal(r, "displayName", "display_name", "displayname") as string | null) ?? null,
    quantity: Number(rawVal(r, "quantity") ?? 0) || 0,
    pricePerCard: parsePricePerCard(rawVal(r, "pricePerCard", "price_per_card", "pricepercard")),
  };
}

function normalizeAggregateLinesFromRow(row: Record<string, unknown>): CommunityAggregateLineMember[] {
  const linesRaw = rawVal(row, "lines", "Lines");
  if (!Array.isArray(linesRaw)) return [];
  return linesRaw.map((item) => normalizeAggregateLineMemberRow((item ?? {}) as Record<string, unknown>));
}

function normalizeCommunityAggregateRow(row: Record<string, unknown>): CommunityAggregateRow {
  const cardNested = rawVal(row, "card", "Card");
  return {
    cardId: String(rawVal(row, "cardId", "card_id", "cardid") ?? ""),
    totalQuantity: Number(rawVal(row, "totalQuantity", "total_quantity", "totalquantity") ?? 0),
    memberCount: Number(rawVal(row, "memberCount", "member_count", "membercount") ?? 0),
    card: normalizeAggregateCardSnippet(cardNested) ?? normalizeAggregateCardSnippet(row),
    lines: normalizeAggregateLinesFromRow(row),
  };
}

function normalizeMembersPayload(d: unknown): CommunityMembersResponse {
  const o = (d ?? {}) as Record<string, unknown>;
  const itemsRaw = o.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((r) => normalizeCommunityMemberRow((r ?? {}) as Record<string, unknown>))
    : [];
  return {
    items,
    total: Number(o.total ?? 0),
    limit: Number(o.limit ?? 50),
    offset: Number(o.offset ?? 0),
  };
}

function normalizeAggregatesPayload(d: unknown): CommunityAggregatesResponse {
  const o = (d ?? {}) as Record<string, unknown>;
  const itemsRaw = o.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((r) => normalizeCommunityAggregateRow((r ?? {}) as Record<string, unknown>))
    : [];
  return { items };
}

/** GET /communities/:slug/members */
export async function listCommunityMembers(
  slug: string,
  params: ListCommunitiesParams = {}
): Promise<CommunityMembersResponse> {
  const res = await apiGet<unknown>(`/communities/${encodeURIComponent(slug)}/members`, {
    limit: params.limit,
    offset: params.offset,
  });
  return normalizeMembersPayload(res.data);
}

/** GET /communities/:slug/aggregates/for-sale */
export async function getCommunityAggregatesForSale(slug: string): Promise<CommunityAggregatesResponse> {
  const res = await apiGet<unknown>(`/communities/${encodeURIComponent(slug)}/aggregates/for-sale`);
  return normalizeAggregatesPayload(res.data);
}

/** GET /communities/:slug/aggregates/wishlist — Bearer; só membros (403 common.communities.aggregate_wishlist_members_only) */
export async function getCommunityAggregatesWishlist(slug: string): Promise<CommunityAggregatesResponse> {
  const res = await apiGet<unknown>(`/communities/${encodeURIComponent(slug)}/aggregates/wishlist`);
  return normalizeAggregatesPayload(res.data);
}
