import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";

/**
 * Authenticated application shell.
 * The session is validated server-side; unauthenticated visitors are sent
 * to /login (the proxy performs the same check optimistically).
 */
export default async function AuthenticatedLayout({ children }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
