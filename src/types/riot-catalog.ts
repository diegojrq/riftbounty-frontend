/** Resposta típica de GET /v1/riot-catalog/sets */

export interface RiotCatalogSet {
  code: string;
  name: string;
  description?: string | null;
}
