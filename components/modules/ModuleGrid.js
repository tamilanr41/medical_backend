"use client";

import ModuleCard from "./ModuleCard";

/** Renders modules grouped by category as a responsive, minimal list. */
export default function ModuleGrid({
  groups,
  favorites,
  onToggleFavorite,
  onOpen,
  activeId,
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section
          key={group.category.id}
          aria-labelledby={`category-${group.category.id}`}
        >
          {groups.length > 1 ? (
            <div className="mb-1.5 flex items-center gap-2">
              <h3
                id={`category-${group.category.id}`}
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500"
              >
                {group.category.label}
              </h3>
              <span className="text-[11px] tabular-nums text-ink-400">
                {group.modules.length}
              </span>
              <span className="h-px flex-1 bg-ink-200" aria-hidden="true" />
            </div>
          ) : null}

          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {group.modules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                isFavorite={favorites.includes(module.id)}
                onToggleFavorite={onToggleFavorite}
                onOpen={onOpen}
                isOpening={activeId === module.id}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}