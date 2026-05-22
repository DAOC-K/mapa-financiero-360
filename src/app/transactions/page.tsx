"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SimplePage from "@/components/SimplePage";

type TransactionType = "Ingreso" | "Gasto";
type FixedType = "Fijo" | "Variable";
type SpaceType = "Personal" | "Compartido";

type Transaction = {
  id: number;
  name: string;
  type: TransactionType;
  amount: number;
  category: string;
  fixedType: FixedType;
  space: SpaceType;
};

const STORAGE_KEY = "mapa-financiero-transactions";

const initialTransactions: Transaction[] = [
  {
    id: 1,
    name: "Salario",
    type: "Ingreso",
    amount: 4000000,
    category: "Trabajo",
    fixedType: "Fijo",
    space: "Personal",
  },
  {
    id: 2,
    name: "Arriendo",
    type: "Gasto",
    amount: 1200000,
    category: "Hogar",
    fixedType: "Fijo",
    space: "Compartido",
  },
  {
    id: 3,
    name: "Mercado",
    type: "Gasto",
    amount: 600000,
    category: "Alimentación",
    fixedType: "Variable",
    space: "Compartido",
  },
  {
    id: 4,
    name: "Inversión mensual",
    type: "Gasto",
    amount: 800000,
    category: "Inversión",
    fixedType: "Fijo",
    space: "Personal",
  },
];

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [isLoaded, setIsLoaded] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("Gasto");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [fixedType, setFixedType] = useState<FixedType>("Variable");
  const [space, setSpace] = useState<SpaceType>("Personal");

  useEffect(() => {
    const storedTransactions = localStorage.getItem(STORAGE_KEY);

    if (storedTransactions) {
      setTransactions(JSON.parse(storedTransactions));
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions, isLoaded]);

  const totals = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "Ingreso")
      .reduce((sum, item) => sum + item.amount, 0);

    const expenses = transactions
      .filter((item) => item.type === "Gasto")
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      income,
      expenses,
      available: income - expenses,
    };
  }, [transactions]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!name.trim() || !category.trim() || numericAmount <= 0) {
      return;
    }

    const newTransaction: Transaction = {
      id: Date.now(),
      name,
      type,
      amount: numericAmount,
      category,
      fixedType,
      space,
    };

    setTransactions((current) => [newTransaction, ...current]);

    setName("");
    setAmount("");
    setCategory("");
    setType("Gasto");
    setFixedType("Variable");
    setSpace("Personal");
  }

  function removeTransaction(id: number) {
    setTransactions((current) => current.filter((item) => item.id !== id));
  }

  function resetDemoData() {
    setTransactions(initialTransactions);
  }

  return (
    <SimplePage
      title="Movimientos"
      description="Registra ingresos y gastos manualmente para construir tu mapa financiero."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Ingresos" value={moneyFormatter.format(totals.income)} />
        <SummaryCard title="Gastos" value={moneyFormatter.format(totals.expenses)} />
        <SummaryCard title="Disponible" value={moneyFormatter.format(totals.available)} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Agregar movimiento</h2>
            <p className="mt-2 text-sm text-slate-400">
              Ahora los movimientos quedan guardados en este navegador.
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

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Nombre">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Mercado, salario, transporte"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </Field>

          <Field label="Monto">
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="number"
              min="0"
              placeholder="Ej: 500000"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </Field>

          <Field label="Categoría">
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Ej: Hogar, comida, inversión"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </Field>

          <Field label="Tipo">
            <select
              value={type}
              onChange={(event) => setType(event.target.value as TransactionType)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
            >
              <option>Ingreso</option>
              <option>Gasto</option>
            </select>
          </Field>

          <Field label="Clasificación">
            <select
              value={fixedType}
              onChange={(event) => setFixedType(event.target.value as FixedType)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
            >
              <option>Fijo</option>
              <option>Variable</option>
            </select>
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
        </div>

        <button
          type="submit"
          className="mt-6 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Guardar movimiento
        </button>
      </form>

      <div className="mt-8 overflow-hidden rounded-3xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-4">Nombre</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Categoría</th>
              <th className="p-4">Clasificación</th>
              <th className="p-4">Mapa</th>
              <th className="p-4 text-right">Monto</th>
              <th className="p-4 text-right">Acción</th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((item) => (
              <tr key={item.id} className="border-t border-white/10">
                <td className="p-4 font-semibold">{item.name}</td>
                <td className="p-4 text-slate-300">{item.type}</td>
                <td className="p-4 text-slate-300">{item.category}</td>
                <td className="p-4 text-slate-300">{item.fixedType}</td>
                <td className="p-4 text-slate-300">{item.space}</td>
                <td className="p-4 text-right font-bold">
                  {moneyFormatter.format(item.amount)}
                </td>
                <td className="p-4 text-right">
                  <button
                    type="button"
                    onClick={() => removeTransaction(item.id)}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SimplePage>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
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
