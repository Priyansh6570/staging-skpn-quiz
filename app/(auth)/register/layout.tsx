import { hi } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

// Carries the metadata for the client component beside it; adds no markup. Indexable: it is where a
// student searching for the competition should land, so the description carries what such a search
// asks — what the competition is, when it runs, and who may enter. All four fragments are existing
// strings joined with punctuation; none of the copy is authored here.
const description = [
  hi.Home_v5.S.heroLede,
  hi.Home_v5.S.heroDateRange,
  ...hi.Register.S.categories.map((c) => c.who),
].join(" · ");

export const metadata = pageMetadata({
  path: "/register",
  title: hi.Register.S.title,
  description,
  ogTitle: `${hi.Register.S.title} · ${hi.Home_v5.S.heroTitle}`,
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
