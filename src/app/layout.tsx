import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { BackToTop } from "@/components/layout/BackToTop";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Riftbounty",
  description: "Card app - collection and browse",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <BackToTop />
        </AuthProvider>
      </body>
    </html>
  );
}
