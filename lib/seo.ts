import type { Metadata } from "next";
import { hi } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

/**
 * Next merges metadata shallowly: a segment that sets `openGraph` replaces its parent's object
 * whole rather than filling in around it. Every page below the root set only url/title/description
 * and so dropped og:image, og:type, og:locale and og:site_name — which is why no page except "/"
 * ever rendered a social card. Pages build their Open Graph through here so the card cannot go
 * missing by omission again.
 *
 * Both languages are served from one URL by a client toggle, so the tags carry Hindi — the
 * document's own lang — with English declared as the alternate locale, and hreflang points every
 * language at that one URL. Genuinely distinct English titles would need per-language URLs.
 */
const OG_IMAGE = {
  url: "/og.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: hi.Home_v5.S.heroTitle,
};

export function pageMetadata(opts: {
  path: string;
  title: string;
  /** Optional: a handful of entries carry no gloss, and an invented one would be worse than none. */
  description?: string;
  /** Search results append the org via the title template; the card has room for the full name. */
  ogTitle?: string;
  ogType?: "website" | "article";
}): Metadata {
  const { path, title, description, ogTitle = title, ogType = "website" } = opts;
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: { "hi-IN": url, "en-IN": url, "x-default": url },
    },
    openGraph: {
      type: ogType,
      siteName: hi.SiteHeader.T.orgShort,
      locale: "hi_IN",
      alternateLocale: "en_IN",
      url: path,
      title: ogTitle,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: ["/og.jpg"],
    },
  };
}
