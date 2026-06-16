"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import SimplePage from "@/components/SimplePage";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

type MoreItem = {
  title: string;
  description: string;
  href?: string;
  badge?: string;
};

const localStorageKeys = [
  "mapa-financiero-transactions",
  "mapa-financiero-spaces",
  "mapa-financiero-goals",
  "mapa-financiero-decision",
];

const moreItems: MoreItem[] = [
  {
    title: "Espacios financieros",
    description: "Organiza tu dinero por personal, hogar, pareja o negocio.",
    href: "/spaces",
  },
  {
    title: "Metas",
    description: "Revisa tus objetivos de ahorro y progreso.",
    href: "/goals",
  },
  {
    title: "Plan del mes",
    description: "Distribuye dinero entre ahorro, deuda, inversión y metas.",
    href: "/decision",
    badge: "Legacy",
  },
  {
    title: "Categorías",
    description: "Configura categorías para tus movimientos y pagos.",
    badge: "Próximamente",
  },
  {
    title: "Reportes",
    description: "Análisis mensual, comparaciones y evolución financiera.",
    badge: "Próximamente",
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("No se pudo validar la sesión.");
        setIsLoading(false);
        return;
      }

      setEmail(user.email ?? "");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (data) {
        setProfile(data);
        setFullName(data.full_name ?? "");
      }

      setIsLoading(false);
    }

    loadProfile();
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("No se pudo validar la sesión.");
      setIsSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email,
          full_name: fullName,
        },
        { onConflict: "id" },
      )
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setProfile(data);
    setMessage("Perfil actualizado correctamente.");
  }

  function clearLocalData() {
    localStorageKeys.forEach((key) => localStorage.removeItem(key));
    setMessage("Datos locales antiguos eliminados. La app ahora usa Supabase.");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <SimplePage
      title="Más"
      description="Accede a tus espacios financieros, metas, configuración, privacidad y opciones de cuenta."
    >
      {isLoading ? (
        <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-slate-400">Cargando opciones...</p>
        </section>
      ) : (
        <div className="grid gap-6">
          {message && (
            <section className="rounded-3xl border border-white/10 bg-slate-900 p-5">
              <p className="text-sm text-slate-300">{message}</p>
            </section>
          )}

          <section className="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="self-start rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Cuenta
              </p>

              <h2 className="mt-3 text-3xl font-black">
                {fullName.trim() ? fullName : "Tu perfil"}
              </h2>

              <p className="mt-2 text-sm text-slate-300">{email}</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <InfoCard title="Perfil" value={profile ? "Activo" : "Nuevo"} />
                <InfoCard title="Base de datos" value="Supabase" />
                <InfoCard title="Seguridad" value="RLS activo" />
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <h2 className="text-2xl font-bold">Accesos rápidos</h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Aquí dejamos lo que no debe saturar la barra principal.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {moreItems.map((item) => (
                  <MoreCard key={item.title} item={item} />
                ))}
              </div>
            </article>
          </section>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/10 bg-slate-900 p-6"
          >
            <h2 className="text-2xl font-bold">Configuración de perfil</h2>

            <p className="mt-2 text-sm text-slate-400">
              Esta información se guarda en la tabla profiles de Supabase.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Nombre">
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Ej: Dairo Ordoñez"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                />
              </Field>

              <Field label="Correo">
                <input
                  value={email}
                  disabled
                  className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-500 outline-none"
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="mt-6 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : "Guardar perfil"}
            </button>
          </form>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <h2 className="text-xl font-bold">Privacidad</h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Tus datos financieros están protegidos por RLS en Supabase. Cada
                usuario solo puede acceder a los espacios donde es dueño o miembro.
              </p>
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <h2 className="text-xl font-bold">Moneda</h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Por ahora la app trabaja con pesos colombianos. Más adelante se
                puede agregar dólares, TRM y selección de moneda.
              </p>
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6 md:col-span-2">
              <h2 className="text-xl font-bold">Datos locales antiguos</h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Durante el desarrollo usamos localStorage. Ahora la app guarda
                en Supabase, así que puedes limpiar esos datos de prueba del
                navegador.
              </p>

              <button
                type="button"
                onClick={clearLocalData}
                className="mt-5 rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Limpiar datos locales
              </button>
            </article>
          </section>

          <section className="rounded-3xl border border-red-400/20 bg-red-400/5 p-6">
            <h2 className="text-xl font-bold">Sesión</h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Cierra sesión en este dispositivo.
            </p>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-5 rounded-full border border-red-400/30 px-5 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-400/10"
            >
              Cerrar sesión
            </button>
          </section>
        </div>
      )}
    </SimplePage>
  );
}

function MoreCard({ item }: { item: MoreItem }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-white">{item.title}</h3>

        {item.badge && (
          <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
            {item.badge}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {item.description}
      </p>
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="rounded-3xl border border-white/10 bg-slate-950 p-5 transition hover:border-emerald-400/50 hover:bg-white/5"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="rounded-3xl border border-white/10 bg-slate-950 p-5 opacity-70">
      {content}
    </article>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-2xl bg-slate-950/70 p-4">
      <p className="text-xs text-slate-400">{title}</p>
      <p className="mt-2 text-sm font-bold text-emerald-300">{value}</p>
    </article>
  );
}

