import { apiGet } from "./api";

export interface AbilitiesListData {
  items: string[];
}

/** GET /v1/abilities — textos únicos entre `[` e `]` nas descrições (ordenados). */
export async function getAbilities(): Promise<string[]> {
  const res = await apiGet<AbilitiesListData>("abilities");
  return res.data?.items ?? [];
}
