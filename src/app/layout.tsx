import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import { LocaleProvider } from "@/lib/locale-context";
import { AuthProvider } from "@/lib/auth-context";
import { CardsProvider } from "@/lib/cards-context";
import { BackToTop } from "@/components/layout/BackToTop";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LangSync } from "@/components/layout/LangSync";
import { ChunkErrorRecovery } from "@/components/layout/ChunkErrorRecovery";
import "./globals.css";

export const metadata: Metadata = {
  title: "Riftbounty",
  description: "Card app - collection and browse",
  icons: {
    icon: [
      { url: "/images/riftbounty-ico.png", sizes: "32x32", type: "image/png" },
      { url: "/images/riftbounty-ico.png", sizes: "48x48", type: "image/png" },
      { url: "/images/riftbounty-ico.png", sizes: "96x96", type: "image/png" },
    ],
    apple: "/images/riftbounty-ico.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProd = process.env.NODE_ENV === "production";

  return (
    <html lang="en">
      <body className="antialiased bg-gray-900">
        <ChunkErrorRecovery />
        {isProd && (
          <>
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=G-S4M3QTYY4P"
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-S4M3QTYY4P');`}
            </Script>
          </>
        )}
        <LocaleProvider>
        <LangSync />
        <AuthProvider>
          <CardsProvider>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <BackToTop />
          <Toaster
            theme="dark"
            position="top-right"
            closeButton
            toastOptions={{
              classNames: {
                toast: "!bg-gray-800 !border !text-white",
                success: "!border-emerald-500 !bg-gray-800 !text-emerald-100",
                error: "!border-amber-500 !bg-gray-800 !text-amber-100",
              },
            }}
          />
          </CardsProvider>
        </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
