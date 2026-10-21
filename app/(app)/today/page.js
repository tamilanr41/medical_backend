import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTodayData } from "@/lib/daily";
import TodayView from "@/components/today/TodayView";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export const metadata = {
  title: "Today",
  description: "Role-aware digest of today's hospital activity.",
};

export default async function TodayPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const data = await getTodayData(session.role);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Breadcrumbs className="mb-4" />
      <TodayView user={session.user} data={data} />
    </div>
  );
}