"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SimplePage from "@/components/SimplePage";
import { createClient } from "@/lib/supabase/client";

type SpaceType = "personal" | "shared";

type Space = {
  id: string;
  name: string;
  type: SpaceType;
  monthly_budget: number;
  description: string;
  created_by: string;
  created_at: string;
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function getSpaceTypeLabel(type: SpaceType) {
  return type === "personal" ? "Personal" : "Compartido";
}

export default function SpacesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<SpaceType>("personal");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSpaces() {
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

      setUserId(user.id);

      const { data, error } = await supabase
        .from("spaces")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      setSpaces(data ?? []);
      setIsLoading(false);
    }

    loadSpaces();
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      setMessage("No hay usuario activo.");
      return;
    }

    const numericAmount = Number(amount);

    if (!name.trim() || !description.trim() || numericAmount < 0) {
      setMessage("Completa todos los campos correctamente.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { data, error } = await supabase
      .from("spaces")
      .insert({
        name,
        type,
        monthly_budget: numericAmount,
        description,
        created_by: userId,
      })
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSpaces((current) => [data, ...current]);

    setName("");
    setType("personal");
    setAmount("");
    setDescription("");
    setMessage("Mapa financiero creado correctamente.");
  }

  async function removeSpace(id: string) {
    setMessage("");

    const { error } = await supabase.from("spaces").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSpaces((current) => current.filter((space) => space.id !== id));
    setMessage("Mapa eliminado correctamente.");
  }

  return (
    <SimplePage
      title="Mapas financieros"
      description="Crea espacios personales o compartidos para organizar el flujo de dinero de cada mes."
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/10 bg-slate-900 p-6"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Crear mapa financiero</h2>
            <p className="mt-2 text-sm text-slate-400">
              Los mapas ahora se guardan en Supabase.
            </p>
          </div>

          <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            Base de datos activa
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Nombre del mapa">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Mi mapa personal, hogar, pareja"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </Field>

          <Field label="Tipo de mapa">
            <select
              value={type}
              onChange={(event) => setType(event.target.value as SpaceType)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
            >
              <option value="personal">Personal</option>
              <option value="shared">Compartido</option>
            </select>
          </Field>

          <Field label="Monto inicial o presupuesto">
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="number"
              min="0"
              placeholder="Ej: 2500000"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </Field>

          <Field label="Descripción">
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ej: Mapa para gastos del hogar"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
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
          {isSaving ? "Guardando..." : "Guardar mapa"}
        </button>
      </form>

      {isLoading ? (
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-slate-400">Cargando mapas financieros...</p>
        </section>
      ) : spaces.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Aún no tienes mapas</h2>
          <p className="mt-2 text-sm text-slate-400">
            Crea tu primer mapa personal o compartido para empezar.
          </p>
        </section>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {spaces.map((space) => (
            <article
              key={space.id}
              className="rounded-3xl border border-white/10 bg-slate-900 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{space.name}</h2>
                  <span className="mt-3 inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                    {getSpaceTypeLabel(space.type)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => removeSpace(space.id)}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  Quitar
                </button>
              </div>

              <p className="mt-4 text-3xl font-black">
                {moneyFormatter.format(space.monthly_budget)}
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {space.description}
              </p>
            </article>
          ))}
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
