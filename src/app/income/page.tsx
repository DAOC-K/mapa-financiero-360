"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import SimplePage from "@/components/SimplePage";
import { createClient } from "@/lib/supabase/client";

type IncomeKind = "recurrent" | "temporary" | "single";
type IncomeStatus = "expected" | "received" | "omitted";

type Space = {
  id: string;
  name: string;
  monthly_budget: number | null;
};

type IncomeItem = {
  id: string;
  space_id: string;
  user_id: string;

  name: string;
  amount: number;
  category: string;

  income_kind: IncomeKind;
  status: IncomeStatus;

  expected_date: string | null;
  received_at: string | null;

  notes: string | null;

  created_at: string;
  updated_at: string;
};

type MonthlyIncomeItem = IncomeItem & {
  is_projected?: boolean;
  source_income_id?: string;
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

function getKindLabel(kind: IncomeKind) {
  if (kind === "recurrent") return "Recurrente";
  if (kind === "temporary") return "Temporal";
  return "Único";
}

function getStatusLabel(status: IncomeStatus) {
  if (status === "received") return "Recibido";
  if (status === "omitted") return "Omitido";
  return "Esperado";
}

function isIncomeAccountedInMonth(income: IncomeItem, monthValue: string) {
  if (income.status === "received") {
    return isSelectedMonthValue(income.received_at, monthValue);
  }

  if (income.status === "omitted") {
    return isSelectedMonthValue(income.expected_date ?? income.updated_at, monthValue);
  }

  return isSelectedMonthValue(income.expected_date, monthValue);
}

function getIncomeSeriesKey(income: IncomeItem) {
  return [
    income.space_id,
    income.name.trim().toLowerCase(),
    income.category.trim().toLowerCase(),
  ].join("|");
}

function getProjectedIncomeDate(income: IncomeItem, monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const originalDay = income.expected_date
    ? Number(income.expected_date.slice(8, 10))
    : 1;

  const lastDayOfSelectedMonth = new Date(year, month, 0).getDate();
  const safeDay = Math.min(originalDay || 1, lastDayOfSelectedMonth);

  return `${monthValue}-${String(safeDay).padStart(2, "0")}`;
}

function sortMonthlyIncomes(items: MonthlyIncomeItem[]) {
  return [...items].sort((a, b) => {
    const statusOrder: Record<IncomeStatus, number> = {
      expected: 1,
      received: 2,
      omitted: 3,
    };

    const statusDiff = statusOrder[a.status] - statusOrder[b.status];

    if (statusDiff !== 0) {
      return statusDiff;
    }

    const aDate = a.expected_date ?? "9999-12-31";
    const bDate = b.expected_date ?? "9999-12-31";

    return aDate.localeCompare(bDate);
  });
}

function buildMonthlyIncomes(
  incomes: IncomeItem[],
  monthValue: string,
): MonthlyIncomeItem[] {
  const actualMonthIncomes = incomes.filter((income) =>
    isIncomeAccountedInMonth(income, monthValue),
  );

  const actualRecurrentKeys = new Set(
    actualMonthIncomes
      .filter((income) => income.income_kind === "recurrent")
      .map(getIncomeSeriesKey),
  );

  const recurrentTemplateByKey = new Map<string, IncomeItem>();
  const recurrentFirstMonthByKey = new Map<string, string>();

  for (const income of incomes) {
    if (income.income_kind !== "recurrent") {
      continue;
    }

    const key = getIncomeSeriesKey(income);
    const incomeMonth =
      income.expected_date?.slice(0, 7) ?? income.created_at.slice(0, 7);

    const currentFirstMonth = recurrentFirstMonthByKey.get(key);

    if (!currentFirstMonth || incomeMonth < currentFirstMonth) {
      recurrentFirstMonthByKey.set(key, incomeMonth);
    }

    const currentTemplate = recurrentTemplateByKey.get(key);

    if (!currentTemplate) {
      recurrentTemplateByKey.set(key, income);
      continue;
    }

    const incomeDate = income.expected_date ?? "";
    const templateDate = currentTemplate.expected_date ?? "";

    if (
      income.updated_at > currentTemplate.updated_at ||
      incomeDate > templateDate
    ) {
      recurrentTemplateByKey.set(key, income);
    }
  }

  const projectedIncomes: MonthlyIncomeItem[] = [];

  for (const [key, template] of recurrentTemplateByKey.entries()) {
    const firstMonth = recurrentFirstMonthByKey.get(key);

    if (actualRecurrentKeys.has(key)) {
      continue;
    }

    if (firstMonth && monthValue < firstMonth) {
      continue;
    }

    projectedIncomes.push({
      ...template,
      id: `projected-${key}-${monthValue}`,
      status: "expected",
      expected_date: getProjectedIncomeDate(template, monthValue),
      received_at: null,
      created_at: `${monthValue}-01T00:00:00.000Z`,
      updated_at: template.updated_at,
      is_projected: true,
      source_income_id: template.id,
      projected_month: monthValue,
    });
  }

  return sortMonthlyIncomes([...actualMonthIncomes, ...projectedIncomes]);
}

export default function IncomePage() {
  const supabase = useMemo(() => createClient(), []);

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(getMonthInputValue());

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Salario");
  const [incomeKind, setIncomeKind] = useState<IncomeKind>("recurrent");
  const [expectedDate, setExpectedDate] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [notes, setNotes] = useState("");

  const [deleteTargetIncome, setDeleteTargetIncome] =
    useState<IncomeItem | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      .select("id, name, monthly_budget")
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

    const { data: incomesData, error: incomesError } = await supabase
      .from("income_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (incomesError) {
      setMessage(incomesError.message);
      setIsLoading(false);
      return;
    }

    setIncomes((incomesData ?? []) as IncomeItem[]);
    setIsLoading(false);
  }

  const monthlyIncomes = useMemo(
    () => buildMonthlyIncomes(incomes, selectedMonth),
    [incomes, selectedMonth],
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

  const summary = useMemo(() => {
    const expected = monthlyIncomes
      .filter((income) => income.status === "expected")
      .reduce((sum, income) => sum + Number(income.amount), 0);

    const received = monthlyIncomes
      .filter((income) => income.status === "received")
      .reduce((sum, income) => sum + Number(income.amount), 0);

    const omitted = monthlyIncomes
      .filter((income) => income.status === "omitted")
      .reduce((sum, income) => sum + Number(income.amount), 0);

    return {
      expected,
      received,
      omitted,
      totalPlanned: expected + received,
      count: monthlyIncomes.length,
    };
  }, [monthlyIncomes]);

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
      setMessage("Completa nombre, categoría y valor correctamente.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { data, error } = await supabase
      .from("income_items")
      .insert({
        space_id: spaceId,
        user_id: userId,
        name: name.trim(),
        amount: numericAmount,
        category: category.trim(),
        income_kind: incomeKind,
        status: "expected",
        expected_date: expectedDate || null,
        notes: notes.trim() || null,
      })
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setIncomes((current) => [data as IncomeItem, ...current]);

    setName("");
    setAmount("");
    setCategory("Salario");
    setIncomeKind("recurrent");
    setExpectedDate("");
    setNotes("");
    setMessage("Ingreso agregado correctamente.");
  }

  async function updateIncome(
    id: string,
    values: Partial<IncomeItem>,
    successMessage: string,
  ) {
    setIsUpdating(id);
    setMessage("");

    const { data, error } = await supabase
      .from("income_items")
      .update({
        ...values,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    setIsUpdating(null);

    if (error) {
      setMessage(error.message);
      return null;
    }

    setIncomes((current) =>
      current.map((income) => (income.id === id ? (data as IncomeItem) : income)),
    );

    setMessage(successMessage);
    return data as IncomeItem;
  }

  async function markAsReceived(income: MonthlyIncomeItem) {
    if (income.is_projected && userId) {
      const { data, error } = await supabase
        .from("income_items")
        .insert({
          space_id: income.space_id,
          user_id: userId,
          name: income.name,
          amount: income.amount,
          category: income.category,
          income_kind: "recurrent",
          status: "received",
          expected_date: income.expected_date,
          received_at: new Date().toISOString(),
          notes: income.notes,
        })
        .select()
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }

      setIncomes((current) => [data as IncomeItem, ...current]);
      setMessage("Ingreso recurrente del mes marcado como recibido.");
      return;
    }

    await updateIncome(
      income.id,
      {
        status: "received",
        received_at: new Date().toISOString(),
      },
      "Ingreso marcado como recibido.",
    );
  }

  async function omitIncome(income: MonthlyIncomeItem) {
    if (income.is_projected && userId) {
      const { data, error } = await supabase
        .from("income_items")
        .insert({
          space_id: income.space_id,
          user_id: userId,
          name: income.name,
          amount: income.amount,
          category: income.category,
          income_kind: "recurrent",
          status: "omitted",
          expected_date: income.expected_date,
          received_at: null,
          notes: income.notes,
        })
        .select()
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }

      setIncomes((current) => [data as IncomeItem, ...current]);
      setMessage("Ingreso recurrente omitido para este mes.");
      return;
    }

    await updateIncome(
      income.id,
      {
        status: "omitted",
      },
      "Ingreso omitido para este mes.",
    );
  }

  function requestDeleteIncome(income: IncomeItem) {
    setDeleteTargetIncome(income);
    setMessage("");
  }

  function cancelDeleteIncome() {
    if (isUpdating) {
      return;
    }

    setDeleteTargetIncome(null);
  }

  async function confirmDeleteIncome() {
    if (!deleteTargetIncome) {
      return;
    }

    const incomeId = deleteTargetIncome.id;
    const incomeName = deleteTargetIncome.name;

    setIsUpdating(incomeId);
    setMessage("");

    const { error } = await supabase.from("income_items").delete().eq("id", incomeId);

    setIsUpdating(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setIncomes((current) => current.filter((income) => income.id !== incomeId));
    setDeleteTargetIncome(null);
    setMessage(`"${incomeName}" eliminado correctamente.`);
  }

  return (
    <SimplePage
      title="Ingresos esperados"
      description="Registra ingresos fijos, temporales o únicos y compáralos con lo que realmente recibes cada mes."
    >
      <div className="grid gap-6">
        {deleteTargetIncome && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[2rem] border border-red-400/30 bg-slate-950 p-6 shadow-2xl shadow-red-950/40">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-400/10 text-2xl">
                ⚠️
              </div>

              <div className="mt-5 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">
                  Eliminar ingreso
                </p>

                <h2 className="mt-3 text-2xl font-black text-white">
                  ¿Eliminar "{deleteTargetIncome.name}"?
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Esta acción no se puede deshacer. Si este ingreso es
                  recurrente, se eliminará como plantilla para futuros meses.
                </p>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {deleteTargetIncome.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {deleteTargetIncome.category} ·{" "}
                      {getKindLabel(deleteTargetIncome.income_kind)}
                    </p>
                  </div>

                  <p className="text-lg font-black text-white">
                    {moneyFormatter.format(Number(deleteTargetIncome.amount))}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={cancelDeleteIncome}
                  disabled={Boolean(isUpdating)}
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmDeleteIncome}
                  disabled={isUpdating === deleteTargetIncome.id}
                  className="rounded-full bg-red-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUpdating === deleteTargetIncome.id
                    ? "Eliminando..."
                    : "Sí, eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-slate-900 p-5">
          <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Periodo de ingresos
              </p>

              <h2 className="mt-2 text-2xl font-black capitalize">
                {getMonthLabel(selectedMonth)}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Se muestran ingresos reales del mes elegido y recurrentes
                esperados. Los ingresos recibidos no se arrastran como recibidos
                a otros meses.
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

        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <SummaryCard
            title="Esperado"
            value={moneyFormatter.format(summary.expected)}
            detail="Ingresos pendientes por recibir"
            tone="warning"
          />

          <SummaryCard
            title="Recibido"
            value={moneyFormatter.format(summary.received)}
            detail="Ingresos confirmados del periodo"
            tone="success"
          />

          <SummaryCard
            title="Total proyectado"
            value={moneyFormatter.format(summary.totalPlanned)}
            detail="Esperado + recibido"
            tone="info"
          />

          <SummaryCard
            title="Omitido"
            value={moneyFormatter.format(summary.omitted)}
            detail="Ingresos que no llegaron este mes"
            tone="neutral"
          />
        </section>

        {message && (
          <section className="rounded-3xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-slate-300">{message}</p>
          </section>
        )}

        <section className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
            IA financiera
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            Esperas recibir {moneyFormatter.format(summary.totalPlanned)} en{" "}
            {getMonthLabel(selectedMonth)}.
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Cuando confirmes ingresos recibidos, Brújula podrá comparar lo
            esperado contra lo real y ajustar tu disponible mensual.
          </p>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/10 bg-slate-900 p-6"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Nuevo ingreso
                </p>

                <h2 className="mt-3 text-2xl font-bold">
                  Agregar ingreso esperado
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Registra salario, ingresos extra, freelance o aportes
                  familiares.
                </p>
              </div>

              <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                Supabase
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              <Field label="Tipo de ingreso">
                <select
                  value={incomeKind}
                  onChange={(event) =>
                    setIncomeKind(event.target.value as IncomeKind)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                >
                  <option value="recurrent">Recurrente mensual</option>
                  <option value="temporary">Temporal</option>
                  <option value="single">Único</option>
                </select>
              </Field>

              <Field label="Nombre">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej: Salario, freelance, aporte familiar"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                />
              </Field>

              <Field label="Valor esperado">
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  type="number"
                  min="0"
                  placeholder="Ej: 2500000"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                />
              </Field>

              <Field label="Categoría">
                <input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Ej: Salario, Freelance, Extra"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                />
              </Field>

              <Field label="Fecha esperada">
                <input
                  value={expectedDate}
                  onChange={(event) => setExpectedDate(event.target.value)}
                  type="date"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
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

              <Field label="Notas">
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ej: llega cada 30, ingreso variable, pago de cliente..."
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={isSaving || spaces.length === 0}
              className="mt-6 w-full rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : "Guardar ingreso"}
            </button>
          </form>

          <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Lista de ingresos</h2>

                <p className="mt-2 text-sm text-slate-400">
                  Recurrentes, temporales, únicos, recibidos y omitidos.
                </p>
              </div>

              <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-300">
                Datos reales
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {isLoading ? (
                <EmptyText text="Cargando ingresos..." />
              ) : monthlyIncomes.length === 0 ? (
                <EmptyText text="No tienes ingresos asociados a este mes." />
              ) : (
                monthlyIncomes.map((income) => (
                  <IncomeCard
                    key={income.id}
                    income={income}
                    isUpdating={isUpdating === income.id}
                    onReceived={() => markAsReceived(income)}
                    onOmit={() => omitIncome(income)}
                    onDelete={() => requestDeleteIncome(income)}
                  />
                ))
              )}
            </div>
          </section>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Conexión pendiente</h2>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            En el siguiente paso conectaremos estos ingresos esperados con Inicio
            y Agenda de pagos para que el disponible use ingresos esperados
            reales, no solo presupuesto mensual de espacios.
          </p>

          <Link
            href="/dashboard"
            className="mt-5 inline-flex rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Volver a Inicio
          </Link>
        </section>
      </div>
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

      <p className={`mt-2 break-words text-2xl font-black md:text-3xl ${valueClass}`}>
        {value}
      </p>

      <p className="mt-3 text-sm leading-6 text-slate-500">{detail}</p>
    </article>
  );
}

function IncomeCard({
  income,
  isUpdating,
  onReceived,
  onOmit,
  onDelete,
}: {
  income: MonthlyIncomeItem;
  isUpdating: boolean;
  onReceived: () => void;
  onOmit: () => void;
  onDelete: () => void;
}) {
  const isReceived = income.status === "received";
  const isOmitted = income.status === "omitted";
  const isProjected = Boolean(income.is_projected);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{income.name}</h3>
            <StatusBadge status={income.status} />

            {isProjected && (
              <span className="rounded-full bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-300">
                Programado
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-slate-400">
            {income.category} · {getKindLabel(income.income_kind)}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {income.expected_date
              ? `Fecha esperada: ${income.expected_date}`
              : "Sin fecha esperada"}
          </p>

          {income.notes && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              {income.notes}
            </p>
          )}

          {isProjected && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-violet-300">
              Ingreso recurrente esperado para este mes. Aún no existe como
              ingreso real.
            </p>
          )}
        </div>

        <p className="text-2xl font-black">
          {moneyFormatter.format(Number(income.amount))}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {isReceived && (
          <div className="rounded-full bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-300">
            Ingreso confirmado
          </div>
        )}

        {isOmitted && (
          <div className="rounded-full bg-slate-400/10 px-4 py-2 text-xs font-semibold text-slate-300">
            Omitido este mes
          </div>
        )}

        {!isReceived && !isOmitted && (
          <>
            <button
              type="button"
              onClick={onReceived}
              disabled={isUpdating}
              className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUpdating ? "Procesando..." : "Marcar recibido"}
            </button>

            <button
              type="button"
              onClick={onOmit}
              disabled={isUpdating}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Omitir este mes
            </button>
          </>
        )}

        {!isProjected && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isUpdating}
            className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: IncomeStatus }) {
  if (status === "received") {
    return (
      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
        Recibido
      </span>
    );
  }

  if (status === "omitted") {
    return (
      <span className="rounded-full bg-slate-400/10 px-3 py-1 text-xs font-semibold text-slate-300">
        Omitido
      </span>
    );
  }

  return (
    <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-200">
      Esperado
    </span>
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
