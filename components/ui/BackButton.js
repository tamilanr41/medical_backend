"use client";

import { buttonVariants } from "./Button";

/** Client-only "Go back" control (uses history API). */
export default function BackButton({ label = "Go back", className }) {
  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className={buttonVariants({ variant: "secondary", className })}
    >
      {label}
    </button>
  );
}
