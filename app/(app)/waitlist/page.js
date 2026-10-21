import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getWaitlist } from "@/lib/daily";
import WaitlistView from "@/components/waitlist/WaitlistView";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export const metadata = {
  title: "Waitlist",
  description: "Today's out-patient queue.",
};

export default async function WaitlistPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const data = await getWaitlist(session.role);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Breadcrumbs className="mb-4" />
      <WaitlistView user={session.user} data={data} />
    </div>
  );
}