"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useCards } from "@/lib/cards-context";
import { useLocale } from "@/lib/locale-context";
import { getCardImageUrl } from "@/lib/cards";
import { CardImg } from "@/components/cards/CardImg";
import { createDonationCheckout } from "@/lib/donations";

/** Mínimo da API (presets já são ≥ este valor) */
const MIN_CENTS = 100;
/** Valor “Outro”: mínimo R$ 5,00 */
const MIN_CUSTOM_CENTS = 500;
const MAX_CENTS = 10_000_000;
const PRESET_CENTS = [500, 1000, 2000] as const;
const MESSAGE_MAX = 500;

/** Ícone de moeda / token dourado (substitui o $ genérico). */
function IconGoldToken() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-amber-300/95"
    >
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.5" opacity="0.95" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.25" opacity="0.55" />
      <path
        d="M12 7.5v9"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}
/** Máx. dígitos no buffer de centavos (100.000,00 BRL) */
const MAX_CUSTOM_DIGITS = String(MAX_CENTS).length;

function centsToReaisLabel(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** Parte numérica da máscara BRL (sem símbolo), ex.: 500 → "5,00" (pt) ou "5.00" (en). */
function formatBrlAmountDigitsOnly(digitStr: string, locale: string): string {
  if (!digitStr) return "";
  const n = Number.parseInt(digitStr, 10);
  if (Number.isNaN(n)) return "";
  const cents = Math.min(n, MAX_CENTS);
  return new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Extrai centavos a partir do texto exibido (só dígitos). Zeros à esquerda viram o valor correto em centavos. */
function digitsFromInputValue(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, MAX_CUSTOM_DIGITS);
  if (!digits) return "";
  const n = Number.parseInt(digits, 10);
  if (Number.isNaN(n) || n === 0) return "";
  if (n > MAX_CENTS) return String(MAX_CENTS);
  return String(n);
}

interface DonateButtonProps {
  className?: string;
}

export function DonateButton({ className = "" }: DonateButtonProps) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const { cards } = useCards();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<number | "custom">(1000);
  /** Apenas dígitos: valor em centavos (ex. "500" = R$ 5,00) */
  const [customDigits, setCustomDigits] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const amountCents = useMemo(() => {
    if (preset === "custom") {
      if (!customDigits) return null;
      const n = Number.parseInt(customDigits, 10);
      if (Number.isNaN(n)) return null;
      return Math.min(n, MAX_CENTS);
    }
    return preset;
  }, [preset, customDigits]);

  const amountValid = useMemo(() => {
    if (amountCents === null) return false;
    if (amountCents > MAX_CENTS || amountCents < MIN_CENTS) return false;
    if (preset === "custom") return amountCents >= MIN_CUSTOM_CENTS;
    return true;
  }, [amountCents, preset]);

  const goldTokenCard = useMemo(() => {
    return cards.find((c) => (c.image_key ?? "").trim().toLowerCase() === "sfd-t03");
  }, [cards]);
  const goldTokenImage = goldTokenCard ? getCardImageUrl(goldTokenCard) : null;

  const resetForm = useCallback(() => {
    setPreset(1000);
    setCustomDigits("");
    setMessage("");
    setEmail("");
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setSubmitting(false);
    resetForm();
  }, [resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountValid || amountCents === null) {
      if (preset === "custom" && amountCents !== null && amountCents < MIN_CUSTOM_CENTS) {
        toast.error(t("donate.errorAmountCustomMin"));
      } else {
        toast.error(t("donate.errorAmount"));
      }
      return;
    }
    const msg = message.trim();
    if (msg.length > MESSAGE_MAX) {
      toast.error(t("donate.errorMessageLength"));
      return;
    }
    const donorEmail = (user?.email?.trim() || email.trim()) || "";
    setSubmitting(true);
    try {
      const data = await createDonationCheckout({
        amountCents,
        ...(donorEmail ? { email: donorEmail } : {}),
        ...(msg ? { message: msg } : {}),
      });
      if (!data.redirectUrl) {
        throw new Error(t("donate.errorNoRedirect"));
      }
      window.location.href = data.redirectUrl;
    } catch (err) {
      setSubmitting(false);
      const msgText = err instanceof Error ? err.message : t("donate.errorGeneric");
      toast.error(msgText);
    }
  };

  const buttonClass = [
    "group inline-flex max-w-[min(100%,16rem)] items-center justify-center gap-2 rounded-full border border-amber-500/25",
    "bg-gradient-to-b from-amber-950/55 via-gray-900/70 to-gray-950/90 px-3 py-1.5 sm:px-3.5",
    "text-left text-[12px] font-medium leading-tight tracking-tight text-amber-50/95",
    "shadow-sm shadow-black/25 ring-1 ring-white/5 transition",
    "hover:border-amber-400/45 hover:from-amber-900/50 hover:text-white hover:ring-amber-500/20",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900",
    "sm:max-w-none sm:text-[13px]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass}>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-400/25 transition group-hover:bg-amber-500/15 group-hover:ring-amber-300/35">
          <IconGoldToken />
        </span>
        <span className="min-w-0 hyphens-auto break-words sm:whitespace-nowrap">{t("nav.donate")}</span>
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain"
            role="dialog"
            aria-modal="true"
            aria-labelledby="donate-modal-title"
          >
            {/* Portal em document.body evita stacking/clip do header; scroll externo evita cortar o topo */}
            <div
              className="flex min-h-full justify-center bg-black/70 px-4 py-6 sm:px-4 sm:py-10"
              onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
              }}
            >
              <div
                className="relative my-auto w-full max-w-4xl max-h-[min(90dvh,calc(100vh-3rem))] overflow-y-auto rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
            <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
              <aside className="md:sticky md:top-0">
                <div className="rounded-xl border border-amber-600/25 bg-gradient-to-b from-amber-950/20 to-gray-900/40 p-3">
                  <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-amber-300/90">
                    Move a Gold Token to my battlefield
                  </p>
                  <div className="mx-auto max-w-[220px]">
                    {goldTokenImage ? (
                      <CardImg
                        src={goldTokenImage}
                        alt="Gold Token"
                        className="aspect-[2.5/3.5] w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="aspect-[2.5/3.5] w-full rounded-lg border border-gray-700 bg-gray-800/70 p-3 text-center text-xs text-gray-400">
                        Gold Token
                      </div>
                    )}
                  </div>
                </div>
              </aside>

              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 pr-2">
                    <h2 id="donate-modal-title" className="text-lg font-semibold text-white">
                      {t("donate.title")}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                      {t("donate.subtitle")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                    aria-label={t("donate.close")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t("donate.amount")}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_CENTS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setPreset(c);
                            setCustomDigits("");
                          }}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            preset === c
                              ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
                              : "border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-800"
                          }`}
                        >
                          {centsToReaisLabel(c, locale)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPreset("custom")}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          preset === "custom"
                            ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
                            : "border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-800"
                        }`}
                      >
                        {t("donate.custom")}
                      </button>
                    </div>
                    {preset === "custom" && (
                      <div className="mt-3">
                        <label htmlFor="donate-custom-amount" className="mb-1 block text-xs text-gray-500">
                          {t("donate.customAmountLabel")}
                        </label>
                        <div className="flex rounded-lg border border-gray-600 bg-gray-800 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/40">
                          <span className="flex shrink-0 items-center border-r border-gray-600 px-3 text-sm font-medium text-gray-400">
                            {t("donate.currencyPrefix")}
                          </span>
                          <input
                            id="donate-custom-amount"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder={t("donate.customPlaceholder")}
                            value={formatBrlAmountDigitsOnly(customDigits, locale)}
                            onChange={(e) => setCustomDigits(digitsFromInputValue(e.target.value))}
                            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{t("donate.amountHint")}</p>
                      </div>
                    )}
                  </div>

                  {!user && (
                    <div>
                      <label htmlFor="donate-email" className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                        {t("donate.email")} <span className="font-normal normal-case text-gray-600">({t("common.optional")})</span>
                      </label>
                      <input
                        id="donate-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                        placeholder={t("donate.emailPlaceholder")}
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="donate-message" className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t("donate.message")} <span className="font-normal normal-case text-gray-600">({t("common.optional")})</span>
                    </label>
                    <textarea
                      id="donate-message"
                      rows={3}
                      maxLength={MESSAGE_MAX}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full resize-y rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                      placeholder={t("donate.messagePlaceholder")}
                    />
                    <p className="mt-1 text-right text-[11px] text-gray-600">
                      {message.length}/{MESSAGE_MAX}
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={submitting}
                      className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                    >
                      {t("donate.cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !amountValid}
                      className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? t("donate.submitting") : t("donate.continue")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
