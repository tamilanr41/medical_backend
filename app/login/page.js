import Link from "next/link";
import {
  Activity,
  Share2,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";
import Logo from "@/components/layout/Logo";
import { HOSPITAL } from "@/config/modules";

export const metadata = {
  title: "Sign in",
  description: "Sign in to the Zhanx Hospital Management System.",
};

const PILLARS = [
  { icon: Users, title: "Patient Care", sub: "Better outcomes" },
  { icon: Share2, title: "Operational Efficiency", sub: "Higher productivity" },
  { icon: ShieldCheck, title: "Data Security", sub: "Complete privacy" },
  { icon: TrendingUp, title: "Growth Ready", sub: "Scalable platform" },
];

const STATS = [
  { value: "500+", label: "Beds" },
  { value: "50+", label: "Departments" },
  { value: "200+", label: "Medical Staff" },
  { value: "24/7", label: "Care & Support" },
];

export default async function LoginPage({ searchParams }) {
  const params = await Promise.resolve(searchParams);
  const from = typeof params?.from === "string" ? params.from : null;

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#050b16] text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bg_img.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 h-full w-full object-cover"
        suppressHydrationWarning
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 15% 0%, rgba(51,182,255,0.10), transparent 60%)," +
            "radial-gradient(ellipse 70% 50% at 85% 100%, rgba(51,182,255,0.08), transparent 60%)," +
            "linear-gradient(100deg, rgba(4,10,20,0.88) 0%, rgba(4,10,20,0.68) 34%, rgba(4,10,20,0.28) 60%, rgba(4,10,20,0.12) 100%)," +
            "linear-gradient(180deg, rgba(3,8,16,0.55) 0%, rgba(3,8,16,0.08) 22%, rgba(3,8,16,0.08) 70%, rgba(3,8,16,0.78) 100%)",
        }}
      />

      {/* Top bar ------------------------------------------------------- */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-7 sm:px-10 lg:px-16">
        <Link href="/login" className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-gradient-to-br from-sky-300 to-sky-600 shadow-[0_0_22px_rgba(51,182,255,0.45)]">
            <Activity className="h-5 w-5 text-[#04121f]" strokeWidth={2.4} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-lg font-bold leading-tight tracking-tight">
              ZhanX <span className="text-sky-300">HospitalOS</span>
            </span>
            <span className="block text-[10px] font-medium tracking-[3px] text-slate-400">
              CLINICAL COMMAND
            </span>
          </span>
        </Link>
        <div className="hidden items-center gap-3.5 text-sm text-slate-300 sm:flex">
          <span>Better Systems</span>
          <span className="h-[3px] w-[3px] rounded-full bg-slate-500" />
          <span>Healthier Tomorrow</span>
        </div>
      </header>

      {/* Main stage ---------------------------------------------------- */}
      <div className="relative z-10 mx-auto grid max-w-[1360px] grid-cols-1 items-center gap-10 px-6 py-12 sm:px-10 lg:grid-cols-[1.25fr_0.85fr] lg:gap-12 lg:px-16 lg:py-16">
        <section>
          <p className="mb-4 text-xs font-semibold tracking-[3px] text-sky-300">
            HOSPITAL MANAGEMENT SYSTEM
          </p>
          <h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            Unified Care.
            <br />
            <span className="bg-gradient-to-r from-sky-300 to-sky-400 bg-clip-text text-transparent">
              Smarter Operations.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-slate-300">
            ZhanX HospitalOS brings every ward, department and record under one
            secure, intelligent platform — built for the pace of real clinical
            work.
          </p>

          <div className="mt-11 flex flex-wrap gap-8">
            {PILLARS.map((item) => (
              <div key={item.title} className="flex max-w-[160px] items-center gap-3">
                <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-sky-300/25 bg-sky-400/[0.07]">
                  <item.icon
                    className="h-[19px] w-[19px] text-sky-300"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </span>
                <span>
                  <span className="block text-sm font-bold leading-tight">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {item.sub}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-9 grid grid-cols-2 divide-y divide-sky-300/20 overflow-hidden rounded-[14px] border border-sky-300/20 bg-white/5 backdrop-blur-xl sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {STATS.map((stat) => (
              <div key={stat.label} className="px-4 py-4">
                <p className="font-mono text-xl font-bold text-sky-300">{stat.value}</p>
                <p className="text-[11px] text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 flex items-center gap-2.5 text-sm text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            System Online
          </div>
        </section>

        <section>
          <LoginForm from={from} />
        </section>
      </div>

      <footer className="relative z-10 px-6 pb-8 text-center text-[12px] leading-relaxed text-slate-500 sm:px-10 lg:px-16" suppressHydrationWarning>
        © {new Date().getFullYear()} {HOSPITAL.name} · {HOSPITAL.systemName}
        <br />
        Authorized personnel only. All access is logged and audited.
      </footer>
    </main>
  );
}
