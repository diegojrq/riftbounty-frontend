/** POST /donations/checkout */

export interface DonationCheckoutRequest {
  amountCents: number;
  email?: string;
  message?: string;
}

export interface DonationCheckoutData {
  intentId: string;
  redirectUrl: string;
  provider: string;
}
