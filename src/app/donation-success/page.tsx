import { DonateSuccessContent } from "@/app/donate/success/success-content";

/**
 * Postback de sucesso após o checkout Pagarme (configure `DONATE_SUCCESS_URL` no backend).
 * Ex.: `https://seu-dominio.com/donation-success`
 */
export default function DonationSuccessPage() {
  return <DonateSuccessContent />;
}
