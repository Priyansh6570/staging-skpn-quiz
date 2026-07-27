import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import Dashboard from "@/components/admin/Dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Re-checked here. The proxy gate keeps unauthenticated traffic off the page; it is not the
  // thing enforcing access.
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <Dashboard displayName={session.displayName} />;
}
