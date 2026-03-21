"use client";

import { useLocale } from "@/lib/locale-context";
import { DonateButton } from "@/components/donations/DonateButton";

export function Footer() {
  const { t } = useLocale();
  return (
    <footer className="border-t border-gray-800 bg-gray-900 px-4 py-6 sm:px-6 lg:px-10 xl:px-12">
      <div className="mx-auto max-w-[1600px] space-y-3 text-center text-xs text-gray-400">
        <p>
          <DonateButton variant="footer" />
        </p>
        <p>{t("footer.disclaimer")}</p>
      </div>
    </footer>
  );
}
