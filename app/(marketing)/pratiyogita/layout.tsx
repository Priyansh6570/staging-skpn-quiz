import type { Metadata } from "next";
import { hi } from "@/lib/i18n";

// Carries the metadata for the client component beside it; adds no markup.
export const metadata: Metadata = {
  title: hi.Pratiyogita.S.title,
  description: hi.Pratiyogita.S.lede,
  alternates: { canonical: "/pratiyogita" },
  openGraph: { url: "/pratiyogita", title: hi.Pratiyogita.S.title, description: hi.Pratiyogita.S.lede },
};

export default function PratiyogitaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
