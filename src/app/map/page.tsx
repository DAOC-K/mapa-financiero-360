"use client";

import { useEffect, useMemo, useState } from "react";
import SimplePage from "@/components/SimplePage";
import { createClient } from "@/lib/supabase/client";

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

export default function MapPage() {
  const supabase = useMemo(() => createClient(), []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyDecisions, setMonthlyDecisions] = useState<MonthlyDecision[]>([]);
  const [decisionItems, setDecisionItems] = useState<DecisionItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadMapData() {
      setIsLoading(true);
      setMessage("");

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

      setTransactions(transactionsData ?? []);
      setMonthlyDecisions(decisionsData ?? []);
      setDecisionItems(itemsData);
      setIsLoading(false);
    }

    loadMapData();
  }, [supabase]);

  const flow = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const fixedExpenses = transactions
      .filter((item) => item.type === "expense" && item.is_fixed)
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const variableExpenses = transactions
      .filter((item) => item.type === "expense" && !item.is_fixed)
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const savings = decisionItems
      .filter((item) => item.type === "saving")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const investments = decisionItems
      .filter((item) => item.type === "investment")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const goals = decisionItems
      .filter((item) => item.type === "goal")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const debt = decisionItems
      .filter((item) => item.type === "debt")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const free = decisionItems
      .filter((item) => item.type === "free")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const assigned =
      fixedExpenses +
      variableExpenses +
      savings +
      investments +
      goals +
      debt +
      free;

    const availableForDecision = monthlyDecisions.reduce(
      (sum, decision) => sum + Number(decision.available_amount),
      0,
    );

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
      difference: income - assigned,
      availableForDecision,
    };
  }, [transactions, monthlyDecisions, decisionItems]);

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
      description="Visualiza cómo fluye el dinero del mes usando los movimientos y decisiones guardados en Supabase."
    >
      {message && (
        <section className="mb-6 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-red-300">{message}</p>
        </section>
      )}

      {isLoading ? (
        <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-slate-400">Cargando mapa visual desde Supabase...</p>
        </section>
      ) : (
        <>
          <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCard
                title="Ingresos"
                value={moneyFormatter.format(flow.income)}
              />
              <SummaryCard
                title="Asignado"
                value={moneyFormatter.format(flow.assigned)}
              />
              <SummaryCard
                title="Disponible decisión"
                value={moneyFormatter.format(flow.availableForDecision)}
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
                      ? Math.min(
                          Math.round((node.amount / flow.income) * 100),
                          100,
                        )
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
                Este mapa ya toma información real desde Supabase. Los ingresos
                y gastos vienen de Movimientos, y ahorro, inversión, deuda, metas
                y libre vienen de Decisión del mes.
              </p>
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <h2 className="text-2xl font-bold">Prueba recomendada</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Agrega un gasto fijo, un gasto variable o una decisión nueva y
                vuelve a esta pantalla para confirmar que el mapa cambia.
              </p>
            </article>
          </section>
        </>
      )}
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
