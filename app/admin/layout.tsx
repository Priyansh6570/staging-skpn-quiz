import "./admin.css";

export const metadata = { title: "SKPN Administration" };

// Styling only. The session gate lives in (authed)/layout.tsx so the login screen, which is also
// under /admin, is not redirected to itself.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
