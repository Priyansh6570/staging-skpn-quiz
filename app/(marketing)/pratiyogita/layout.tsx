import { hi } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

// Carries the metadata for the client component beside it; adds no markup.
export const metadata = pageMetadata({
  path: "/pratiyogita",
  title: hi.Pratiyogita.S.title,
  description: hi.Pratiyogita.S.lede,
});

export default function PratiyogitaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
