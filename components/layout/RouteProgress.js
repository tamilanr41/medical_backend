"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin top progress indicator shown while a route transition settles.
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const [settledPath, setSettledPath] = useState(null);
  const active = settledPath !== pathname;

  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setTimeout(() => setSettledPath(pathname), 700);
    return () => window.clearTimeout(timer);
  }, [pathname, active]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 bg-navy-200"
      role="progressbar"
      aria-label="Loading page"
    >
      <div className="anim-progress h-full w-full bg-navy-600" />
    </div>
  );
}
