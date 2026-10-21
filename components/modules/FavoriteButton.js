"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FavoriteButton({
  module,
  isFavorite,
  onToggle,
  className,
}) {
  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={
        isFavorite
          ? `Remove ${module.name} from favorites`
          : `Add ${module.name} to favorites`
      }
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle(module);
      }}
      className={cn(
        "rounded-md p-1.5 transition-colors duration-200 hover:bg-ink-100",
        className
      )}
    >
      <Star
        className={cn(
          "h-4 w-4 transition-colors duration-200",
          isFavorite
            ? "fill-amber-400 text-amber-500"
            : "text-ink-300 group-hover:text-ink-500"
        )}
        aria-hidden="true"
      />
    </button>
  );
}
