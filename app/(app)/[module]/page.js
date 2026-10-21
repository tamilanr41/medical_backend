import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Lock, Wrench } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canAccessModule } from "@/config/permissions";
import { resolveRoute } from "@/lib/menu-utils";
import { getModuleBySlug } from "@/lib/module-utils";
import StatePanel from "@/components/ui/StatePanel";
import PageContainer from "@/components/ui/PageContainer";
import { buttonVariants } from "@/components/ui/Button";
import ModuleWorkspace from "@/components/modules/ModuleWorkspace";
import ModuleIndex from "@/components/screens/ModuleIndex";

/**
 * Modern equivalent of a legacy module JSP: resolves the module by route,
 * enforces the session and the role permission server-side, then renders
 * the module workspace (live shell + development placeholder body).
 */
export async function generateMetadata({ params }) {
  const { module: slug } = await params;
  const entry = getModuleBySlug(slug);
  if (!entry) return { title: "Module not found" };
  return {
    title: entry.name,
    description: entry.description,
  };
}

export default async function ModuleRoutePage({ params }) {
  const { module: slug } = await params;

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const entry = getModuleBySlug(slug);
  if (!entry) {
    notFound();
  }

  if (!entry.enabled) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
        <StatePanel
          icon={Wrench}
          eyebrow={`Application ref ${entry.id}`}
          title="This module is currently unavailable."
          description={`${entry.name} has been disabled by the system administrator. Contact the IT helpdesk if you need access restored.`}
          tone="warning"
          actions={
            <Link href="/home" className={buttonVariants({ variant: "primary" })}>
              Back to Home
            </Link>
          }
        />
      </div>
    );
  }

  if (!canAccessModule(session.role, entry.id)) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
        <StatePanel
          icon={Lock}
          eyebrow={`Application ref ${entry.id}`}
          title="You don't have permission to access this module."
          description={`Your role (${session.user.roleLabel}) is not granted access to ${entry.name}. Ask an administrator to update your role permissions in Settings › Roles & Permissions.`}
          tone="danger"
          details={[
            { label: "Module", value: entry.name },
            { label: "Reference ID", value: String(entry.id) },
            { label: "Your role", value: session.user.roleLabel },
          ]}
          actions={
            <>
              <Link href="/home" className={buttonVariants({ variant: "primary" })}>
                Back to Home
              </Link>
              <Link
                href="/settings/permissions"
                className={buttonVariants({ variant: "secondary" })}
              >
                View permissions
              </Link>
            </>
          }
        />
      </div>
    );
  }

  const menuModule = resolveRoute([slug])?.module;
  if (menuModule) {
    const ModuleIcon = entry.icon;
    return (
      <PageContainer
        title={menuModule.title}
        description={menuModule.description}
        eyebrow={`Application ref ${entry.id}`}
        icon={<ModuleIcon className="h-5 w-5" />}
        favorite={null}
      >
        <ModuleIndex module={menuModule} />
      </PageContainer>
    );
  }

  return <ModuleWorkspace module={entry} />;
}
