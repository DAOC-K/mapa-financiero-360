"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type MonthlyDecision = {
  id: string;
  space_id: string;
  created_by: string;
  month: string;
  available_amount: number;
  status: "draft" | "approved";
  created_at: string;
};

type DecisionItem = {
  id: string;
  decision_id: string;
  name: string;
  amount: number;
  type: "saving" | "investment" | "debt" | "goal" | "free";
  created_at: string;
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [monthlyDecisions, setMonthlyDecisions] = useState<MonthlyDecision[]>(
    [],
  );
  const [decisionItems, setDecisionItems] = useState<DecisionItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      setMessage("");

      const { data: spacesData, error: spacesError } = await supabase
        .from("spaces")
        .select("*")
        .order("created_at", { ascending: false });

      if (spacesError) {
        setMessage(spacesError.message);
        setIsLoading(false);
        return;
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

      const { data: goalsData, error: goalsError } = await supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: false });

      if (goalsError) {
        setMessage(goalsError.message);
        setIsLoading(false);
        return;
      }

      const { data: decisionsData, error: decisionsError } = await supabase
        .from("monthly_decisions")
        .select("*")
        .order("created_at", { ascending: false });

      if (decisionsError) {
        setMessage(decisionsError.message);
        setIsLoading(false);
        return;
      }

      const decisionIds = (decisionsData ?? []).map((decision) => decision.id);

      let itemsData: DecisionItem[] = [];

      if (decisionIds.length > 0) {
        const { data, error } = await supabase
          .from("decision_items")
          .select("*")
          .in("decision_id", decisionIds)
          .order("created_at", { ascending: false });

        if (error) {
          setMessage(error.message);
          setIsLoading(false);
          return;
        }

        itemsData = data ?? [];
      }

      setSpaces(spacesData ?? []);
      setTransactions(transactionsData ?? []);
      setGoals(goalsData ?? []);
      setMonthlyDecisions(decisionsData ?? []);
      setDecisionItems(itemsData);
      setIsLoading(false);
    }

    loadDashboard();
  }, [supabase]);

  const summary = useMemo(() => {
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

    const available = income - expenses;

    const goalSavings = goals.reduce(
      (sum, goal) => sum + Number(goal.current_amount),
      0,
    );

    const assignedMoney = decisionItems.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );

    const savingLike = decisionItems
      .filter(
        (item) =>
          item.type === "saving" ||
          item.type === "investment" ||
          item.type === "goal",
      )
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const savingAmount = Math.max(goalSavings, savingLike);

    const estimatedAgendaPending = fixedExpenses;

    const projectedAfterPayments = available - estimatedAgendaPending;

    const expenseRatio = income > 0 ? expenses / income : 0;
    const savingRatio = income > 0 ? savingAmount / income : 0;

    const healthScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          55 +
            Math.min(savingRatio, 0.3) * 90 -
            Math.max(expenseRatio - 0.65, 0) * 90,
        ),
      ),
    );

    return {
      income,
      expenses,
      fixedExpenses,
      variableExpenses,
      available,
      savingAmount,
      assignedMoney,
      estimatedAgendaPending,
      projectedAfterPayments,
      healthScore,
      goalsCount: goals.length,
      spacesCount: spaces.length,
    };
  }, [transactions, goals, decisionItems]);

  const latestTransactions = transactions.slice(0, 5);
  const latestGoals = goals.slice(0, 3);
  const latestSpaces = spaces.slice(0, 3);

  return (
    <SimplePage
      title="Inicio"
      description="Resumen de tu dinero, movimientos, agenda de pagos, metas y recomendaciones para tomar mejores decisiones financieras."
    >
      {message && (
        <section className="mb-6 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-red-300">{message}</p>
        </section>
      )}

      {isLoading ? (
        <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-slate-400">Cargando inicio desde Supabase...</p>
        </section>
      ) : (
        <div className="grid gap-6">
          <section className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Disponible
                </p>

                <h2
                  className={`mt-3 text-5xl font-black md:text-6xl ${
                    summary.available < 0 ? "text-red-300" : "text-white"
                  }`}
                >
                  {moneyFormatter.format(summary.available)}
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Dinero estimado después de tus ingresos y gastos registrados.
                  Cuando conectemos la Agenda de pagos real, este cálculo será
                  todavía más preciso.
                </p>
              </div>

              <Link
                href="/payments"
                className="rounded-full bg-emerald-400 px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Ver agenda de pagos
              </Link>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            <SummaryCard
              title="Ingresos"
              value={moneyFormatter.format(summary.income)}
              detail="Total de ingresos registrados"
              tone="success"
            />

            <SummaryCard
              title="Gastos"
              value={moneyFormatter.format(summary.expenses)}
              detail="Total de gastos registrados"
              tone="danger"
            />

            <SummaryCard
              title="Ahorro / metas"
              value={moneyFormatter.format(summary.savingAmount)}
              detail="Aportes registrados en metas o decisiones"
              tone="info"
            />

            <SummaryCard
              title="Salud financiera"
              value={`${summary.healthScore}/100`}
              detail="Puntaje estimado según gastos y ahorro"
              tone="neutral"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-400">
                    Agenda de pagos
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    Pagos pendientes estimados
                  </h2>
                </div>

                <Link
                  href="/payments"
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Ver todos
                </Link>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                <MiniMetric
                  title="Estimado fijo"
                  value={moneyFormatter.format(summary.estimatedAgendaPending)}
                />
                <MiniMetric
                  title="Después de pagos"
                  value={moneyFormatter.format(summary.projectedAfterPayments)}
                  danger={summary.projectedAfterPayments < 0}
                />
                <MiniMetric
                  title="Espacios"
                  value={String(summary.spacesCount)}
                />
              </div>

              <div className="mt-6 rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-5">
                <p className="text-sm font-semibold text-yellow-200">
                  Pendiente de conectar
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Esta tarjeta por ahora usa los gastos fijos registrados como
                  estimación. En la siguiente fase la conectamos con la tabla
                  real de Agenda de pagos.
                </p>
              </div>
            </article>

            <article className="rounded-3xl border border-violet-400/30 bg-violet-400/10 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
                Recomendación IA
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                Revisa tus gastos variables.
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                Tus gastos variables suman{" "}
                <strong>{moneyFormatter.format(summary.variableExpenses)}</strong>.
                La IA podrá detectar categorías que subieron, gastos hormiga y
                oportunidades reales de ahorro.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/assistant"
                  className="rounded-full bg-violet-400 px-5 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-violet-300"
                >
                  Ver asistente IA
                </Link>

                <Link
                  href="/transactions"
                  className="rounded-full border border-white/10 px-5 py-3 text-center text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Ver movimientos
                </Link>
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <ListCard
              title="Actividad reciente"
              actionHref="/transactions"
              actionLabel="Ver movimientos"
            >
              {latestTransactions.length === 0 ? (
                <EmptyText text="Aún no tienes movimientos registrados." />
              ) : (
                latestTransactions.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl bg-slate-950 p-4"
                  >
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-slate-500">
                        {item.type === "income" ? "Ingreso" : "Gasto"} ·{" "}
                        {item.category}
                      </p>
                    </div>

                    <span
                      className={`font-bold ${
                        item.type === "income"
                          ? "text-emerald-300"
                          : "text-red-300"
                      }`}
                    >
                      {item.type === "income" ? "+" : "-"}
                      {moneyFormatter.format(Number(item.amount))}
                    </span>
                  </div>
                ))
              )}
            </ListCard>

            <ListCard
              title="Metas destacadas"
              actionHref="/goals"
              actionLabel="Ver metas"
            >
              {latestGoals.length === 0 ? (
                <EmptyText text="Aún no tienes metas registradas." />
              ) : (
                latestGoals.map((goal) => {
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
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{goal.name}</p>
                        <span className="font-bold text-emerald-300">
                          {progress}%
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        {moneyFormatter.format(Number(goal.current_amount))} de{" "}
                        {moneyFormatter.format(Number(goal.target_amount))}
                      </p>

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
            </ListCard>
          </section>

          <ListCard
            title="Espacios financieros"
            actionHref="/spaces"
            actionLabel="Ver espacios"
          >
            {latestSpaces.length === 0 ? (
              <EmptyText text="Aún no tienes espacios financieros." />
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {latestSpaces.map((space) => (
                  <Link
                    key={space.id}
                    href={`/spaces/${space.id}`}
                    className="rounded-2xl border border-white/10 bg-slate-950 p-5 transition hover:border-emerald-400/50 hover:bg-white/5"
                  >
                    <p className="text-lg font-bold">{space.name}</p>

                    <p className="mt-2 text-sm text-slate-500">
                      {space.type === "personal" ? "Personal" : "Compartido"}
                    </p>

                    <p className="mt-4 text-2xl font-black">
                      {moneyFormatter.format(Number(space.monthly_budget))}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </ListCard>
        </div>
      )}
    </SimplePage>
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

      <p className={`mt-2 break-words text-2xl font-black leading-tight md:text-3xl ${valueClass}`}>{value}</p>

      <p className="mt-3 text-sm leading-6 text-slate-500">{detail}</p>
    </article>
  );
}

function MiniMetric({
  title,
  value,
  danger = false,
}: {
  title: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-950 p-5">
      <p className="text-sm text-slate-400">{title}</p>

      <p
        className={`mt-2 break-words text-lg font-bold leading-tight ${
          danger ? "text-red-300" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ListCard({
  title,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  actionHref: string;
  actionLabel: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>

        <Link
          href={actionHref}
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          {actionLabel}
        </Link>
      </div>

      <div className="mt-6 space-y-3">{children}</div>
    </article>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <p className="rounded-2xl bg-slate-950 p-4 text-sm text-slate-400">
      {text}
    </p>
  );
}


