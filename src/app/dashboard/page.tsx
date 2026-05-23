"use client";

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

function getDecisionTypeLabel(type: DecisionItem["type"]) {
  const labels: Record<DecisionItem["type"], string> = {
    saving: "Ahorro",
    investment: "Inversión",
    debt: "Deuda",
    goal: "Meta",
    free: "Libre",
  };

  return labels[type];
}

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

    const sharedBudget = spaces
      .filter((space) => space.type === "shared")
      .reduce((sum, space) => sum + Number(space.monthly_budget), 0);

    const distributed = decisionItems.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );

    const availableForDecision = monthlyDecisions.reduce(
      (sum, decision) => sum + Number(decision.available_amount),
      0,
    );

    const decisionRemaining = availableForDecision - distributed;

    const savingLike = decisionItems
      .filter(
        (item) =>
          item.type === "saving" ||
          item.type === "investment" ||
          item.type === "goal",
      )
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const savingRatio = income > 0 ? savingLike / income : 0;
    const expenseRatio = income > 0 ? expenses / income : 0;
    const availableRatio = income > 0 ? available / income : 0;

    const healthScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          50 +
            Math.min(savingRatio, 0.3) * 80 +
            Math.min(availableRatio, 0.3) * 70 -
            Math.max(expenseRatio - 0.7, 0) * 80,
        ),
      ),
    );

    return {
      income,
      expenses,
      fixedExpenses,
      variableExpenses,
      available,
      sharedBudget,
      distributed,
      availableForDecision,
      decisionRemaining,
      healthScore,
      goalsCount: goals.length,
      spacesCount: spaces.length,
    };
  }, [transactions, goals, spaces, monthlyDecisions, decisionItems]);

  const latestTransactions = transactions.slice(0, 5);
  const latestGoals = goals.slice(0, 3);
  const latestDecisionItems = decisionItems.slice(0, 4);

  return (
    <SimplePage
      title="Dashboard"
      description="Resumen general de tus ingresos, gastos, metas, aportes y decisiones del mes."
    >
      {message && (
        <section className="mb-6 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-red-300">{message}</p>
        </section>
      )}

      {isLoading ? (
        <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-slate-400">Cargando dashboard desde Supabase...</p>
        </section>
      ) : (
        <div className="grid gap-6">
          <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <SummaryCard
              title="Ingresos del mes"
              value={moneyFormatter.format(summary.income)}
              detail="Total de ingresos registrados"
            />
            <SummaryCard
              title="Gastos del mes"
              value={moneyFormatter.format(summary.expenses)}
              detail="Total de gastos registrados"
            />
            <SummaryCard
              title="Disponible"
              value={moneyFormatter.format(summary.available)}
              detail="Ingresos menos gastos"
              warning={summary.available < 0}
            />
            <SummaryCard
              title="Metas activas"
              value={String(summary.goalsCount)}
              detail="Metas personales y compartidas"
            />
          </section>

          <section className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <p className="text-sm font-medium text-slate-400">
                Mapas financieros
              </p>

              <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    Presupuesto compartido
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Resumen de mapas creados, aportes compartidos y disponible
                    real del mes.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                <MiniStatCard
                  title="Mapas creados"
                  value={String(summary.spacesCount)}
                  description="Espacios activos"
                />
                <MiniStatCard
                  title="Total compartido"
                  value={moneyFormatter.format(summary.sharedBudget)}
                  description="Presupuesto en mapas compartidos"
                />
                <MiniStatCard
                  title="Disponible real"
                  value={moneyFormatter.format(summary.available)}
                  description="Ingresos menos gastos"
                  highlighted
                />
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <p className="text-sm font-medium text-slate-400">
                Salud financiera
              </p>

              <div className="mt-4 rounded-3xl bg-emerald-400 p-6 text-slate-950">
                <p className="text-sm font-semibold">Puntaje estimado</p>
                <p className="mt-1 text-5xl font-black">
                  {summary.healthScore}/100
                </p>
                <p className="mt-3 text-sm font-medium">
                  Cálculo básico según gastos, ahorro, inversión, metas y dinero
                  disponible.
                </p>
              </div>
            </article>
          </section>

          <section className="grid gap-6 2xl:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <p className="text-sm font-medium text-slate-400">
                Decisión del mes
              </p>
              <h2 className="mt-2 text-2xl font-bold">Distribución actual</h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-950 p-5">
                  <p className="text-sm text-slate-400">Distribuido</p>
                  <p className="mt-2 break-words text-2xl font-bold">
                    {moneyFormatter.format(summary.distributed)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950 p-5">
                  <p className="text-sm text-slate-400">Falta por asignar</p>
                  <p
                    className={`mt-2 break-words text-2xl font-bold ${
                      summary.decisionRemaining < 0
                        ? "text-red-300"
                        : "text-white"
                    }`}
                  >
                    {moneyFormatter.format(summary.decisionRemaining)}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {latestDecisionItems.length === 0 ? (
                  <p className="rounded-2xl bg-slate-950 p-4 text-sm text-slate-400">
                    Aún no tienes decisiones registradas.
                  </p>
                ) : (
                  latestDecisionItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-slate-950 p-4"
                    >
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {getDecisionTypeLabel(item.type)}
                        </p>
                      </div>

                      <span className="text-right font-bold text-emerald-300">
                        {moneyFormatter.format(Number(item.amount))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <p className="text-sm font-medium text-slate-400">
                Flujo de gastos
              </p>
              <h2 className="mt-2 text-2xl font-bold">Fijos vs variables</h2>

              <div className="mt-6 space-y-4">
                <FlowBar
                  title="Gastos fijos"
                  amount={summary.fixedExpenses}
                  total={summary.income}
                />
                <FlowBar
                  title="Gastos variables"
                  amount={summary.variableExpenses}
                  total={summary.income}
                />
                <FlowBar
                  title="Disponible"
                  amount={Math.max(summary.available, 0)}
                  total={summary.income}
                />
              </div>
            </article>
          </section>

          <section className="grid gap-6 2xl:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <h2 className="text-2xl font-bold">Últimos movimientos</h2>

              <div className="mt-6 space-y-3">
                {latestTransactions.length === 0 ? (
                  <p className="rounded-2xl bg-slate-950 p-4 text-sm text-slate-400">
                    Aún no tienes movimientos registrados.
                  </p>
                ) : (
                  latestTransactions.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-slate-950 p-4"
                    >
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.type === "income" ? "Ingreso" : "Gasto"} ·{" "}
                          {item.category}
                        </p>
                      </div>

                      <span className="text-right font-bold">
                        {moneyFormatter.format(Number(item.amount))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <h2 className="text-2xl font-bold">Metas destacadas</h2>

              <div className="mt-6 space-y-3">
                {latestGoals.length === 0 ? (
                  <p className="rounded-2xl bg-slate-950 p-4 text-sm text-slate-400">
                    Aún no tienes metas registradas.
                  </p>
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
                      <div
                        key={goal.id}
                        className="rounded-2xl bg-slate-950 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-semibold">{goal.name}</p>
                          <span className="font-bold text-emerald-300">
                            {progress}%
                          </span>
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

function MiniStatCard({
  title,
  value,
  description,
  highlighted = false,
}: {
  title: string;
  value: string;
  description: string;
  highlighted?: boolean;
}) {
  return (
    <article
      className={`rounded-3xl border p-5 ${
        highlighted
          ? "border-emerald-400/40 bg-emerald-400/10"
          : "border-white/10 bg-slate-950"
      }`}
    >
      <p className={highlighted ? "text-sm text-emerald-300" : "text-sm text-slate-400"}>
        {title}
      </p>

      <p className="mt-3 break-words text-2xl font-black leading-tight text-white">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}

function FlowBar({
  title,
  amount,
  total,
}: {
  title: string;
  amount: number;
  total: number;
}) {
  const percentage =
    total > 0 ? Math.min(Math.round((amount / total) * 100), 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-slate-300">{title}</span>
        <span className="text-right font-bold text-emerald-300">
          {moneyFormatter.format(amount)}
        </span>
      </div>

      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-400"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-1 text-xs text-slate-500">{percentage}% del ingreso</p>
    </div>
  );
}
