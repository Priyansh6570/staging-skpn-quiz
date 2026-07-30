import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VidyaKalaEntry from "@/components/VidyaKalaEntry";
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
  const description = e.gloss ?? undefined;
  return {
    title: hiName(key),
    description,
    alternates: { canonical: `/vidya-kala/${key}` },
    openGraph: { url: `/vidya-kala/${key}`, title: hiName(key), description },
  };
}

export default async function VidyaKalaEntryPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const hiEntry = entry(key, "hi");
  const enEntry = entry(key, "en");
  if (!hiEntry || !enEntry) notFound();
  return <VidyaKalaEntry entry={hiEntry} entryEn={enEntry} />;
}
