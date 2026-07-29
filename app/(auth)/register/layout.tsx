import type { Metadata } from "next";
import { hi } from "@/lib/i18n";

// Carries the metadata for the client component beside it; adds no markup. Indexable: it is where a
// student searching for the competition should land once registration is open.
export const metadata: Metadata = {
  title: hi.Register.S.title,
  description: hi.Home_v5.S.heroLede,
  alternates: { canonical: "/register" },
  openGraph: { url: "/register", title: hi.Register.S.title, description: hi.Home_v5.S.heroLede },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
