"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SimplePage from "@/components/SimplePage";

type DecisionType = "Ahorro" | "Inversión" | "Deuda" | "Meta" | "Libre";

type DecisionItem = {
  id: number;
  name: string;
  amount: number;
  type: DecisionType;
};

type DecisionStorage = {
  availableAmount: number;
  decisionItems: DecisionItem[];
};

const STORAGE_KEY = "mapa-financiero-decision";

const initialDecisionItems: DecisionItem[] = [
  { id: 1, name: "Fondo de emergencia", amount: 400000, type: "Ahorro" },
  { id: 2, name: "Inversión mensual", amount: 300000, type: "Inversión" },
  { id: 3, name: "Viaje", amount: 300000, type: "Meta" },
  { id: 4, name: "Libre del mes", amount: 300000, type: "Libre" },
];

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function DecisionPage() {
  const [availableAmount, setAvailableAmount] = useState(1300000);
  const [decisionItems, setDecisionItems] = useState(initialDecisionItems);
  const [isLoaded, setIsLoaded] = useState(false);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<DecisionType>("Ahorro");

  useEffect(() => {
    const storedDecision = localStorage.getItem(STORAGE_KEY);

    if (storedDecision) {
      const parsedDecision = JSON.parse(storedDecision) as DecisionStorage;

      setAvailableAmount(parsedDecision.availableAmount);
      setDecisionItems(parsedDecision.decisionItems);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const decisionStorage: DecisionStorage = {
      availableAmount,
      decisionItems,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(decisionStorage));
  }, [availableAmount, decisionItems, isLoaded]);

  const totals = useMemo(() => {
    const distributed = decisionItems.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    const remaining = availableAmount - distributed;

    const percentage =
      availableAmount > 0
        ? Math.min(Math.round((distributed / availableAmount) * 100), 100)
        : 0;

    return {
      distributed,
      remaining,
      percentage,
    };
  }, [availableAmount, decisionItems]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!name.trim() || numericAmount <= 0) {
      return;
    }

    const newItem: DecisionItem = {
      id: Date.now(),
      name,
      amount: numericAmount,
      type,
    };

    setDecisionItems((current) => [newItem, ...current]);

    setName("");
    setAmount("");
    setType("Ahorro");
  }

  function removeItem(id: number) {
    setDecisionItems((current) => current.filter((item) => item.id !== id));
  }

  function resetDemoData() {
    setAvailableAmount(1300000);
    setDecisionItems(initialDecisionItems);
  }

  return (
    <SimplePage
      title="Decisión del mes"
      description="Distribuye el dinero disponible entre ahorro, inversión, metas, deudas o dinero libre."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Disponible del mes"
          value={moneyFormatter.format(availableAmount)}
        />
        <SummaryCard
          title="Distribuido"
          value={moneyFormatter.format(totals.distributed)}
        />
        <SummaryCard
          title="Falta por asignar"
          value={moneyFormatter.format(totals.remaining)}
          warning={totals.remaining < 0}
        />
      </div>

      <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Disponible para decidir</h2>
            <p className="mt-2 text-sm text-slate-400">
              Cambia el monto disponible y reparte ese dinero según la decisión
              financiera del mes. Esta decisión queda guardada en este navegador.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-72">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-400">
                Monto disponible
              </span>
              <input
                value={availableAmount}
                onChange={(event) =>
                  setAvailableAmount(Number(event.target.value))
                }
                type="number"
                min="0"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
              />
            </label>

            <button
              type="button"
              onClick={resetDemoData}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Restaurar datos demo
            </button>
          </div>
        </div>

        <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all"
            style={{ width: `${totals.percentage}%` }}
          />
        </div>

        <p className="mt-3 text-sm text-slate-400">
          Has asignado el {totals.percentage}% del dinero disponible.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6"
      >
        <h2 className="text-2xl font-bold">Agregar decisión</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Field label="Nombre">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Pagar deuda, ahorro, inversión"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </Field>

          <Field label="Monto">
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="number"
              min="0"
              placeholder="Ej: 300000"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </Field>

          <Field label="Tipo">
            <select
              value={type}
              onChange={(event) => setType(event.target.value as DecisionType)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
            >
              <option>Ahorro</option>
              <option>Inversión</option>
              <option>Deuda</option>
              <option>Meta</option>
              <option>Libre</option>
            </select>
          </Field>
        </div>

        <button
          type="submit"
          className="mt-6 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Guardar decisión
        </button>
      </form>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {decisionItems.map((item) => (
          <article
            key={item.id}
            className="rounded-3xl border border-white/10 bg-slate-900 p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  {item.type}
                </span>

                <h3 className="mt-4 text-xl font-bold">{item.name}</h3>

                <p className="mt-2 text-3xl font-black">
                  {moneyFormatter.format(item.amount)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                Quitar
              </button>
            </div>
          </article>
        ))}
      </div>
    </SimplePage>
  );
}

function SummaryCard({
  title,
  value,
  warning = false,
}: {
  title: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">{title}</p>
      <p
        className={`mt-2 text-3xl font-black ${
          warning ? "text-red-300" : "text-white"
        }`}
      >
        {value}
      </p>
    </article>
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
