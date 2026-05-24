"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SimplePage from "@/components/SimplePage";
import { createClient } from "@/lib/supabase/client";

type Space = {
  id: string;
  name: string;
  type: "personal" | "shared";
  monthly_budget: number;
  description: string;
  created_by: string;
  created_at: string;
};

type Transaction = {
  id: string;
  space_id: string;
  user_id: string;
  type: "income" | "expense";
  name: string;
  amount: number;
  category: string;
  date: string;
  is_fixed: boolean;
  visibility: "private" | "shared";
  created_at: string;
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

export default function SpaceDetailPage() {
  const params = useParams<{ id: string }>();
  const spaceId = params.id;
  const supabase = useMemo(() => createClient(), []);

  const [space, setSpace] = useState<Space | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const [transactionName, setTransactionName] = useState("");
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    "expense",
  );
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionCategory, setTransactionCategory] = useState("");
  const [isFixed, setIsFixed] = useState(false);

  const [goalName, setGoalName] = useState("");
  const [goalCurrentAmount, setGoalCurrentAmount] = useState("");
  const [goalTargetAmount, setGoalTargetAmount] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadSpace() {
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
    setUserEmail((user.email ?? "").toLowerCase());

    const { data: spaceData, error: spaceError } = await supabase
      .from("spaces")
      .select("*")
      .eq("id", spaceId)
      .single();

    if (spaceError) {
      setMessage(spaceError.message);
      setIsLoading(false);
      return;
    }

    const { data: transactionsData, error: transactionsError } = await supabase
      .from("transactions")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });

    if (transactionsError) {
      setMessage(transactionsError.message);
      setIsLoading(false);
      return;
    }

    const { data: goalsData, error: goalsError } = await supabase
      .from("goals")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });

    if (goalsError) {
      setMessage(goalsError.message);
      setIsLoading(false);
      return;
    }

    setSpace(spaceData);
    setTransactions(transactionsData ?? []);
    setGoals(goalsData ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadSpace();
  }, [spaceId]);

  const summary = useMemo(() => {
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

  async function handleCreateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      setMessage("No hay usuario activo.");
      return;
    }

    const amount = Number(transactionAmount);

    if (!transactionName.trim() || !transactionCategory.trim() || amount <= 0) {
      setMessage("Completa correctamente el movimiento.");
      return;
    }

    setIsSavingTransaction(true);
    setMessage("");

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        space_id: spaceId,
        user_id: userId,
        type: transactionType,
        name: transactionName,
        amount,
        category: transactionCategory,
        date: new Date().toISOString().slice(0, 10),
        is_fixed: isFixed,
        visibility: "shared",
      })
      .select()
      .single();

    setIsSavingTransaction(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setTransactions((current) => [data, ...current]);
    setTransactionName("");
    setTransactionType("expense");
    setTransactionAmount("");
    setTransactionCategory("");
    setIsFixed(false);
    setMessage("Movimiento agregado al mapa.");
  }

  async function handleCreateGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      setMessage("No hay usuario activo.");
      return;
    }

    const currentAmount = Number(goalCurrentAmount);
    const targetAmount = Number(goalTargetAmount);

    if (!goalName.trim() || targetAmount <= 0 || currentAmount < 0) {
      setMessage("Completa correctamente la meta.");
      return;
    }

    setIsSavingGoal(true);
    setMessage("");

    const { data, error } = await supabase
      .from("goals")
      .insert({
        space_id: spaceId,
        user_id: userId,
        name: goalName,
        current_amount: currentAmount,
        target_amount: targetAmount,
        target_date: goalTargetDate || null,
      })
      .select()
      .single();

    setIsSavingGoal(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setGoals((current) => [data, ...current]);
    setGoalName("");
    setGoalCurrentAmount("");
    setGoalTargetAmount("");
    setGoalTargetDate("");
    setMessage("Meta agregada al mapa.");
  }

  async function sendInvitation() {
    if (!space || !userId) {
      setMessage("No hay mapa o usuario activo.");
      return;
    }

    const email = inviteEmail.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      setMessage("Escribe un correo válido.");
      return;
    }

    if (email === userEmail) {
      setMessage("No puedes invitarte a ti mismo.");
      return;
    }

    setIsInviting(true);
    setMessage("");

    const { error } = await supabase.from("space_invitations").insert({
      space_id: space.id,
      space_name: space.name,
      invited_email: email,
      invited_by: userId,
      status: "pending",
    });

    setIsInviting(false);

    if (error) {
      if (error.message.includes("duplicate key")) {
        setMessage("Esa persona ya tiene una invitación para este mapa.");
        return;
      }

      setMessage(error.message);
      return;
    }

    setInviteEmail("");
    setMessage(`Invitación enviada a ${email}.`);
  }

  const isOwner = space?.created_by === userId;

  return (
    <SimplePage
      title={space?.name ?? "Mapa financiero"}
      description={space?.description ?? "Detalle del mapa financiero."}
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/spaces"
          className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          ← Volver a mapas
        </Link>

        <a
          href="#movimiento"
          className="inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Agregar movimiento
        </a>

        <a
          href="#meta"
          className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          Agregar meta
        </a>

        {space?.type === "shared" && isOwner && (
          <a
            href="#invitar"
            className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Invitar miembro
          </a>
        )}
      </div>

      {message && (
        <section className="mb-6 rounded-3xl border border-white/10 bg-slate-900 p-4">
          <p className="text-sm text-slate-300">{message}</p>
        </section>
      )}

      {isLoading ? (
        <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-slate-400">Cargando mapa financiero...</p>
        </section>
      ) : (
        <div className="grid gap-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Presupuesto"
              value={moneyFormatter.format(Number(space?.monthly_budget ?? 0))}
              detail="Monto base del mapa"
            />
            <SummaryCard
              title="Ingresos"
              value={moneyFormatter.format(summary.income)}
              detail="Ingresos de este mapa"
            />
            <SummaryCard
              title="Gastos"
              value={moneyFormatter.format(summary.expenses)}
              detail="Gastos de este mapa"
            />
            <SummaryCard
              title="Disponible"
              value={moneyFormatter.format(summary.available)}
              detail="Ingresos menos gastos"
              warning={summary.available < 0}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <form
              id="movimiento"
              onSubmit={handleCreateTransaction}
              className="rounded-3xl border border-white/10 bg-slate-900 p-6"
            >
              <h2 className="text-2xl font-bold">Agregar movimiento</h2>
              <p className="mt-2 text-sm text-slate-400">
                Registra ingresos o gastos directamente en este mapa.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <input
                  value={transactionName}
                  onChange={(event) => setTransactionName(event.target.value)}
                  placeholder="Nombre"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                />

                <select
                  value={transactionType}
                  onChange={(event) =>
                    setTransactionType(event.target.value as "income" | "expense")
                  }
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                >
                  <option value="income">Ingreso</option>
                  <option value="expense">Gasto</option>
                </select>

                <input
                  value={transactionAmount}
                  onChange={(event) => setTransactionAmount(event.target.value)}
                  type="number"
                  min="0"
                  placeholder="Monto"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                />

                <input
                  value={transactionCategory}
                  onChange={(event) =>
                    setTransactionCategory(event.target.value)
                  }
                  placeholder="Categoría"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={isFixed}
                  onChange={(event) => setIsFixed(event.target.checked)}
                />
                Es gasto fijo
              </label>

              <button
                disabled={isSavingTransaction}
                className="mt-6 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
              >
                {isSavingTransaction ? "Guardando..." : "Guardar movimiento"}
              </button>
            </form>

            <form
              id="meta"
              onSubmit={handleCreateGoal}
              className="rounded-3xl border border-white/10 bg-slate-900 p-6"
            >
              <h2 className="text-2xl font-bold">Agregar meta</h2>
              <p className="mt-2 text-sm text-slate-400">
                Crea una meta asociada directamente a este mapa.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <input
                  value={goalName}
                  onChange={(event) => setGoalName(event.target.value)}
                  placeholder="Nombre de la meta"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                />

                <input
                  value={goalCurrentAmount}
                  onChange={(event) => setGoalCurrentAmount(event.target.value)}
                  type="number"
                  min="0"
                  placeholder="Monto actual"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                />

                <input
                  value={goalTargetAmount}
                  onChange={(event) => setGoalTargetAmount(event.target.value)}
                  type="number"
                  min="0"
                  placeholder="Meta total"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                />

                <input
                  value={goalTargetDate}
                  onChange={(event) => setGoalTargetDate(event.target.value)}
                  type="date"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <button
                disabled={isSavingGoal}
                className="mt-6 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
              >
                {isSavingGoal ? "Guardando..." : "Guardar meta"}
              </button>
            </form>
          </section>

          {space?.type === "shared" && isOwner && (
            <section
              id="invitar"
              className="rounded-3xl border border-white/10 bg-slate-900 p-6"
            >
              <h2 className="text-2xl font-bold">Invitar miembro</h2>
              <p className="mt-2 text-sm text-slate-400">
                Invita a otra persona para que trabaje contigo en este mapa.
              </p>

              <div className="mt-6 flex flex-col gap-3 md:flex-row">
                <input
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  type="email"
                  placeholder="correo@ejemplo.com"
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                />

                <button
                  type="button"
                  onClick={sendInvitation}
                  disabled={isInviting}
                  className="rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                >
                  {isInviting ? "Enviando..." : "Invitar"}
                </button>
              </div>
            </section>
          )}

          <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <h2 className="text-2xl font-bold">Movimientos recientes</h2>

              <div className="mt-6 space-y-3">
                {transactions.length === 0 ? (
                  <p className="rounded-2xl bg-slate-950 p-4 text-sm text-slate-400">
                    Este mapa todavía no tiene movimientos.
                  </p>
                ) : (
                  transactions.slice(0, 6).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-slate-950 p-4"
                    >
                      <div>
                        <p className="font-semibold">{transaction.name}</p>
                        <p className="text-xs text-slate-500">
                          {transaction.type === "income" ? "Ingreso" : "Gasto"} ·{" "}
                          {transaction.category}
                        </p>
                      </div>

                      <p className="text-right font-bold">
                        {moneyFormatter.format(Number(transaction.amount))}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <h2 className="text-2xl font-bold">Metas del mapa</h2>

              <div className="mt-6 space-y-3">
                {goals.length === 0 ? (
                  <p className="rounded-2xl bg-slate-950 p-4 text-sm text-slate-400">
                    Este mapa todavía no tiene metas.
                  </p>
                ) : (
                  goals.slice(0, 6).map((goal) => {
                    const progress =
                      Number(goal.target_amount) > 0
                        ? Math.min(
                            Math.round(
                              (Number(goal.current_amount) /
                                Number(goal.target_amount)) *
                                100,
                            ),
                            100,
                          )
                        : 0;

                    return (
                      <div key={goal.id} className="rounded-2xl bg-slate-950 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold">{goal.name}</p>
                            <p className="text-xs text-slate-500">
                              {moneyFormatter.format(Number(goal.current_amount))} de{" "}
                              {moneyFormatter.format(Number(goal.target_amount))}
                            </p>
                          </div>

                          <p className="font-bold text-emerald-300">
                            {progress}%
                          </p>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-emerald-400"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </article>
          </section>
        </div>
      )}
    </SimplePage>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  warning = false,
}: {
  title: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">{title}</p>
      <p
        className={`mt-2 break-words text-3xl font-black leading-tight ${
          warning ? "text-red-300" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-500">{detail}</p>
    </article>
  );
}