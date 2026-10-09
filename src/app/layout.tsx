import type { Metadata, Viewport } from "next";
import { CustomCursor } from "@/components/CustomCursor";
import { SoundProvider } from "@/components/SoundProvider";
import { SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "BERBERADAM | Erenler/Sakarya Berber & Erkek Kuaförü",
    template: "%s | BERBERADAM",
  },
  description: SITE.description,
  keywords: ["berber", "erkek kuaförü", "Erenler berber", "Sakarya berber", "sakal tıraşı", "saç kesimi", "online randevu", "BERBERADAM"],
  openGraph: {
    title: "BERBERADAM | Stilini ustalara emanet et",
    description: SITE.description,
    type: "website",
    locale: "tr_TR",
    siteName: SITE.name,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#07080a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@400;500;600;700&family=Playfair+Display:ital,wght@1,500;1,600&display=swap"
        />
      </head>
      <body>
        <SoundProvider>
          <CustomCursor />
          {children}
        </SoundProvider>
      </body>
    </html>
  );
}
