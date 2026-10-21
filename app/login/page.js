import Link from "next/link";
import {
  Activity,
  FlaskConical,
  ShieldCheck,
  Stethoscope,
  Workflow,
} from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";
import Logo from "@/components/layout/Logo";
import { listDemoAccounts } from "@/lib/demo-users";
import { HOSPITAL } from "@/config/modules";

export const metadata = {
  title: "Sign in",
  description: "Sign in to the Zhanx Hospital Management System.",
};

const PILLARS = [
  { icon: Workflow, title: "Unified launcher", sub: "24 modules" },
  { icon: Stethoscope, title: "Clinical first", sub: "OPD · IPD · Labs" },
  { icon: FlaskConical, title: "Diagnostics", sub: "Lab · X-Ray" },
  { icon: ShieldCheck, title: "Role-based", sub: "Secure access" },
];

export default async function LoginPage({ searchParams }) {
  const accounts = listDemoAccounts();
  const params = await Promise.resolve(searchParams);
  const from = typeof params?.from === "string" ? params.from : null;

  return (
    <main className="relative flex h-screen overflow-hidden bg-[#080d18] text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bg_img.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 h-full w-full object-cover"
      />
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-r from-[#080d18]/90 via-[#080d18]/70 to-[#080d18]/40"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(1100px 600px at -10% -10%, rgba(51,142,255,0.28), transparent 60%), radial-gradient(900px 560px at 110% 115%, rgba(21,90,225,0.32), transparent 55%)",
        }}
        aria-hidden="true"
      />

      {/* Branding ------------------------------------------------------ */}
      <section className="relative hidden w-[46%] flex-col justify-between p-10 lg:flex xl:p-12">
        <div className="relative">
          <Link href="/login" className="flex items-center gap-3">
            <Logo className="h-11 w-11" />
            <span className="leading-tight">
              <span className="block text-lg font-extrabold tracking-tight text-white">
                ZHANX{" "}
                <span className="bg-gradient-to-r from-brand-300 to-brand-400 bg-clip-text text-transparent">
                  HMS
                </span>
              </span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-300">
                {HOSPITAL.name}
              </span>
            </span>
          </Link>

          <div className="mt-16 max-w-md">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              Hospital Management System
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight xl:text-5xl">
              Unified care.
              <br />
              <span className="bg-gradient-to-r from-brand-300 to-brand-400 bg-clip-text text-transparent">
                Smarter operations.
              </span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/75">
              {HOSPITAL.name} brings every ward, department and record under one
              secure workspace — clinical, diagnostic, administrative and
              finance modules behind a single sign-in.
            </p>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-6">
            {PILLARS.map((item) => (
              <li key={item.title} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 ring-1 ring-white/10">
                  <item.icon className="h-[18px] w-[18px] text-brand-300" aria-hidden="true" />
                </span>
                <span className="leading-tight">
                  <span className="block text-[13.5px] font-semibold text-white">
                    {item.title}
                  </span>
                  <span className="block text-[12px] text-white/65">{item.sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-[12px] text-white/55">
          <span>
            Version {HOSPITAL.version} · {HOSPITAL.campus}
          </span>
          <span>Support {HOSPITAL.supportExtension}</span>
        </div>
      </section>

      {/* Form ---------------------------------------------------------- */}
      <section className="relative flex flex-1 items-center justify-center overflow-y-auto px-4 py-10 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden">
        <div className="my-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo className="h-10 w-10" />
            <div className="leading-tight">
              <p className="text-[15px] font-bold tracking-wide text-white">
                ZHANX{" "}
                <span className="text-brand-300">HMS</span>
              </p>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/65">
                {HOSPITAL.systemName}
              </p>
            </div>
          </div>

          <LoginForm accounts={accounts} from={from} />

          <p className="mt-8 text-center text-[12px] leading-relaxed text-white/55" suppressHydrationWarning>
            © {new Date().getFullYear()} {HOSPITAL.name} · {HOSPITAL.systemName}
            <br />
            Authorized personnel only. All access is logged and audited.
          </p>
        </div>
      </section>
    </main>
  );
}
