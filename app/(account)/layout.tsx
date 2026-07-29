import type { Metadata } from "next";

// The account surface holds a student's own record, so it is noindex regardless of the session gate
// in front of it: a crawler must never hold a URL that resolves to someone's data.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
