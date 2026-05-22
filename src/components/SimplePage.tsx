import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/spaces", label: "Mapas" },
  { href: "/transactions", label: "Movimientos" },
  { href: "/goals", label: "Metas" },
  { href: "/decision", label: "Decisión del mes" },
  { href: "/settings", label: "Configuración" },
];

type SimplePageProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export default function SimplePage({
  title,
  description,
  children,
}: SimplePageProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <Link href="/" className="text-sm font-bold text-emerald-400">
            Mapa Financiero 360
          </Link>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Módulo
          </p>

          <h1 className="mt-4 text-4xl font-black">{title}</h1>

          <p className="mt-3 max-w-2xl text-slate-300">{description}</p>

          <div className="mt-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
