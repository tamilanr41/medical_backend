import { cn } from "@/lib/utils";

export default function Logo({ className }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("h-9 w-9", className)}
      role="img"
      aria-label="Zhanx Hospital logo"
    >
      <defs>
        <linearGradient id="hms-logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#338eff" />
          <stop offset="100%" stopColor="#155ae1" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#hms-logo-gradient)" />
      <path
        d="M20 10.5v19M10.5 20h19"
        stroke="#ffffff"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <circle cx="29.5" cy="29.5" r="3.4" fill="#ffffff" opacity="0.35" />
    </svg>
  );
}
