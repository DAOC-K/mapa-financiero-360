"use client";

import { useEffect, useMemo, useState } from "react";
import SimplePage from "@/components/SimplePage";

type Transaction = {
  id: number;
  name: string;
  type: "Ingreso" | "Gasto";
  amount: number;
  category: string;
  fixedType: "Fijo" | "Variable";
  space: "Personal" | "Compartido";
};

type Goal = {
  id: number;
  name: string;
  currentAmount: number;
  targetAmount: number;
  space: "Personal" | "Compartido";
};

type Space = {
  id: number;
  name: string;
  type: "Personal" | "Compartido";
  amount: number;
  description: string;
};

type DecisionItem = {
  id: number;
  name: string;
  amount: number;
  type: "Ahorro" | "Inversión" | "Deuda" | "Meta" | "Libre";
};

type DecisionStorage = {
  availableAmount: number;
  decisionItems: DecisionItem[];
};

const TRANSACTIONS_KEY = "mapa-financiero-transactions";
const GOALS_KEY = "mapa-financiero-goals";
const SPACES_KEY = "mapa-financiero-spaces";
const DECISION_KEY = "mapa-financiero-decision";

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

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

const initialDecision: DecisionStorage = {
  availableAmount: 1300000,
  decisionItems: [
    { id: 1, name: "Fondo de emergencia", amount: 400000, type: "Ahorro" },
    { id: 2, name: "Inversión mensual", amount: 300000, type: "Inversión" },
    { id: 3, name: "Viaje", amount: 300000, type: "Meta" },
    { id: 4, name: "Libre del mes", amount: 300000, type: "Libre" },
  ],
};

export default function DashboardPage() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [goals, setGoals] = useState(initialGoals);
  const [spaces, setSpaces] = useState(initialSpaces);
  const [decision, setDecision] = useState(initialDecision);

  useEffect(() => {
    const storedTransactions = localStorage.getItem(TRANSACTIONS_KEY);
    const storedGoals = localStorage.getItem(GOALS_KEY);
    const storedSpaces = localStorage.getItem(SPACES_KEY);
    const storedDecision = localStorage.getItem(DECISION_KEY);

    if (storedTransactions) {
      setTransactions(JSON.parse(storedTransactions));
    }

    if (storedGoals) {
      setGoals(JSON.parse(storedGoals));
    }

    if (storedSpaces) {
      setSpaces(JSON.parse(storedSpaces));
    }

    if (storedDecision) {
      setDecision(JSON.parse(storedDecision));
    }
  }, []);

  const summary = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "Ingreso")
      .reduce((sum, item) => sum + item.amount, 0);

    const expenses = transactions
      .filter((item) => item.type === "Gasto")
      .reduce((sum, item) => sum + item.amount, 0);

    const fixedExpenses = transactions
      .filter((item) => item.type === "Gasto" && item.fixedType === "Fijo")
      .reduce((sum, item) => sum + item.amount, 0);

    const variableExpenses = transactions
      .filter((item) => item.type === "Gasto" && item.fixedType === "Variable")
      .reduce((sum, item) => sum + item.amount, 0);

    const available = income - expenses;

    const sharedBudget = spaces
      .filter((space) => space.type === "Compartido")
      .reduce((sum, space) => sum + space.amount, 0);

    const distributed = decision.decisionItems.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    const decisionRemaining = decision.availableAmount - distributed;

    const savingLike = decision.decisionItems
      .filter(
        (item) =>
          item.type === "Ahorro" ||
          item.type === "Inversión" ||
          item.type === "Meta",
      )
      .reduce((sum, item) => sum + item.amount, 0);

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
      decisionRemaining,
      healthScore,
      goalsCount: goals.length,
      spacesCount: spaces.length,
    };
  }, [transactions, goals, spaces, decision]);

  const latestTransactions = transactions.slice(0, 5);
  const latestGoals = goals.slice(0, 3);

  return (
    <SimplePage
      title="Dashboard"
      description="Resumen general de tus ingresos, gastos, metas, aportes y decisiones del mes."
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <p className="text-sm font-medium text-slate-400">
              Mapa compartido
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Presupuesto compartido
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Mapas creados</p>
                <p className="mt-2 text-2xl font-bold">
                  {summary.spacesCount}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Total compartido</p>
                <p className="mt-2 text-2xl font-bold">
                  {moneyFormatter.format(summary.sharedBudget)}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-5">
                <p className="text-sm text-emerald-300">Disponible real</p>
                <p className="mt-2 text-2xl font-bold">
                  {moneyFormatter.format(summary.available)}
                </p>
              </div>
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

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <p className="text-sm font-medium text-slate-400">
              Decisión del mes
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Distribución actual
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Distribuido</p>
                <p className="mt-2 text-2xl font-bold">
                  {moneyFormatter.format(summary.distributed)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Falta por asignar</p>
                <p
                  className={`mt-2 text-2xl font-bold ${
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
              {decision.decisionItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl bg-slate-950 p-4"
                >
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.type}</p>
                  </div>

                  <span className="font-bold text-emerald-300">
                    {moneyFormatter.format(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <p className="text-sm font-medium text-slate-400">
              Flujo de gastos
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Fijos vs variables
            </h2>

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

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-2xl font-bold">Últimos movimientos</h2>

            <div className="mt-6 space-y-3">
              {latestTransactions.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl bg-slate-950 p-4"
                >
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.type} · {item.category}
                    </p>
                  </div>

                  <span className="font-bold">
                    {moneyFormatter.format(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-2xl font-bold">Metas destacadas</h2>

            <div className="mt-6 space-y-3">
              {latestGoals.map((goal) => {
                const progress =
                  goal.targetAmount > 0
                    ? Math.min(
                        Math.round(
                          (goal.currentAmount / goal.targetAmount) * 100,
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

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      </div>
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
        className={`mt-2 text-3xl font-black ${
          warning ? "text-red-300" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-500">{detail}</p>
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
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">{title}</span>
        <span className="font-bold text-emerald-300">
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
