import type { Metadata } from "next";
import Script from "next/script";

import "./globals.css";

import Navbar from "@/components/Navbar";
import SupportPrompt from "@/components/SupportPrompt";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "The Rhino League",
  description: "Volleyball schedules, scores, standings, photos, and polls.",

  other: {
    "google-adsense-account": "ca-pub-7191954180081880",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />

        {children}

        <SupportPrompt />

        <SpeedInsights />
        <Analytics />
      </body>

      <Script
        id="google-adsense"
        async
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7191954180081880"
      />
    </html>
  );
}