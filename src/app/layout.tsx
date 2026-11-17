import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const TITLE = "Grounded — A Trust Layer for AI CRM Agents";
const DESCRIPTION =
  "Grounded verifies evidence and enforces deterministic write policies before AI-extracted sales information can change CRM state.";

export const metadata: Metadata = {
  title: { default: TITLE, template: "%s · Grounded" },
  description: DESCRIPTION,
  applicationName: "Grounded",
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", siteName: "Grounded" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`}>
      <body className="min-h-full bg-zinc-50 font-sans text-zinc-900">{children}</body>
    </html>
  );
}
