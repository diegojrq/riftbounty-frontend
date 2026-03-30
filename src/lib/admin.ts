/**
 * Admin API — requer usuário com role === 'admin'.
 * Todas as rotas retornam 403 com mensagem "Admin role required" se não for admin.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "./api";
import type { Card, CardsListResponse } from "@/types/card";

const BASE = "admin/cards";

export interface AdminRefItem {
  id: number;
  name: string;
}

export interface AdminRefListResponse {
  items: AdminRefItem[];
}

export interface AdminTcgSyncSummary {
  startedAt: string;
  finishedAt: string;
  matched: number;
  noMatch: number;
  groupErrors: string[];
  pricesUpdated: number;
  pricesSkipped: number;
  remainingWithoutProductId: number;
}

export interface AdminCatalogVersionBumpResponse {
  version: string | number;
}

export interface AdminCatalogLoadMetrics {
  mode: string;
  added?: number;
  skippedExisting?: number;
  loaded: number;
  totalInJson: number;
  existingBefore: number;
}

export interface AdminCatalogVersionLoadResponse {
  mode?: string;
  version?: string | number;
  metrics?: AdminCatalogLoadMetrics;
  loaderResult?: unknown;
  stderr?: string;
}

/** POST /v1/cards/catalog-version/backfill-image-urls — CardImageUrlBackfillService */
export interface AdminBackfillImageUrlsBody {
  dryRun?: boolean;
  all?: boolean;
}

export type AdminBackfillImageUrlsResponse = Record<string, unknown>;

export type AdminCard = Card & {
  /** Contexto retornado pelo admin: arrays de nomes. */
  domains?: string[];
  subtypes?: string[];
  supertypes?: string[];
  attributes?: string[];
};

/** POST /v1/admin/cards — scraperId obrigatório; demais opcionais */
export interface CreateCardDto {
  scraperId: string;
  name?: string;
  collectorNumber?: string;
  set?: string;
  cardSet?: string;
  rarity?: string;
  type?: string;
  orientation?: string;
  recordType?: string;
  domain?: string;
  description?: string;
  altText?: string;
  cost?: string;
  power?: number | null;
  energy?: number;
  might?: number;
  cmc?: number;
  illustrator?: string;
  image_key?: string;
  slug?: string;
  attributes?: string[] | Record<string, unknown>;
  subtypes?: string[];
  supertypes?: string[];
  /** IDs das tabelas de referência (admin). */
  domainIds?: number[];
  subtypeIds?: number[];
  supertypeIds?: number[];
  attributeIds?: number[];
}

/** PATCH /v1/admin/cards/:id — todos os campos opcionais */
export interface UpdateCardDto {
  name?: string;
  collectorNumber?: string;
  set?: string;
  cardSet?: string;
  rarity?: string;
  type?: string;
  orientation?: string;
  recordType?: string;
  domain?: string;
  description?: string;
  altText?: string;
  cost?: string;
  power?: number | null;
  energy?: number;
  might?: number;
  cmc?: number;
  illustrator?: string;
  image_key?: string;
  slug?: string;
  attributes?: string[] | Record<string, unknown>;
  subtypes?: string[];
  supertypes?: string[];
  /** IDs das tabelas de referência (admin). Se enviados, substituem as relações atuais. */
  domainIds?: number[];
  subtypeIds?: number[];
  supertypeIds?: number[];
  attributeIds?: number[];
}

/** GET /v1/admin/cards — mesmos query params do GET /v1/cards */
export async function listAdminCards(
  params?: Record<string, string | number | boolean | undefined>
): Promise<CardsListResponse> {
  const res = await apiGet<CardsListResponse>(BASE, params);
  return res.data ?? { items: [], totalCount: 0 };
}

/** GET /v1/admin/cards/:id — id da carta (catálogo /cards) ou scraper_id legado */
export async function getAdminCard(id: string): Promise<AdminCard> {
  const res = await apiGet<AdminCard>(`${BASE}/${encodeURIComponent(id)}`);
  return res.data;
}

/** POST /v1/admin/cards */
export async function createAdminCard(body: CreateCardDto): Promise<AdminCard> {
  const res = await apiPost<AdminCard>(BASE, body);
  return res.data;
}

/** PATCH /v1/admin/cards/:id */
export async function updateAdminCard(id: string, body: UpdateCardDto): Promise<AdminCard> {
  const res = await apiPatch<AdminCard>(`${BASE}/${encodeURIComponent(id)}`, body);
  return res.data;
}

/** DELETE /v1/admin/cards/:id */
export async function deleteAdminCard(id: string): Promise<void> {
  await apiDelete<null>(`${BASE}/${encodeURIComponent(id)}`);
}

export async function listAdminDomains(): Promise<AdminRefItem[]> {
  const res = await apiGet<AdminRefListResponse>("admin/domains");
  return res.data?.items ?? [];
}

export async function listAdminSubtypes(): Promise<AdminRefItem[]> {
  const res = await apiGet<AdminRefListResponse>("admin/subtypes");
  return res.data?.items ?? [];
}

export async function listAdminSupertypes(): Promise<AdminRefItem[]> {
  const res = await apiGet<AdminRefListResponse>("admin/supertypes");
  return res.data?.items ?? [];
}

export async function listAdminAttributes(): Promise<AdminRefItem[]> {
  const res = await apiGet<AdminRefListResponse>("admin/attributes");
  return res.data?.items ?? [];
}

/** POST /v1/admin/tcg/sync — executa match + atualização de preços TCG */
export async function runAdminTcgSync(): Promise<AdminTcgSyncSummary> {
  const res = await apiPost<AdminTcgSyncSummary>("admin/tcg/sync", {});
  return res.data;
}

/** POST /v1/admin/catalog-version/bump — incrementa versão do catálogo e invalida cache no backend */
export async function bumpAdminCatalogVersion(): Promise<AdminCatalogVersionBumpResponse> {
  const res = await apiPost<AdminCatalogVersionBumpResponse>("admin/catalog-version/bump", {});
  return res.data;
}

/** POST /v1/admin/catalog-version/load — carrega cartas de catalog version (incremental/full no backend) */
export async function loadAdminCatalogVersion(): Promise<AdminCatalogVersionLoadResponse> {
  const res = await apiPost<AdminCatalogVersionLoadResponse>("admin/catalog-version/load", {});
  return res.data;
}

/** POST /v1/cards/catalog-version/backfill-image-urls — preenche image_url (R2); dryRun default true no back */
export async function postBackfillCardImageUrls(
  body: AdminBackfillImageUrlsBody
): Promise<AdminBackfillImageUrlsResponse> {
  const res = await apiPost<AdminBackfillImageUrlsResponse>(
    "cards/catalog-version/backfill-image-urls",
    body
  );
  return (res.data ?? {}) as AdminBackfillImageUrlsResponse;
}
