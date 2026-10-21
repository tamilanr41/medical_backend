import { HOSPITAL } from "@/config/modules";

const LINKS = [
  { label: "About", href: "#about" },
  { label: "Privacy Policy", href: "#privacy" },
  { label: "Terms of Service", href: "#terms" },
  { label: "Cancellation & Refund", href: "#refund" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-ink-100 bg-panel">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p className="text-[12.5px] text-ink-400">
          <span className="font-semibold text-ink-700">{HOSPITAL.name}</span>
          <span className="mx-1.5 text-ink-300">·</span>
          {HOSPITAL.systemName}
          <span className="mx-1.5 text-ink-300">·</span>
          Version {HOSPITAL.version}
        </p>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[12.5px] font-medium text-ink-500 underline-offset-2 transition hover:text-brand-600 hover:underline"
            >
              {link.label}
            </a>
          ))}
          <span className="text-[12.5px] text-ink-400">
            Support: IT Helpdesk {HOSPITAL.supportExtension} ·{" "}
            <a
              href={`mailto:${HOSPITAL.supportEmail}`}
              className="font-medium text-ink-500 underline-offset-2 transition hover:text-brand-600 hover:underline"
            >
              {HOSPITAL.supportEmail}
            </a>
          </span>
        </nav>
      </div>
    </footer>
  );
}