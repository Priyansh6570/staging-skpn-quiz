import type { Metadata } from "next";
import { hi } from "@/lib/i18n";
import { professionCopy } from "@/lib/i18n/professions";

// components/ProfessionsPage.tsx is a client component and cannot export metadata itself. This
// layout exists for nothing else — it adds no markup.
// Both strings are the trust's own, and the description is the section's subtitle rather than the
// headline again. Neither states a priority claim, and neither may be rewritten to.
export const metadata: Metadata = {
  title: professionCopy.hi.headline,
  description: professionCopy.hi.subtitle,
  alternates: { canonical: "/vyavasaya" },
  openGraph: {
    url: "/vyavasaya",
    title: `${professionCopy.hi.headline} · ${hi.SiteHeader.T.orgShort}`,
    description: professionCopy.hi.subtitle,
  },
};

export default function VyavasayaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
