import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Pwa } from "@/components/pwa";
import localFont from "next/font/local";
const fraunces = localFont({
  src: [
    {
      path: "./fonts/fraunces-450-normal.woff2",
      weight: "450",
      style: "normal",
    },
    {
      path: "./fonts/fraunces-450-italic.woff2",
      weight: "450",
      style: "italic",
    },
  ],
  variable: "--font-fraunces",
  display: "swap",
  // Let the hero images load first; serif text remains visible through font swap.
  preload: false,
});
const inter = localFont({
  src: "./fonts/inter-400-700.woff2",
  weight: "400 700",
  variable: "--font-inter",
  display: "swap",
});
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { getPublicSettings } from "@/lib/catalogue";
import { demo, config, phase6Ready } from "@/lib/config";
import { publicPageMetadata } from "@/lib/seo";
const share = phase6Ready
  ? publicPageMetadata({
      title: "Thoughtful gifts, made personal",
      description:
        "Discover customised gifts, bouquets and hampers for your favourite people and moments.",
      path: "/",
      origin: config.APP_ORIGIN,
    })
  : null;
export const metadata: Metadata = {
  ...(share ? { openGraph: share.openGraph, twitter: share.twitter } : {}),
  metadataBase: new URL(config.APP_ORIGIN),
  title: {
    default: "Memocious — Thoughtful gifts, made personal",
    template: "%s | Memocious",
  },
  description:
    "Discover thoughtful customised gifts, bouquets and hampers for your favourite people and moments.",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8E2C48",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await headers();
  const settings = await getPublicSettings();
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Navigation brand={settings.brand} />
        {demo && (
          <div className="demo-notice" role="note">
            Collection preview · Illustrative sample designs &amp; prices ·
            Ordering is not open yet
          </div>
        )}
        <main id="main">{children}</main>
        <Footer />
        <Pwa />
      </body>
    </html>
  );
}
