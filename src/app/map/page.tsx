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
const DECISION_KEY = "mapa-financiero-decision";

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

const initialDecision: DecisionStorage = {
  availableAmount: 1300000,
  decisionItems: [
    { id: 1, name: "Fondo de emergencia", amount: 400000, type: "Ahorro" },
    { id: 2, name: "Inversión mensual", amount: 300000, type: "Inversión" },
    { id: 3, name: "Viaje", amount: 300000, type: "Meta" },
    { id: 4, name: "Libre del mes", amount: 300000, type: "Libre" },
  ],
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function MapPage() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [decision, setDecision] = useState(initialDecision);

  useEffect(() => {
    const storedTransactions = localStorage.getItem(TRANSACTIONS_KEY);
    const storedDecision = localStorage.getItem(DECISION_KEY);

    if (storedTransactions) {
      setTransactions(JSON.parse(storedTransactions));
    }

    if (storedDecision) {
      setDecision(JSON.parse(storedDecision));
    }
  }, []);

  const flow = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "Ingreso")
      .reduce((sum, item) => sum + item.amount, 0);

    const fixedExpenses = transactions
      .filter((item) => item.type === "Gasto" && item.fixedType === "Fijo")
      .reduce((sum, item) => sum + item.amount, 0);

    const variableExpenses = transactions
      .filter((item) => item.type === "Gasto" && item.fixedType === "Variable")
      .reduce((sum, item) => sum + item.amount, 0);

    const savings = decision.decisionItems
      .filter((item) => item.type === "Ahorro")
      .reduce((sum, item) => sum + item.amount, 0);

    const investments = decision.decisionItems
      .filter((item) => item.type === "Inversión")
      .reduce((sum, item) => sum + item.amount, 0);

    const goals = decision.decisionItems
      .filter((item) => item.type === "Meta")
      .reduce((sum, item) => sum + item.amount, 0);

    const debt = decision.decisionItems
      .filter((item) => item.type === "Deuda")
      .reduce((sum, item) => sum + item.amount, 0);

    const free = decision.decisionItems
      .filter((item) => item.type === "Libre")
      .reduce((sum, item) => sum + item.amount, 0);

    const assigned =
      fixedExpenses +
      variableExpenses +
      savings +
      investments +
      goals +
      debt +
      free;

    const difference = income - assigned;

    return {
      income,
      fixedExpenses,
      variableExpenses,
      savings,
      investments,
      goals,
      debt,
      free,
      assigned,
      difference,
    };
  }, [transactions, decision]);

  const nodes = [
    {
      title: "Gastos fijos",
      amount: flow.fixedExpenses,
      description: "Arriendo, servicios, obligaciones mensuales.",
    },
    {
      title: "Gastos variables",
      amount: flow.variableExpenses,
      description: "Mercado, transporte, comida y otros consumos.",
    },
    {
      title: "Ahorro",
      amount: flow.savings,
      description: "Fondo de emergencia o reserva mensual.",
    },
    {
      title: "Inversión",
      amount: flow.investments,
      description: "Aportes a portafolio, ETFs u otros activos.",
    },
    {
      title: "Metas",
      amount: flow.goals,
      description: "Viaje, computador, casa, moto o metas compartidas.",
    },
    {
      title: "Deudas",
      amount: flow.debt,
      description: "Pagos destinados a reducir obligaciones.",
    },
    {
      title: "Libre",
      amount: flow.free,
      description: "Dinero sin asignar o para uso flexible.",
    },
  ];

  return (
    <SimplePage
      title="Mapa financiero visual"
      description="Visualiza cómo fluye el dinero del mes usando los movimientos y decisiones que tienes guardados."
    >
      <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Ingresos"
            value={moneyFormatter.format(flow.income)}
          />
          <SummaryCard
            title="Asignado"
            value={moneyFormatter.format(flow.assigned)}
          />
          <SummaryCard
            title="Diferencia"
            value={moneyFormatter.format(flow.difference)}
            warning={flow.difference < 0}
          />
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6">
        <div className="flex flex-col items-center">
          <div className="rounded-3xl bg-emerald-400 px-10 py-6 text-center text-slate-950 shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em]">
              Ingresos del mes
            </p>
            <p className="mt-2 text-4xl font-black">
              {moneyFormatter.format(flow.income)}
            </p>
          </div>

          <div className="h-12 w-px bg-white/20" />
          <div className="h-px w-full max-w-5xl bg-white/20" />

          <div className="grid w-full gap-4 pt-8 md:grid-cols-2 xl:grid-cols-3">
            {nodes.map((node) => {
              const percentage =
                flow.income > 0
                  ? Math.min(Math.round((node.amount / flow.income) * 100), 100)
                  : 0;

              return (
                <article
                  key={node.title}
                  className="relative rounded-3xl border border-white/10 bg-slate-950 p-6"
                >
                  <div className="absolute -top-8 left-1/2 h-8 w-px -translate-x-1/2 bg-white/20" />

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">{node.title}</h2>
                      <p className="mt-2 text-3xl font-black">
                        {moneyFormatter.format(node.amount)}
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-bold text-emerald-300">
                      {percentage}%
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    {node.description}
                  </p>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Lectura rápida</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Este mapa ya no es solo una maqueta: ahora toma datos de movimientos
            y de la decisión del mes guardados en el navegador.
          </p>
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Prueba recomendada</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Agrega un gasto en Movimientos o una decisión nueva en Decisión del
            mes y vuelve a esta pantalla para ver cómo cambia el flujo.
          </p>
        </article>
      </section>
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
    <article className="rounded-3xl border border-white/10 bg-slate-950 p-6">
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
