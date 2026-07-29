import type { Metadata } from "next";
import LegalDocument from "@/components/LegalDocument";
import { hi } from "@/lib/i18n";

export const metadata: Metadata = {
  title: hi.Legal.S.privacy.title,
  description: hi.Legal.S.privacy.lede,
  alternates: { canonical: "/privacy" },
  openGraph: { url: "/privacy", title: hi.Legal.S.privacy.title, description: hi.Legal.S.privacy.lede },
};

export default function PrivacyPage() {
  return <LegalDocument which="privacy" />;
}
