import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getModulesForRole } from "@/config/permissions";
import ModuleLauncher from "@/components/modules/ModuleLauncher";

export const metadata = {
  title: "Home",
  description: "Zhanx HMS hospital module launcher.",
};

/**
 * Home / module launcher.
 * Permission resolution happens on the server; the client receives a
 * serialisable module payload annotated with access flags.
 */
export default async function HomePage({ searchParams }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const category = typeof params?.category === "string" ? params.category : "all";

  const modules = getModulesForRole(session.role).map((module) => ({
    id: module.id,
    name: module.name,
    shortName: module.shortName,
    slug: module.slug,
    route: module.route,
    description: module.description,
    category: module.category,
    keywords: module.keywords,
    enabled: module.enabled,
    allowed: module.allowed,
  }));

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <ModuleLauncher
        user={session.user}
        modules={modules}
        initialCategory={category}
      />
    </div>
  );
}
