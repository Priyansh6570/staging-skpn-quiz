import type { Metadata } from "next";
import { hi } from "@/lib/i18n";

// noindex: a sign-in form has nothing to offer a search result, and the mobile field is the account
// identifier — keeping the page out of the index keeps it out of scrapers' route lists.
// canonical: null clears the root layout's "/" — a noindex page that also claims the home page as
// its canonical is two contradictory signals, and the second one is a lie.
export const metadata: Metadata = {
  title: hi.Login.S.title,
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
