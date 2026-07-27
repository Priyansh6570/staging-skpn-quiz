import "./admin.css";

export const metadata = { title: "SKPN Admin" };

// The public site's providers wrap this too, but nothing here consumes them: the dashboard has
// its own session, its own CSS scope and no dependency on the student-facing components.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
