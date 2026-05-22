"use client";

import { FormEvent, useEffect, useState } from "react";
import SimplePage from "@/components/SimplePage";

type SpaceType = "Personal" | "Compartido";

type Goal = {
  id: number;
  name: string;
  currentAmount: number;
  targetAmount: number;
  space: SpaceType;
};

const STORAGE_KEY = "mapa-financiero-goals";

const initialGoals: Goal[] = [
  {
    id: 1,
    name: "Fondo de emergencia",
    currentAmount: 1200000,
    targetAmount: 5000000,
    space: "Personal",
  },
  {
    id: 2,
    name: "Viaje",
    currentAmount: 800000,
    targetAmount: 4000000,
    space: "Compartido",
  },
  {
    id: 3,
    name: "Inversión mensual",
    currentAmount: 800000,
    targetAmount: 1000000,
    space: "Personal",
  },
];

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
  const [goals, setGoals] = useState(initialGoals);
  const [isLoaded, setIsLoaded] = useState(false);

  const [name, setName] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [space, setSpace] = useState<SpaceType>("Personal");

  useEffect(() => {
    const storedGoals = localStorage.getItem(STORAGE_KEY);

    if (storedGoals) {
      setGoals(JSON.parse(storedGoals));
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals, isLoaded]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericCurrentAmount = Number(currentAmount);
    const numericTargetAmount = Number(targetAmount);

    if (!name.trim() || numericTargetAmount <= 0 || numericCurrentAmount < 0) {
      return;
    }

    const newGoal: Goal = {
      id: Date.now(),
      name,
      currentAmount: numericCurrentAmount,
      targetAmount: numericTargetAmount,
      space,
    };

    setGoals((current) => [newGoal, ...current]);

    setName("");
    setCurrentAmount("");
    setTargetAmount("");
    setSpace("Personal");
  }

  function removeGoal(id: number) {
    setGoals((current) => current.filter((goal) => goal.id !== id));
  }

  function resetDemoData() {
    setGoals(initialGoals);
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
              Las metas quedan guardadas en este navegador.
            </p>
          </div>

          <button
            type="button"
            onClick={resetDemoData}
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Restaurar datos demo
          </button>
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

          <Field label="Mapa">
            <select
              value={space}
              onChange={(event) => setSpace(event.target.value as SpaceType)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
            >
              <option>Personal</option>
              <option>Compartido</option>
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
        </div>

        <button
          type="submit"
          className="mt-6 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Guardar meta
        </button>
      </form>

      <div className="mt-8 space-y-4">
        {goals.map((goal) => {
          const progress = getProgress(goal.currentAmount, goal.targetAmount);
          const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

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
                      {goal.space}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-400">
                    {moneyFormatter.format(goal.currentAmount)} de{" "}
                    {moneyFormatter.format(goal.targetAmount)}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Falta: {moneyFormatter.format(remaining)}
                  </p>
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
