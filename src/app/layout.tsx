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

const ogImage = "https://pub-679ea585b55d48a78970795a14563299.r2.dev/locations/cabbage-tree-bay/hero.jpg";

export const metadata: Metadata = {
  metadataBase: new URL("https://benmccarthy.com.au"),
  title: {
    default: "Salt Safari — Cabbage Tree Bay",
    template: "%s | Salt Safari",
  },
  description:
    "Thousands of species call Cabbage Tree Bay home. Explore what's in season, ID what you saw, log your swims, and share your discoveries.",
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
    title: "Salt Safari",
    description:
      "Thousands of species call Cabbage Tree Bay home. Explore what's in season, ID what you saw, log your swims, and share your discoveries.",
    url: "/p/salt-safari",
    images: [
      {
        url: ogImage,
        width: 1920,
        height: 1080,
        alt: "Panoramic view over Shelly Beach and Cabbage Tree Bay in Manly, Sydney",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Salt Safari",
    description:
      "Thousands of species call Cabbage Tree Bay home. Explore what's in season, ID what you saw, log your swims, and share your discoveries.",
    images: [ogImage],
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
