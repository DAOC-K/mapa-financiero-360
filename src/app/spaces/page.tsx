"use client";

import { FormEvent, useState } from "react";
import SimplePage from "@/components/SimplePage";

type SpaceType = "Personal" | "Compartido";

type Space = {
  id: number;
  name: string;
  type: SpaceType;
  amount: number;
  description: string;
};

const initialSpaces: Space[] = [
  {
    id: 1,
    name: "Mi mapa personal",
    type: "Personal",
    amount: 4000000,
    description: "Ingresos, gastos, metas y dinero disponible individual.",
  },
  {
    id: 2,
    name: "Dairo y pareja",
    type: "Compartido",
    amount: 2500000,
    description: "Aportes del hogar, gastos comunes y decisiones del mes.",
  },
];

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function SpacesPage() {
  const [spaces, setSpaces] = useState(initialSpaces);

  const [name, setName] = useState("");
  const [type, setType] = useState<SpaceType>("Personal");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!name.trim() || !description.trim() || numericAmount < 0) {
      return;
    }

    const newSpace: Space = {
      id: Date.now(),
      name,
      type,
      amount: numericAmount,
      description,
    };

    setSpaces((current) => [newSpace, ...current]);

    setName("");
    setType("Personal");
    setAmount("");
    setDescription("");
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
        <h2 className="text-2xl font-bold">Crear mapa financiero</h2>

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
              <option>Personal</option>
              <option>Compartido</option>
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

        <button
          type="submit"
          className="mt-6 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Guardar mapa
        </button>
      </form>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {spaces.map((space) => (
          <article
            key={space.id}
            className="rounded-3xl border border-white/10 bg-slate-900 p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">{space.name}</h2>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                {space.type}
              </span>
            </div>

            <p className="mt-4 text-3xl font-black">
              {moneyFormatter.format(space.amount)}
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {space.description}
            </p>
          </article>
        ))}
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
