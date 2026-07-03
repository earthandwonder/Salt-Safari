import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import { CookieConsent } from "@/components/CookieConsent";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://saltsafari.com.au"),
  title: {
    default: "Salt Safari — Discover Marine Life at Every Dive Spot",
    template: "%s | Salt Safari",
  },
  description:
    "Find out which marine species you can see at snorkelling and diving locations across Australia. Species guides, seasonal alerts, and a free ID tool.",
  keywords: [
    "snorkelling",
    "diving",
    "marine life",
    "species guide",
    "Australia",
    "Sydney",
    "underwater",
  ],
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Salt Safari",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="font-body antialiased pb-20 md:pb-0">
        <AuthProvider>
          {children}
          <BottomNav />
          <CookieConsent />
        </AuthProvider>
      </body>
    </html>
  );
}
