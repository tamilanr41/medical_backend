import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { getSession } from "@/lib/auth";
import PreferencesForm from "@/components/profile/PreferencesForm";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { buttonVariants } from "@/components/ui/Button";

export const metadata = {
  title: "Preferences",
};

export default async function PreferencesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Breadcrumbs />

      <header className="anim-fade-up relative overflow-hidden rounded-2xl border border-ink-200 bg-panel shadow-[var(--shadow-card)]">
        <span
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-400 via-brand-600 to-brand-700"
          aria-hidden="true"
        />
        <div className="flex items-center gap-3 p-5 sm:p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_20px_-10px_rgba(29,111,245,0.9)]">
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] dark:text-brand-400 text-brand-600">
              Personalisation
            </p>
            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-ink-900">
              Preferences
            </h1>
            <p className="mt-0.5 text-sm text-ink-500">
              Preferences are stored locally on this device for{" "}
              {session.user.name}.
            </p>
          </div>
        </div>
      </header>

      <PreferencesForm />

      <div className="flex flex-wrap gap-3">
        <Link href="/profile" className={buttonVariants({ variant: "secondary" })}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Profile
        </Link>
        <Link href="/home" className={buttonVariants({ variant: "primary" })}>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
