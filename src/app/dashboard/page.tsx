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

type PaymentStatus = "pending" | "overdue" | "paid" | "omitted" | "postponed";

type PaymentItem = {
  id: string;
  space_id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  payment_kind: "recurrent" | "temporary" | "single";
  status: PaymentStatus;
  due_date: string | null;
  paid_at: string | null;
  postponed_to: string | null;
  installment_number: number | null;
  installment_total: number | null;
  total_amount: number | null;
  remaining_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type AgendaPaymentItem = PaymentItem & {
  is_projected?: boolean;
  source_payment_id?: string;
  projected_month?: string;
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const monthOptions = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function getEffectivePaymentStatus(payment: PaymentItem): PaymentStatus {
  if (payment.status === "paid" || payment.status === "omitted") {
    return payment.status;
  }

  if (payment.due_date && payment.due_date < todayValue()) {
    return "overdue";
  }

  return payment.status;
}

function getMonthInputValue() {
  return todayValue().slice(0, 7);
}

function getMonthLabel(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);

  if (!year || !month) {
    return "este mes";
  }

  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function isSelectedMonthValue(dateValue: string | null, monthValue: string) {
  if (!dateValue) {
    return false;
  }

  return dateValue.slice(0, 7) === monthValue;
}

function isTransactionInMonth(transaction: Transaction, monthValue: string) {
  return isSelectedMonthValue(transaction.date ?? transaction.created_at, monthValue);
}

function isPaymentAccountedInMonth(
  payment: PaymentItem,
  monthValue: string,
) {
  const effectiveStatus = getEffectivePaymentStatus(payment);

  if (effectiveStatus === "paid") {
    return isSelectedMonthValue(payment.paid_at, monthValue);
  }

  if (effectiveStatus === "omitted") {
    return isSelectedMonthValue(payment.updated_at, monthValue);
  }

  return isSelectedMonthValue(payment.due_date, monthValue);
}

function getRecurrentSeriesKey(payment: PaymentItem) {
  return [
    payment.space_id,
    payment.name.trim().toLowerCase(),
    payment.category.trim().toLowerCase(),
  ].join("|");
}

function getProjectedDueDate(payment: PaymentItem, monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const originalDay = payment.due_date
    ? Number(payment.due_date.slice(8, 10))
    : 1;

  const lastDayOfSelectedMonth = new Date(year, month, 0).getDate();
  const safeDay = Math.min(originalDay || 1, lastDayOfSelectedMonth);

  return `${monthValue}-${String(safeDay).padStart(2, "0")}`;
}

function sortDashboardAgendaPayments(items: AgendaPaymentItem[]) {
  return [...items].sort((a, b) => {
    const statusOrder: Record<PaymentStatus, number> = {
      overdue: 1,
      pending: 2,
      postponed: 3,
      paid: 4,
      omitted: 5,
    };

    const statusDiff =
      statusOrder[getEffectivePaymentStatus(a)] -
      statusOrder[getEffectivePaymentStatus(b)];

    if (statusDiff !== 0) {
      return statusDiff;
    }

    const aDate = a.due_date ?? "9999-12-31";
    const bDate = b.due_date ?? "9999-12-31";

    return aDate.localeCompare(bDate);
  });
}

function buildMonthlyDashboardAgendaPayments(
  payments: PaymentItem[],
  monthValue: string,
): AgendaPaymentItem[] {
  const actualMonthPayments = payments.filter((payment) =>
    isPaymentAccountedInMonth(payment, monthValue),
  );

  const actualRecurrentKeys = new Set(
    actualMonthPayments
      .filter((payment) => payment.payment_kind === "recurrent")
      .map(getRecurrentSeriesKey),
  );

  const recurrentTemplateByKey = new Map<string, PaymentItem>();
  const recurrentFirstMonthByKey = new Map<string, string>();

  for (const payment of payments) {
    if (payment.payment_kind !== "recurrent") {
      continue;
    }

    const key = getRecurrentSeriesKey(payment);
    const paymentMonth =
      payment.due_date?.slice(0, 7) ?? payment.created_at.slice(0, 7);

    const currentFirstMonth = recurrentFirstMonthByKey.get(key);

    if (!currentFirstMonth || paymentMonth < currentFirstMonth) {
      recurrentFirstMonthByKey.set(key, paymentMonth);
    }

    const currentTemplate = recurrentTemplateByKey.get(key);

    if (!currentTemplate) {
      recurrentTemplateByKey.set(key, payment);
      continue;
    }

    const paymentDueDate = payment.due_date ?? "";
    const templateDueDate = currentTemplate.due_date ?? "";

    if (
      payment.updated_at > currentTemplate.updated_at ||
      paymentDueDate > templateDueDate
    ) {
      recurrentTemplateByKey.set(key, payment);
    }
  }

  const projectedPayments: AgendaPaymentItem[] = [];

  for (const [key, template] of recurrentTemplateByKey.entries()) {
    const firstMonth = recurrentFirstMonthByKey.get(key);

    if (actualRecurrentKeys.has(key)) {
      continue;
    }

    if (firstMonth && monthValue < firstMonth) {
      continue;
    }

    projectedPayments.push({
      ...template,
      id: `projected-${key}-${monthValue}`,
      status: "pending",
      due_date: getProjectedDueDate(template, monthValue),
      paid_at: null,
      postponed_to: null,
      created_at: `${monthValue}-01T00:00:00.000Z`,
      updated_at: template.updated_at,
      is_projected: true,
      source_payment_id: template.id,
      projected_month: monthValue,
    });
  }

  return sortDashboardAgendaPayments([
    ...actualMonthPayments,
    ...projectedPayments,
  ]);
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
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  const [selectedMonth, setSelectedMonth] = useState(getMonthInputValue());
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

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payment_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (paymentsError) {
        setMessage(paymentsError.message);
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
      setPayments((paymentsData ?? []) as PaymentItem[]);
      setIsLoading(false);
    }

    loadDashboard();
  }, [supabase]);

  const monthlyTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        isTransactionInMonth(transaction, selectedMonth),
      ),
    [transactions, selectedMonth],
  );

  const monthlyAgendaPayments = useMemo(
    () => buildMonthlyDashboardAgendaPayments(payments, selectedMonth),
    [payments, selectedMonth],
  );

  const selectedMonthParts = useMemo(() => {
    const [selectedYear, selectedMonthNumber] = selectedMonth.split("-");

    return {
      selectedYear,
      selectedMonthNumber,
    };
  }, [selectedMonth]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 7 }, (_, index) =>
      String(currentYear - 3 + index),
    );
  }, []);

  function shiftSelectedMonth(months: number) {
    const [year, month] = selectedMonth.split("-").map(Number);

    if (!year || !month) {
      setSelectedMonth(getMonthInputValue());
      return;
    }

    const nextDate = new Date(year, month - 1 + months, 1);
    const nextYear = nextDate.getFullYear();
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, "0");

    setSelectedMonth(`${nextYear}-${nextMonth}`);
  }

  function resetSelectedMonth() {
    setSelectedMonth(getMonthInputValue());
  }

  function updateSelectedMonthPart(part: "year" | "month", value: string) {
    const [currentYear, currentMonth] = getMonthInputValue().split("-");
    const [selectedYear, selectedMonthNumber] = selectedMonth.split("-");

    const nextYear = part === "year" ? value : selectedYear || currentYear;
    const nextMonth =
      part === "month"
        ? value.padStart(2, "0")
        : selectedMonthNumber || currentMonth;

    setSelectedMonth(`${nextYear}-${nextMonth}`);
  }
  const summary = useMemo(() => {
    const income = monthlyTransactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const expenses = monthlyTransactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const fixedExpenses = monthlyTransactions
      .filter((item) => item.type === "expense" && item.is_fixed)
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const variableExpenses = monthlyTransactions
      .filter((item) => item.type === "expense" && !item.is_fixed)
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const available = income - expenses;

    const goalSavings = goals.reduce(
      (sum, goal) => sum + Number(goal.current_amount),
      0,
    );

    const selectedDecisionIds = new Set(
      monthlyDecisions
        .filter((decision) => decision.month.slice(0, 7) === selectedMonth)
        .map((decision) => decision.id),
    );

    const savingLike = decisionItems
      .filter(
        (item) =>
          selectedDecisionIds.has(item.decision_id) &&
          (item.type === "saving" ||
            item.type === "investment" ||
            item.type === "goal"),
      )
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const savingAmount = Math.max(goalSavings, savingLike);

    const pendingPayments = monthlyAgendaPayments
      .filter((payment) => getEffectivePaymentStatus(payment) === "pending")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const postponedPayments = monthlyAgendaPayments
      .filter((payment) => getEffectivePaymentStatus(payment) === "postponed")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const overduePayments = monthlyAgendaPayments
      .filter((payment) => getEffectivePaymentStatus(payment) === "overdue")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const paidPayments = monthlyAgendaPayments
      .filter((payment) => getEffectivePaymentStatus(payment) === "paid")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const activeAgendaTotal =
      pendingPayments + postponedPayments + overduePayments;

    const projectedAfterAgenda = available - activeAgendaTotal;

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
      pendingPayments,
      postponedPayments,
      overduePayments,
      paidPayments,
      activeAgendaTotal,
      projectedAfterAgenda,
      healthScore,
      goalsCount: goals.length,
      spacesCount: spaces.length,
      paymentsCount: monthlyAgendaPayments.length,
    };
  }, [
    monthlyTransactions,
    goals,
    monthlyDecisions,
    decisionItems,
    monthlyAgendaPayments,
    spaces,
    selectedMonth,
  ]);

  const latestTransactions = monthlyTransactions.slice(0, 5);
  const latestGoals = goals.slice(0, 3);
  const latestSpaces = spaces.slice(0, 3);
  const latestPayments = monthlyAgendaPayments
    .filter((payment) => {
      const status = getEffectivePaymentStatus(payment);
      return (
        status === "pending" ||
        status === "overdue" ||
        status === "postponed"
      );
    })
    .slice(0, 4);

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
          <section className="rounded-3xl border border-white/10 bg-slate-900 p-5">
            <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Periodo de inicio
                </p>

                <h2 className="mt-2 text-2xl font-black capitalize">
                  {getMonthLabel(selectedMonth)}
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Inicio usa movimientos reales del mes y pagos recurrentes
                  esperados. Los pagos pagados no se arrastran como pagados a
                  otros meses.
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => shiftSelectedMonth(-1)}
                    className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    onClick={resetSelectedMonth}
                    className="rounded-full bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                  >
                    Este mes
                  </button>

                  <button
                    type="button"
                    onClick={() => shiftSelectedMonth(1)}
                    className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    →
                  </button>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <select
                    value={selectedMonthParts.selectedMonthNumber}
                    onChange={(event) =>
                      updateSelectedMonthPart("month", event.target.value)
                    }
                    className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-emerald-400"
                  >
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedMonthParts.selectedYear}
                    onChange={(event) =>
                      updateSelectedMonthPart("year", event.target.value)
                    }
                    className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-emerald-400"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>
          <section className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Disponible después de agenda
                </p>

                <h2
                  className={`mt-3 text-5xl font-black md:text-6xl ${
                    summary.projectedAfterAgenda < 0
                      ? "text-red-300"
                      : "text-white"
                  }`}
                >
                  {moneyFormatter.format(summary.projectedAfterAgenda)}
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Dinero estimado después de restar tus pagos pendientes,
                  pospuestos y vencidos de la Agenda de pagos.
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
              detail="Ingresos registrados en el periodo"
              tone="success"
            />

            <SummaryCard
              title="Gastos"
              value={moneyFormatter.format(summary.expenses)}
              detail="Gastos registrados en el periodo"
              tone="danger"
            />

            <SummaryCard
              title="Agenda pendiente"
              value={moneyFormatter.format(summary.activeAgendaTotal)}
              detail="Pendientes, vencidos y pospuestos"
              tone="warning"
            />

            <SummaryCard
              title="Salud financiera"
              value={`${summary.healthScore}/100`}
              detail="Puntaje estimado según gastos, ahorro y agenda"
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
                    Pagos del periodo
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
                  title="Pendientes"
                  value={moneyFormatter.format(
                    summary.pendingPayments + summary.postponedPayments,
                  )}
                />
                <MiniMetric
                  title="Vencidos"
                  value={moneyFormatter.format(summary.overduePayments)}
                  danger={summary.overduePayments > 0}
                />
                <MiniMetric
                  title="Pagados"
                  value={moneyFormatter.format(summary.paidPayments)}
                />
              </div>

              <div className="mt-6 space-y-3">
                {latestPayments.length === 0 ? (
                  <EmptyText text="No tienes pagos pendientes o vencidos en este periodo." />
                ) : (
                  latestPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-2xl bg-slate-950 p-4"
                    >
                      <div>
                        <p className="font-semibold">{payment.name}</p>
                        <p className="text-xs text-slate-500">
                          {payment.is_projected ? "Programado · " : ""}
                          {payment.category} ·{" "}
                          {payment.due_date
                            ? `Vence: ${payment.due_date}`
                            : "Sin fecha"}
                        </p>
                      </div>

                      <span className="font-bold text-yellow-200">
                        {moneyFormatter.format(Number(payment.amount))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-3xl border border-violet-400/30 bg-violet-400/10 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
                Recomendación IA
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                Tu agenda ya impacta el disponible.
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                Tienes{" "}
                <strong>{moneyFormatter.format(summary.activeAgendaTotal)}</strong>{" "}
                en pagos pendientes, vencidos o pospuestos. La IA podrá sugerir
                prioridades según fechas, monto y capacidad real de pago.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/assistant"
                  className="rounded-full bg-violet-400 px-5 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-violet-300"
                >
                  Ver asistente IA
                </Link>

                <Link
                  href="/payments"
                  className="rounded-full border border-white/10 px-5 py-3 text-center text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Ver agenda
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
  tone: "success" | "danger" | "info" | "warning" | "neutral";
}) {
  const valueClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "danger"
        ? "text-red-300"
        : tone === "info"
          ? "text-sky-300"
          : tone === "warning"
            ? "text-yellow-200"
            : "text-white";

  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">{title}</p>

      <p className={`mt-2 break-words text-2xl font-black leading-tight md:text-3xl ${valueClass}`}>
        {value}
      </p>

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
