import type { Metadata } from "next";
import LegalDocument from "@/components/LegalDocument";
import { hi } from "@/lib/i18n";

export const metadata: Metadata = {
  title: hi.Legal.S.terms.title,
  description: hi.Legal.S.terms.lede,
  alternates: { canonical: "/terms" },
  openGraph: { url: "/terms", title: hi.Legal.S.terms.title, description: hi.Legal.S.terms.lede },
};

export default function TermsPage() {
  return <LegalDocument which="terms" />;
}
