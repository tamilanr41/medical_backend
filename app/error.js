"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleAlert, Home, RefreshCw } from "lucide-react";
import StatePanel from "@/components/ui/StatePanel";
import { buttonVariants } from "@/components/ui/Button";
import Logo from "@/components/layout/Logo";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface px-4 py-12">
      <div className="flex items-center gap-2.5">
        <Logo className="h-9 w-9" />
        <span className="text-[15px] font-bold tracking-wide text-navy-900">
          ZHANX <span className="text-navy-500">HMS</span>
        </span>
      </div>

      <StatePanel
        icon={CircleAlert}
        eyebrow="Unexpected error"
        title="Something went wrong."
        description="The module could not be rendered due to an unexpected error. Your session is still active - try again, or return to the module launcher."
        tone="danger"
        className="w-full max-w-xl"
        actions={
          <>
            <button
              type="button"
              onClick={reset}
              className={buttonVariants({ variant: "primary" })}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
            <Link href="/home" className={buttonVariants({ variant: "secondary" })}>
              <Home className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </Link>
          </>
        }
      />
    </main>
  );
}
