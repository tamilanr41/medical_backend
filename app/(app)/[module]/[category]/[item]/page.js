import { createElement } from "react";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { getSession } from "@/lib/auth";
import { resolveRoute } from "@/lib/menu-utils";
import { canAccessModule } from "@/config/permissions";
import PageContainer from "@/components/ui/PageContainer";
import GenericScreen from "@/components/screens/GenericScreen";
import SmartScreen from "@/components/screens/SmartScreen";
import { getCustomScreen } from "@/components/screens/registry";

export async function generateMetadata({ params }) {
  const { module, category, item } = await params;
  const resolved = resolveRoute([module, category, item]);
  if (!resolved || !resolved.item) return { title: "Screen" };
  return { title: `${resolved.item.title} – ${resolved.module.title}` };
}

export default async function MenuItemPage({ params }) {
  const { module, category, item } = await params;
  const session = await getSession();
  if (!session) return notFound();

  const resolved = resolveRoute([module, category, item]);
  if (!resolved || !resolved.item) return notFound();
  if (!canAccessModule(session.role, resolved.module.id)) return notFound();

  const customScreen = getCustomScreen({
    module: resolved.module,
    category: resolved.category,
    item: resolved.item,
  });

  return (
    <PageContainer
      title={resolved.item.title}
      description={`${resolved.module.title} › ${resolved.category.title}`}
      eyebrow={resolved.category.title}
      icon={<FileText className="h-5 w-5" />}
      favorite={{
        id: `${resolved.module.id}.${resolved.category.slug}.${resolved.item.slug}`,
        path: `/${module}/${category}/${item}`,
        title: resolved.item.title,
        module: resolved.module.title,
      }}
    >
      {customScreen ? (
        createElement(customScreen, {
          user: session.user,
          module: resolved.module,
          item: resolved.item,
        })
      ) : resolved.item.screen.collection ? (
        <SmartScreen module={resolved.module} category={resolved.category} item={resolved.item} />
      ) : (
        <GenericScreen
          module={resolved.module}
          category={resolved.category}
          item={resolved.item}
          user={session.user}
        />
      )}
    </PageContainer>
  );
}
