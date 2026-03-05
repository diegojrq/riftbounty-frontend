import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { BackToTop } from "@/components/layout/BackToTop";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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
  return (
    <html lang="en">
      <body className="antialiased bg-gray-900">
        <AuthProvider>
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
        </AuthProvider>
      </body>
    </html>
  );
}
