import { DonateFailureContent } from "./failure-content";

/**
 * Postback de falha/cancelamento após o checkout (configure `DONATE_CANCEL_URL` ou URL de falha no backend).
 * Ex.: `https://seu-dominio.com/donation-failure`
 */
export default function DonationFailurePage() {
  return <DonateFailureContent />;
}
