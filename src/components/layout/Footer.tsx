"use client";

import { usePathname } from "next/navigation";
import { SiteFooterBlock } from "@/components/layout/SiteFooterBlock";

export function Footer() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "") return null;

  return <SiteFooterBlock as="footer" className="mt-auto" />;
}
