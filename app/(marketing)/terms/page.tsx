import LegalDocument from "@/components/LegalDocument";
import { hi } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/terms",
  title: hi.Legal.S.terms.title,
  description: hi.Legal.S.terms.lede,
});

export default function TermsPage() {
  return <LegalDocument which="terms" />;
}
