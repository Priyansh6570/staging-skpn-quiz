import type { Metadata } from "next";
import { Suspense } from "react";
import VidyaKalaIndex from "@/components/VidyaKalaIndex";
import { hi } from "@/lib/i18n";
import { kalaIndex, vidyaGroups } from "@/lib/vidyakala";

// Static. lib/vidyakala.ts pulls in the whole 400KB book file, so the read happens here and only the
// index rows — name and gloss, both languages already resolved — cross into the client component.
export const metadata: Metadata = {
  title: `${hi.Home_v5.S.tabVidyas} · ${hi.Home_v5.S.tabKalas}`,
  description: hi.Home_v5.S.sylLede,
  alternates: { canonical: "/vidya-kala" },
  openGraph: { url: "/vidya-kala", title: `${hi.Home_v5.S.tabVidyas} · ${hi.Home_v5.S.tabKalas}`, description: hi.Home_v5.S.sylLede },
};

export default function VidyaKalaPage() {
  // Both languages are resolved at build time because the language toggle is client-side and must
  // not trigger a fetch. Two small arrays cost less than a round trip.
  // Suspense because the client component reads the tab out of the query string.
  return (
    <Suspense fallback={null}>
    <VidyaKalaIndex
      vidyas={vidyaGroups("hi")}
      kalas={kalaIndex("hi")}
      vidyasEn={vidyaGroups("en")}
      kalasEn={kalaIndex("en")}
    />
    </Suspense>
  );
}
