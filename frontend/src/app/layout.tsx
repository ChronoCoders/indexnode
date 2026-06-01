import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "IndexNode — Trustless Blockchain Intelligence",
    template: "%s | IndexNode",
  },
  description:
    "Index blockchain events, prove their existence on-chain, and extract structured data with AI. The only blockchain indexing platform that cryptographically proves what it stores.",
  keywords: [
    "blockchain indexing",
    "on-chain proof",
    "IPFS storage",
    "AI extraction",
    "data marketplace",
    "EVM events",
  ],
  authors: [{ name: "Distributed Systems Labs" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://indexnode.io",
    siteName: "IndexNode",
  },
  twitter: {
    card: "summary_large_image",
    site: "@indexnode",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased bg-gray-950 text-gray-100 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
