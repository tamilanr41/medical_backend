import { notFound } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { getSession } from "@/lib/auth";
import { resolveRoute } from "@/lib/menu-utils";
import { canAccessModule } from "@/config/permissions";
import PageContainer from "@/components/ui/PageContainer";
import SectionIndex from "@/components/screens/SectionIndex";

export async function generateMetadata({ params }) {
  const { module, category } = await params;
  const resolved = resolveRoute([module, category]);
  if (!resolved || !resolved.category) return { title: "Category" };
  return { title: `${resolved.category.title} – ${resolved.module.title}` };
}

export default async function CategoryPage({ params }) {
  const { module, category } = await params;
  const session = await getSession();
  if (!session) return notFound();

  const resolved = resolveRoute([module, category]);
  if (!resolved || !resolved.category) return notFound();
  if (!canAccessModule(session.role, resolved.module.id)) return notFound();

  return (
    <PageContainer
      title={resolved.category.title}
      description={`${resolved.module.title} • ${resolved.category.items.length} screens`}
      eyebrow={resolved.module.title}
      icon={<FolderOpen className="h-5 w-5" />}
      favorite={null}
    >
      <SectionIndex module={resolved.module} category={resolved.category} />
    </PageContainer>
  );
}
