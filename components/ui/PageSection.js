/** Section card with a title, optional icon and children. */
export default function PageSection({ title, subtitle, icon, actions, children, className }) {
  return (
    <section className={"rounded-2xl border border-ink-200/70 bg-panel shadow-[var(--shadow-card)] " + (className ?? "")}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          {icon ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:text-brand-400">
              {icon}
            </span>
          ) : null}
          <div>
            <h3 className="text-[14px] font-semibold text-ink-800">{title}</h3>
            {subtitle ? <p className="text-[11.5px] text-ink-400">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}