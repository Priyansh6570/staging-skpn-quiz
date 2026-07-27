import type { Metadata } from "next";
import AppProviders from "@/components/AppProviders";
import { hi } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: hi.SiteHeader.T.orgShort,
  description: hi.Home_v5.S.heroTitle,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body>
        {/* React hoists these into <head>. A manual <head> element in the root layout stops the
            tree hydrating altogether, which silently makes every page on the site inert. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400;500;600&family=Noto+Sans+Devanagari:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
