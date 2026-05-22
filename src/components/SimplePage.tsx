"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/spaces", label: "Mapas" },
  { href: "/map", label: "Mapa visual" },
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
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setEmail(session.user.email ?? null);
      setIsCheckingSession(false);
    }

    checkSession();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Mapa Financiero 360
          </p>
          <h1 className="mt-4 text-3xl font-black">Verificando sesión...</h1>
          <p className="mt-3 text-sm text-slate-400">
            Estamos validando tu acceso.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6">
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

          <div className="mt-auto rounded-2xl border border-white/10 bg-slate-950 p-4">
            <p className="text-xs text-slate-500">Sesión activa</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-300">
              {email}
            </p>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 w-full rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Cerrar sesión
            </button>
          </div>
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
