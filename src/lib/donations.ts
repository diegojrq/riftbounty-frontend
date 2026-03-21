import { apiPost } from "./api";
import type { DonationCheckoutData, DonationCheckoutRequest } from "@/types/donation";

export async function createDonationCheckout(
  body: DonationCheckoutRequest
): Promise<DonationCheckoutData> {
  const res = await apiPost<DonationCheckoutData>("donations/checkout", body);
  return res.data;
}
