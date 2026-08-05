import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VidyaKalaEntry from "@/components/VidyaKalaEntry";
import { pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { allKeys, entry, hiName } from "@/lib/vidyakala";

// One static page per entry — 14 vidyas plus 64 kalas. Nothing here is dynamic, so the whole set is
// generated at build time and the 400KB book file never ships to a browser.
export const dynamicParams = false;

export function generateStaticParams() {
  return allKeys().map((key) => ({ key }));
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const e = entry(key, "hi");
  if (!e) return {};
  // The description is the gloss, not the prose: the prose opens with a Kamasutra lead-in on most
  // entries, which makes a useless search snippet.
  return pageMetadata({
    path: `/vidya-kala/${key}`,
    title: hiName(key),
    description: e.gloss ?? undefined,
    ogType: "article",
  });
}

export default async function VidyaKalaEntryPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const hiEntry = entry(key, "hi");
  const enEntry = entry(key, "en");
  if (!hiEntry || !enEntry) notFound();

  // CreativeWork, not Article: the entry is a description of a discipline, not a piece of reporting,
  // and it has no author or publication date to claim. Only what the page actually shows goes in —
  // the English name is omitted where it is just the Hindi one falling through.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${SITE_URL}/vidya-kala/${key}#entry`,
    url: `${SITE_URL}/vidya-kala/${key}`,
    name: hiEntry.name,
    ...(enEntry.name && enEntry.name !== hiEntry.name ? { alternateName: enEntry.name } : {}),
    ...(hiEntry.gloss ? { description: hiEntry.gloss } : {}),
    inLanguage: ["hi-IN", "en-IN"],
    isPartOf: { "@id": `${SITE_URL}/#website` },
    publisher: { "@id": `${SITE_URL}/#org` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <VidyaKalaEntry entry={hiEntry} entryEn={enEntry} />
    </>
  );
}
