"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SimplePage from "@/components/SimplePage";
import { createClient } from "@/lib/supabase/client";

type Space = {
  id: string;
  name: string;
};

type Goal = {
  id: string;
  space_id: string;
  user_id: string;
  name: string;
  current_amount: number;
  target_amount: number;
  target_date: string | null;
  created_at: string;
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function getProgress(currentAmount: number, targetAmount: number) {
  if (targetAmount <= 0) return 0;

  return Math.min(Math.round((currentAmount / targetAmount) * 100), 100);
}

export default function GoalsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [spaceId, setSpaceId] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
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

      const { data: spacesData, error: spacesError } = await supabase
        .from("spaces")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (spacesError) {
        setMessage(spacesError.message);
        setIsLoading(false);
        return;
      }

      const availableSpaces = spacesData ?? [];
      setSpaces(availableSpaces);

      if (availableSpaces.length > 0) {
        setSpaceId(availableSpaces[0].id);
      }

      const { data: goalsData, error: goalsError } = await supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: false });

      if (goalsError) {
        setMessage(goalsError.message);
        setIsLoading(false);
        return;
      }

      setGoals(goalsData ?? []);
      setIsLoading(false);
    }

    loadData();
  }, [supabase]);

  function getSpaceName(id: string) {
    return spaces.find((space) => space.id === id)?.name ?? "Sin mapa";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      setMessage("No hay usuario activo.");
      return;
    }

    if (!spaceId) {
      setMessage("Primero crea un mapa financiero.");
      return;
    }

    const numericCurrentAmount = Number(currentAmount);
    const numericTargetAmount = Number(targetAmount);

    if (!name.trim() || numericTargetAmount <= 0 || numericCurrentAmount < 0) {
      setMessage("Completa todos los campos correctamente.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { data, error } = await supabase
      .from("goals")
      .insert({
        space_id: spaceId,
        user_id: userId,
        name,
        current_amount: numericCurrentAmount,
        target_amount: numericTargetAmount,
        target_date: targetDate || null,
      })
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setGoals((current) => [data, ...current]);

    setName("");
    setCurrentAmount("");
    setTargetAmount("");
    setTargetDate("");
    setMessage("Meta creada correctamente.");
  }

  async function removeGoal(id: string) {
    setMessage("");

    const { error } = await supabase.from("goals").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setGoals((current) => current.filter((goal) => goal.id !== id));
    setMessage("Meta eliminada correctamente.");
  }

  return (
    <SimplePage
      title="Metas"
      description="Crea metas personales o compartidas y revisa cuánto falta para cumplirlas."
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/10 bg-slate-900 p-6"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Crear meta financiera</h2>
            <p className="mt-2 text-sm text-slate-400">
              Las metas ahora se guardan en Supabase.
            </p>
          </div>

          <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            Base de datos activa
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Nombre de la meta">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Fondo de emergencia, viaje, computador"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </Field>

          <Field label="Mapa financiero">
            <select
              value={spaceId}
              onChange={(event) => setSpaceId(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
            >
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Monto actual">
            <input
              value={currentAmount}
              onChange={(event) => setCurrentAmount(event.target.value)}
              type="number"
              min="0"
              placeholder="Ej: 500000"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </Field>

          <Field label="Monto objetivo">
            <input
              value={targetAmount}
              onChange={(event) => setTargetAmount(event.target.value)}
              type="number"
              min="1"
              placeholder="Ej: 5000000"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </Field>

          <Field label="Fecha objetivo opcional">
            <input
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              type="date"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
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
          disabled={isSaving || spaces.length === 0}
          className="mt-6 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Guardando..." : "Guardar meta"}
        </button>
      </form>

      {isLoading ? (
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-slate-400">Cargando metas...</p>
        </section>
      ) : goals.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Aún no tienes metas</h2>
          <p className="mt-2 text-sm text-slate-400">
            Crea tu primera meta financiera para empezar a medir el avance.
          </p>
        </section>
      ) : (
        <div className="mt-8 space-y-4">
          {goals.map((goal) => {
            const progress = getProgress(
              Number(goal.current_amount),
              Number(goal.target_amount),
            );

            const remaining = Math.max(
              Number(goal.target_amount) - Number(goal.current_amount),
              0,
            );

            return (
              <article
                key={goal.id}
                className="rounded-3xl border border-white/10 bg-slate-900 p-6"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold">{goal.name}</h2>
                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                        {getSpaceName(goal.space_id)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-400">
                      {moneyFormatter.format(Number(goal.current_amount))} de{" "}
                      {moneyFormatter.format(Number(goal.target_amount))}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Falta: {moneyFormatter.format(remaining)}
                    </p>

                    {goal.target_date && (
                      <p className="mt-1 text-sm text-slate-500">
                        Fecha objetivo: {goal.target_date}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-black text-emerald-300">
                      {progress}%
                    </span>

                    <button
                      type="button"
                      onClick={() => removeGoal(goal.id)}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
                    >
                      Quitar
                    </button>
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </article>
            );
          })}
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
