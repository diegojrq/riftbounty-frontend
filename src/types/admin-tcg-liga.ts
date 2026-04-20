/** Contratos admin: Liga sync + diff de preços (GET/POST /v1/admin/tcg/...). */

export type LigaSyncRequest = {
  set?: string;
  tipo?: number;
  limit?: number;
  dryRun?: boolean;
};

export type LigaSyncResponseData = {
  startedAt: string;
  finishedAt: string;
  dryRun: boolean;
  setCode: string;
  totalSourceCards: number;
  totalCatalogCards: number;
  matched: number;
  updated: number;
  unchanged: number;
  skippedNoMatch: number;
};

export type PriceDiffItem = {
  cardId: string;
  publicCode: string | null;
  name: string | null;
  set: string | null;
  /** Preço TCG no catálogo (USD). */
  tcgPriceUsd: number;
  /** Mesmo valor × cotação (BRL). */
  tcgPriceBrl: number;
  /** Preço Liga (BRL). */
  ligaPrice: number;
  /** ligaPrice − tcgPriceBrl (BRL). */
  diffSigned: number;
  /** |diffSigned| (BRL). */
  diffAbsolute: number;
};

export type PriceDiffResponseData = {
  /** Cotação BRL por 1 USD usada na conversão. */
  usdBrlRate: number;
  /** Origem da cotação (ex.: awesomeapi, frankfurter). */
  usdBrlRateSource: string;
  /** Momento em que a cotação foi obtida (ISO 8601). */
  usdBrlRateFetchedAt: string;
  order: "asc" | "desc";
  priceType: "low" | "mid" | "high";
  sortMetric: "absolute" | "signed";
  set: string | null;
  totalCount: number;
  items: PriceDiffItem[];
};

export type PriceDiffQuery = {
  set?: string;
  priceType: "low" | "mid" | "high";
  sortMetric: "absolute" | "signed";
  order: "asc" | "desc";
  limit: number;
  offset: number;
};
