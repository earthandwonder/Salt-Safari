import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
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
    <html lang="en" className={`${fraunces.variable} ${outfit.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
