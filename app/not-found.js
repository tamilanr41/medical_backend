import Link from "next/link";
import { Compass, Home } from "lucide-react";
import StatePanel from "@/components/ui/StatePanel";
import { buttonVariants } from "@/components/ui/Button";
import BackButton from "@/components/ui/BackButton";
import Logo from "@/components/layout/Logo";
import { HOSPITAL } from "@/config/modules";

export const metadata = {
  title: "Module not found",
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface px-4 py-12">
      <Link
        href="/home"
        className="flex items-center gap-2.5"
        aria-label={`${HOSPITAL.shortName} home`}
      >
        <Logo className="h-9 w-9" />
        <span className="text-[15px] font-bold tracking-wide text-navy-900">
          ZHANX <span className="text-navy-500">HMS</span>
        </span>
      </Link>

      <StatePanel
        icon={Compass}
        eyebrow="Error 404"
        title="Module not found."
        description="The module you are trying to open does not exist, has been renamed, or is not part of this deployment."
        tone="neutral"
        className="w-full max-w-xl"
        actions={
          <>
            <Link href="/home" className={buttonVariants({ variant: "primary" })}>
              <Home className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </Link>
            <BackButton />
          </>
        }
      />
    </main>
  );
}
