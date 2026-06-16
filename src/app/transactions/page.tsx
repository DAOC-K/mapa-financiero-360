"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import SimplePage from "@/components/SimplePage";
import { createClient } from "@/lib/supabase/client";

type TransactionType = "income" | "expense";
type FilterType = "all" | "income" | "expense";

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

const filters: { id: FilterType; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "income", label: "Ingresos" },
  { id: "expense", label: "Gastos" },
];

function getTypeLabel(type: TransactionType) {
  return type === "income" ? "Ingreso" : "Gasto";
}

export default function TransactionsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [isFixed, setIsFixed] = useState(false);
  const [spaceId, setSpaceId] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
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

    const fixedExpenses = transactions
      .filter((item) => item.type === "expense" && item.is_fixed)
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const variableExpenses = transactions
      .filter((item) => item.type === "expense" && !item.is_fixed)
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      income,
      expenses,
      fixedExpenses,
      variableExpenses,
      available: income - expenses,
      count: transactions.length,
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (activeFilter === "all") {
      return transactions;
    }

    return transactions.filter((item) => item.type === activeFilter);
  }, [transactions, activeFilter]);

  function getSpaceName(id: string) {
    return spaces.find((space) => space.id === id)?.name ?? "Sin espacio";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      setMessage("No hay usuario activo.");
      return;
    }

    if (!spaceId) {
      setMessage("Primero crea un espacio financiero.");
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
    setIsRemoving(id);
    setMessage("");

    const { error } = await supabase.from("transactions").delete().eq("id", id);

    setIsRemoving(null);

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
      description="Registra ingresos y gastos, entiende cómo se mueve tu dinero y mantén tus espacios financieros actualizados."
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <SummaryCard
            title="Ingresos"
            value={moneyFormatter.format(totals.income)}
            detail="Total de entradas registradas"
            tone="success"
          />

          <SummaryCard
            title="Gastos"
            value={moneyFormatter.format(totals.expenses)}
            detail="Total de salidas registradas"
            tone="danger"
          />

          <SummaryCard
            title="Disponible"
            value={moneyFormatter.format(totals.available)}
            detail="Ingresos menos gastos"
            tone={totals.available < 0 ? "danger" : "neutral"}
          />

          <SummaryCard
            title="Movimientos"
            value={String(totals.count)}
            detail="Registros guardados"
            tone="info"
          />
        </section>

        {message && (
          <section className="rounded-3xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-slate-300">{message}</p>
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/10 bg-slate-900 p-6"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Registro manual
                </p>

                <h2 className="mt-3 text-2xl font-bold">Agregar movimiento</h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Más adelante este flujo se conectará con registro rápido e IA.
                </p>
              </div>

              <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                Supabase
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              <Field label="Tipo">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                      type === "expense"
                        ? "border-red-400/50 bg-red-400/10 text-red-200"
                        : "border-white/10 bg-slate-950 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    Gasto
                  </button>

                  <button
                    type="button"
                    onClick={() => setType("income")}
                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                      type === "income"
                        ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                        : "border-white/10 bg-slate-950 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    Ingreso
                  </button>
                </div>
              </Field>

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
                  placeholder="Ej: Hogar, comida, transporte"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                />
              </Field>

              <Field label="Espacio financiero">
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

            <button
              type="submit"
              disabled={isSaving || spaces.length === 0}
              className="mt-6 w-full rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : "Guardar movimiento"}
            </button>
          </form>

          <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Actividad reciente</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Tus últimos ingresos y gastos registrados.
                </p>
              </div>

              <div className="flex rounded-2xl bg-slate-950 p-1">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      activeFilter === filter.id
                        ? "bg-emerald-400 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {isLoading ? (
                <EmptyText text="Cargando movimientos..." />
              ) : filteredTransactions.length === 0 ? (
                <EmptyText text="No hay movimientos para este filtro." />
              ) : (
                filteredTransactions.map((item) => (
                  <TransactionCard
                    key={item.id}
                    transaction={item}
                    spaceName={getSpaceName(item.space_id)}
                    onRemove={() => removeTransaction(item.id)}
                    isRemoving={isRemoving === item.id}
                  />
                ))
              )}
            </div>
          </section>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <InfoBox
            title="Gastos fijos"
            value={moneyFormatter.format(totals.fixedExpenses)}
            description="Se usarán como base para conectar la Agenda de pagos."
          />

          <InfoBox
            title="Gastos variables"
            value={moneyFormatter.format(totals.variableExpenses)}
            description="La IA podrá detectar categorías altas y gastos hormiga."
          />
        </section>
      </div>
    </SimplePage>
  );
}

function TransactionCard({
  transaction,
  spaceName,
  onRemove,
  isRemoving,
}: {
  transaction: Transaction;
  spaceName: string;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const isIncome = transaction.type === "income";

  return (
    <article className="rounded-3xl border border-white/10 bg-slate-950 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{transaction.name}</h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isIncome
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-red-400/10 text-red-300"
              }`}
            >
              {getTypeLabel(transaction.type)}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-400">
            {transaction.category} · {spaceName}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            {transaction.is_fixed ? "Fijo" : "Variable"} ·{" "}
            {transaction.visibility === "shared" ? "Compartido" : "Privado"}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <p
            className={`text-2xl font-black ${
              isIncome ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {isIncome ? "+" : "-"}
            {moneyFormatter.format(Number(transaction.amount))}
          </p>

          <button
            type="button"
            onClick={onRemove}
            disabled={isRemoving}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRemoving ? "Quitando..." : "Quitar"}
          </button>
        </div>
      </div>
    </article>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone: "success" | "danger" | "info" | "neutral";
}) {
  const valueClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "danger"
        ? "text-red-300"
        : tone === "info"
          ? "text-sky-300"
          : "text-white";

  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">{title}</p>
      <p className={`mt-2 break-words text-2xl font-black md:text-3xl ${valueClass}`}>
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-500">{detail}</p>
    </article>
  );
}

function InfoBox({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 break-words text-3xl font-black">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
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

function EmptyText({ text }: { text: string }) {
  return (
    <p className="rounded-2xl bg-slate-950 p-4 text-sm text-slate-400">
      {text}
    </p>
  );
}
