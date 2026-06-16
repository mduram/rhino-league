import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: "The Rhino League",
  description: "Volleyball schedules, scores, standings, photos, and polls.",
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
        <SpeedInsights />
      </body>
    </html>
  );
}