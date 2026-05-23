"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SimplePage from "@/components/SimplePage";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

const localStorageKeys = [
  "mapa-financiero-transactions",
  "mapa-financiero-spaces",
  "mapa-financiero-goals",
  "mapa-financiero-decision",
];

export default function SettingsPage() {
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

  return (
    <SimplePage
      title="Configuración"
      description="Define preferencias del producto, privacidad y comportamiento de los mapas financieros."
    >
      {isLoading ? (
        <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-slate-400">Cargando configuración...</p>
        </section>
      ) : (
        <div className="grid gap-6">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/10 bg-slate-900 p-6"
          >
            <h2 className="text-2xl font-bold">Perfil</h2>

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

            {message && (
              <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950 p-3 text-sm text-slate-300">
                {message}
              </p>
            )}

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
                usuario solo puede acceder a los mapas donde es miembro.
              </p>
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <h2 className="text-xl font-bold">Moneda</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Por ahora la app trabaja con pesos colombianos. Más adelante
                podemos agregar dólares, TRM y selección de moneda.
              </p>
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6 md:col-span-2">
              <h2 className="text-xl font-bold">Datos locales antiguos</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Durante el desarrollo usamos localStorage. Ahora la app guarda en
                Supabase, así que puedes limpiar esos datos de prueba del navegador.
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

          {profile && (
            <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <h2 className="text-xl font-bold">Estado de la cuenta</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <InfoCard title="Perfil" value="Activo" />
                <InfoCard title="Base de datos" value="Supabase" />
                <InfoCard title="Seguridad" value="RLS activo" />
              </div>
            </section>
          )}
        </div>
      )}
    </SimplePage>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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
    <article className="rounded-2xl bg-slate-950 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-xl font-bold text-emerald-300">{value}</p>
    </article>
  );
}
