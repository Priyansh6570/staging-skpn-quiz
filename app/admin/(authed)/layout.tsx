import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import Shell from "@/components/admin/Shell";

export const dynamic = "force-dynamic";

export default async function AuthedAdminLayout({ children }: { children: React.ReactNode }) {
  // Re-checked here as well as in every API route. The proxy can only verify a signature.
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <Shell displayName={session.displayName} role={session.role}>{children}</Shell>;
}
