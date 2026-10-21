import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import DashboardView from "@/components/dashboard/DashboardView";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export const metadata = {
  title: "Dashboard",
  description: "Live hospital operations snapshot.",
};

/**
 * Dashboard (§ analytics).
 * Aggregation runs on the server against live MongoDB collections; the
 * serialisable payload is handed to the client charting view.
 */
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const data = await getDashboardData(session.role);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Breadcrumbs className="mb-4" />
      <DashboardView user={session.user} data={data} />
    </div>
  );
}
