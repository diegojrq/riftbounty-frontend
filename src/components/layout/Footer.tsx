"use client";

import { useLocale } from "@/lib/locale-context";

export function Footer() {
  const { t } = useLocale();
  return (
    <footer className="border-t border-gray-800 bg-gray-900 px-4 py-6 sm:px-6 lg:px-10 xl:px-12">
      <div className="mx-auto max-w-[1600px] text-center text-xs text-gray-400">
        <p>{t("footer.disclaimer")}</p>
      </div>
    </footer>
  );
}
