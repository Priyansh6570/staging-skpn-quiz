import type { Metadata } from "next";
import AppProviders from "@/components/AppProviders";
import CompetitionNotice from "@/components/CompetitionNotice";
import { competitionOpen } from "@/lib/competition";
import { en, hi } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Every string here comes out of lib/i18n. A search result is user-facing copy like any other, and
// the Devanagari must be the same bytes the page renders.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${hi.Home_v5.S.heroTitle} · ${hi.SiteHeader.T.orgShort}`,
    template: `%s · ${hi.SiteHeader.T.orgShort}`,
  },
  description: hi.Home_v5.S.heroLede,
  applicationName: hi.SiteHeader.T.orgShort,
  publisher: hi.SiteFooter.T.dept,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: hi.SiteHeader.T.orgShort,
    locale: "hi_IN",
    alternateLocale: "en_IN",
    url: "/",
    title: `${hi.Home_v5.S.heroTitle} · ${hi.SiteHeader.T.orgShort}`,
    description: hi.Home_v5.S.heroLede,
    images: [{ url: "/og.jpg", width: 1200, height: 630, type: "image/jpeg", alt: hi.Home_v5.S.heroTitle }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${hi.Home_v5.S.heroTitle} · ${hi.SiteHeader.T.orgShort}`,
    description: hi.Home_v5.S.heroLede,
    images: ["/og.jpg"],
  },
  robots: { index: true, follow: true },
};

// Both languages are served from one URL by a client toggle, so the graph carries the Hindi name
// with the English as alternateName rather than claiming two documents exist.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "GovernmentOrganization",
      "@id": `${SITE_URL}/#org`,
      name: hi.SiteFooter.T.org,
      alternateName: en.SiteFooter.T.org,
      url: SITE_URL,
      logo: `${SITE_URL}/uploads/skpn-logo.png`,
      email: hi.SiteFooter.markup.text0,
      telephone: hi.SiteFooter.markup.text1,
      parentOrganization: { "@type": "GovernmentOrganization", name: en.SiteFooter.T.dept },
      address: {
        "@type": "PostalAddress",
        streetAddress: en.SiteFooter.T.address,
        addressLocality: "Bhopal",
        addressRegion: "Madhya Pradesh",
        postalCode: "462003",
        addressCountry: "IN",
      },
      sameAs: [
        "https://www.instagram.com/shrikrishnapatheynyas",
        "https://www.facebook.com/shrikrishnapatheynyas",
        "https://twitter.com/krishnapathey",
        "https://www.youtube.com/shrikrishnapatheynyas",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: hi.SiteHeader.T.orgShort,
      alternateName: en.SiteHeader.T.orgShort,
      inLanguage: ["hi-IN", "en-IN"],
      publisher: { "@id": `${SITE_URL}/#org` },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body>
        {/* React hoists these into <head>. A manual <head> element in the root layout stops the
            tree hydrating altogether, which silently makes every page on the site inert. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Anek Devanagari is the professions export's own face and is used by nothing else — the
            home rail and /vyavasaya. Only the four weights that export actually sets are requested;
            its <helmet> also asked for 700, which no element in either file uses. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400;500;600&family=Noto+Sans+Devanagari:wght@400;500;600&family=Anek+Devanagari:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
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
