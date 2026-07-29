import type { Metadata } from "next";
import RulesContent from "@/components/RulesContent";
import { hi } from "@/lib/i18n";

// The page's own h1 is the full sentence; the tab and the search result get the short kicker, with
// the sentence as the description it belongs in.
export const metadata: Metadata = {
  title: hi.Rules.S.kicker,
  description: hi.Rules.S.title,
  alternates: { canonical: "/rules" },
  openGraph: { url: "/rules", title: hi.Rules.S.kicker, description: hi.Rules.S.title },
};

export default function RulesPage() {
  return <RulesContent />;
}
