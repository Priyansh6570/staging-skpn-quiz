import type { Metadata } from "next";
import AppProviders from "@/components/AppProviders";
import CompetitionNotice from "@/components/CompetitionNotice";
import { competitionOpen } from "@/lib/competition";
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
        {/* Read here, in the one server component every page passes through, so no page has to
            fetch it and no page has to become dynamic to know it. */}
        <AppProviders competitionOpen={competitionOpen()}>
          {children}
          {/* After children so it sits under the toast stack, which AppProviders renders last. */}
          <CompetitionNotice />
        </AppProviders>
      </body>
    </html>
  );
}
