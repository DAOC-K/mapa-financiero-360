"use client";

"use client";

import { useEffect, useMemo, useState } from "react";
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
  type: "income" | "expense";
  name: string;
  amount: number;
  category: string;
  created_at: string;
};

type Goal = {
  id: string;
  space_id: string;
  name: string;
  current_amount: number;
  target_amount: number;
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
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSpace() {
      setIsLoading(true);
      setMessage("");

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

      const { data: transactionsData, error: transactionsError } =
        await supabase
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

    loadSpace();
  }, [spaceId, supabase]);

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

  return (
    <SimplePage
      title={space?.name ?? "Mapa financiero"}
      description={space?.description ?? "Detalle del mapa financiero."}
    >
      <div className="mb-6">
        <Link
          href="/spaces"
          className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          ← Volver a mapas
        </Link>
      </div>

      {message && (
        <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-red-300">{message}</p>
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