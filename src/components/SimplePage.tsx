"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

const appName = "Brújula";

const navItems = [
  { href: "/dashboard", label: "Inicio", shortLabel: "Inicio" },
  { href: "/transactions", label: "Movimientos", shortLabel: "Mov." },
  { href: "/payments", label: "Agenda de pagos", shortLabel: "Agenda" },
  { href: "/assistant", label: "Asistente IA", shortLabel: "IA" },
  { href: "/settings", label: "Más", shortLabel: "Más" },
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
  const pathname = usePathname();
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
            {appName}
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
          <SidebarContent
            email={email}
            pathname={pathname}
            onLogout={handleLogout}
          />
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
                <Brand />

                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Cerrar
                </button>
              </div>

              <NavList
                pathname={pathname}
                onNavigate={() => setIsMenuOpen(false)}
              />

              <SessionBox email={email} onLogout={handleLogout} />
            </aside>
          </div>
        )}

        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 lg:p-8">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6 lg:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
                  {appName}
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

      <MobileBottomNav pathname={pathname} />
    </main>
  );
}

function SidebarContent({
  email,
  pathname,
  onLogout,
}: {
  email: string | null;
  pathname: string;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <Brand />

      <div className="mt-8">
        <NavList pathname={pathname} />
      </div>

      <SessionBox email={email} onLogout={onLogout} />
    </div>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="block">
      <p className="text-sm font-black text-emerald-400">{appName}</p>
      <p className="mt-1 text-xs text-slate-500">Nombre provisional</p>
    </Link>
  );
}

function NavList({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
              isActive
                ? "bg-emerald-400 text-slate-950"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileBottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 px-3 py-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between gap-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center rounded-2xl px-2 py-2 text-xs font-semibold transition ${
                isActive
                  ? "bg-emerald-400 text-slate-950"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{item.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
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


