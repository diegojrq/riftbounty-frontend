import { apiGet } from "./api";
import type { Card } from "@/types/card";

/** GET /v1/cards/:uuid – get a single card by UUID */
export async function getCard(uuid: string): Promise<Card> {
  const res = await apiGet<Card>(`/cards/${encodeURIComponent(uuid)}`);
  return res.data;
}
