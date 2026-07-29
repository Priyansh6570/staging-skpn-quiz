import "./admin.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SKPN Administration",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

// Styling only. The session gate lives in (authed)/layout.tsx so the login screen, which is also
// under /admin, is not redirected to itself.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
