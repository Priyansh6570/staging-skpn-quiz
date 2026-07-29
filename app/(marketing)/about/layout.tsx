import type { Metadata } from "next";
import { hi } from "@/lib/i18n";

// app/(marketing)/about/page.tsx is a client component and cannot export metadata itself. This
// layout exists for nothing else — it adds no markup.
// The page's h1 is the org name, which the title template already appends — so the tab and the
// search result take the kicker and read "हमारे बारे में · <org>" rather than the name twice.
export const metadata: Metadata = {
  title: hi.About.S.kicker,
  description: hi.About.S.lede,
  alternates: { canonical: "/about" },
  openGraph: { url: "/about", title: hi.About.S.title, description: hi.About.S.lede },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
