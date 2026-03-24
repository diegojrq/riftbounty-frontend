"use client";

import { useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { ContactModal } from "@/components/layout/ContactModal";

const BASE_CLASS =
  "border-t border-gray-800 bg-gray-900 px-4 py-4 sm:px-6 lg:px-10 xl:px-12";

interface SiteFooterBlockProps {
  as: "footer" | "section";
  /** Classes extras (ex.: `mt-auto` no footer global). */
  className?: string;
}

/**
 * Disclaimer Riot + botão de contato. Usado no `<Footer />` global e na home como `<section>`.
 */
export function SiteFooterBlock({ as, className = "" }: SiteFooterBlockProps) {
  const { t } = useLocale();
  const [contactOpen, setContactOpen] = useState(false);
  const Tag = as;

  return (
    <>
      <Tag
        className={[BASE_CLASS, className].filter(Boolean).join(" ")}
        {...(as === "section" ? { role: "contentinfo" } : {})}
      >
        <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <p className="max-w-4xl text-center text-xs text-gray-400 sm:flex-1 sm:text-left">{t("footer.disclaimer")}</p>
          <button
            type="button"
            onClick={() => setContactOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-800/80 px-2.5 py-1.5 text-sm font-medium text-gray-200 transition hover:border-emerald-500/50 hover:bg-gray-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            aria-label={t("footer.contactAria")}
            title={t("footer.contactLabel")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-400"
              aria-hidden
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span className="hidden sm:inline">{t("footer.contactLabel")}</span>
          </button>
        </div>
      </Tag>
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}
