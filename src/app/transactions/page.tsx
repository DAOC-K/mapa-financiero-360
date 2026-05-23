"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SimplePage from "@/components/SimplePage";
import { createClient } from "@/lib/supabase/client";

type TransactionType = "income" | "expense";

type Space = {
  id: string;
  name: string;
};

type Transaction = {
  id: string;
  space_id: string;
  user_id: string;
  type: TransactionType;
  name: string;
  amount: number;
  category: string;
  date: string;
  is_fixed: boolean;
  visibility: "private" | "shared";
  created_at: string;
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function getTypeLabel(type: TransactionType) {
  return type === "income" ? "Ingreso" : "Gasto";
}

export default function TransactionsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [isFixed, setIsFixed] = useState(false);
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

      const { data: transactionsData, error: transactionsError } =
        await supabase
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false });

      if (transactionsError) {
        setMessage(transactionsError.message);
        setIsLoading(false);
        return;
      }

      setTransactions(transactionsData ?? []);
      setIsLoading(false);
    }

    loadData();
  }, [supabase]);

  const totals = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const expenses = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      income,
      expenses,
      available: income - expenses,
    };
  }, [transactions]);

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

    const numericAmount = Number(amount);

    if (!name.trim() || !category.trim() || numericAmount <= 0) {
      setMessage("Completa todos los campos correctamente.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        space_id: spaceId,
        user_id: userId,
        type,
        name,
        amount: numericAmount,
        category,
        is_fixed: isFixed,
        visibility: "shared",
      })
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setTransactions((current) => [data, ...current]);

    setName("");
    setType("expense");
    setAmount("");
    setCategory("");
    setIsFixed(false);
    setMessage("Movimiento creado correctamente.");
  }

  async function removeTransaction(id: string) {
    setMessage("");

    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setTransactions((current) => current.filter((item) => item.id !== id));
    setMessage("Movimiento eliminado correctamente.");
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
              Los movimientos ahora se guardan en Supabase.
            </p>
          </div>

          <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            Base de datos activa
          </span>
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
              <option value="income">Ingreso</option>
              <option value="expense">Gasto</option>
            </select>
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

          <Field label="Clasificación">
            <select
              value={isFixed ? "fixed" : "variable"}
              onChange={(event) => setIsFixed(event.target.value === "fixed")}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
            >
              <option value="fixed">Fijo</option>
              <option value="variable">Variable</option>
            </select>
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
          {isSaving ? "Guardando..." : "Guardar movimiento"}
        </button>
      </form>

      {isLoading ? (
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-slate-400">Cargando movimientos...</p>
        </section>
      ) : transactions.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Aún no tienes movimientos</h2>
          <p className="mt-2 text-sm text-slate-400">
            Registra tu primer ingreso o gasto para empezar a construir el mapa.
          </p>
        </section>
      ) : (
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
                  <td className="p-4 text-slate-300">{getTypeLabel(item.type)}</td>
                  <td className="p-4 text-slate-300">{item.category}</td>
                  <td className="p-4 text-slate-300">
                    {item.is_fixed ? "Fijo" : "Variable"}
                  </td>
                  <td className="p-4 text-slate-300">
                    {getSpaceName(item.space_id)}
                  </td>
                  <td className="p-4 text-right font-bold">
                    {moneyFormatter.format(Number(item.amount))}
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
      )}
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
