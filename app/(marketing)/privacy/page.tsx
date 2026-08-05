import LegalDocument from "@/components/LegalDocument";
import { hi } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/privacy",
  title: hi.Legal.S.privacy.title,
  description: hi.Legal.S.privacy.lede,
});

export default function PrivacyPage() {
  return <LegalDocument which="privacy" />;
}
