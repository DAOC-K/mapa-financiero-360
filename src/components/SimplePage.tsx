"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  const supabase = useMemo(() => createClient(), []);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-slate-950/80 p-6 lg:block">
          <SidebarContent email={email} onLogout={handleLogout} />
        </aside>

        {isMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Cerrar menú"
            />

            <aside className="relative z-10 flex h-full w-72 flex-col border-r border-white/10 bg-slate-950 p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <Link
                  href="/"
                  className="text-sm font-bold text-emerald-400"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Mapa Financiero 360
                </Link>

                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Cerrar
                </button>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <SessionBox email={email} onLogout={handleLogout} />
            </aside>
          </div>
        )}

        <section className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6 lg:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
                  Módulo
                </p>

                <h1 className="mt-4 text-4xl font-black md:text-5xl">
                  {title}
                </h1>

                <p className="mt-3 max-w-3xl text-slate-300">
                  {description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
              >
                Menú
              </button>
            </div>

            <div>{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SidebarContent({
  email,
  onLogout,
}: {
  email: string | null;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
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

      <SessionBox email={email} onLogout={onLogout} />
    </div>
  );
}

function SessionBox({
  email,
  onLogout,
}: {
  email: string | null;
  onLogout: () => void;
}) {
  return (
    <div className="mt-auto rounded-2xl border border-white/10 bg-slate-900 p-4">
      <p className="text-xs text-slate-500">Sesión activa</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-300">
        {email}
      </p>

      <button
        type="button"
        onClick={onLogout}
        className="mt-4 w-full rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
