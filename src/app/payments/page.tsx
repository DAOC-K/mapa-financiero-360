"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SimplePage from "@/components/SimplePage";
import { createClient } from "@/lib/supabase/client";

type PaymentKind = "recurrent" | "temporary" | "single";
type PaymentStatus = "pending" | "overdue" | "paid" | "omitted" | "postponed";

type Space = {
  id: string;
  name: string;
};

type PaymentItem = {
  id: string;
  space_id: string;
  user_id: string;

  name: string;
  amount: number;
  category: string;

  payment_kind: PaymentKind;
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

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateValue: string | null, days: number) {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addOneMonth(dateValue: string | null) {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

function getEffectiveStatus(payment: PaymentItem): PaymentStatus {
  if (payment.status === "paid" || payment.status === "omitted") {
    return payment.status;
  }

  if (payment.due_date && payment.due_date < todayValue()) {
    return "overdue";
  }

  return payment.status;
}

function getKindLabel(kind: PaymentKind) {
  if (kind === "recurrent") return "Recurrente";
  if (kind === "temporary") return "Temporal / cuotas";
  return "Único";
}

function isNextMonthPayment(payment: PaymentItem) {
  const effectiveStatus = getEffectiveStatus(payment);

  if (
    payment.payment_kind !== "recurrent" ||
    effectiveStatus !== "pending" ||
    !payment.due_date
  ) {
    return false;
  }

  const today = new Date(`${todayValue()}T00:00:00`);
  const dueDate = new Date(`${payment.due_date}T00:00:00`);

  return (
    dueDate.getFullYear() > today.getFullYear() ||
    (dueDate.getFullYear() === today.getFullYear() &&
      dueDate.getMonth() > today.getMonth())
  );
}

function getAgendaPriority(payment: PaymentItem) {
  const effectiveStatus = getEffectiveStatus(payment);

  if (effectiveStatus === "overdue") return 1;
  if (effectiveStatus === "pending" && !isNextMonthPayment(payment)) return 2;
  if (isNextMonthPayment(payment)) return 3;
  if (effectiveStatus === "postponed") return 4;
  if (effectiveStatus === "paid") return 5;
  if (effectiveStatus === "omitted") return 6;

  return 99;
}

function sortAgendaPayments(items: PaymentItem[]) {
  return [...items].sort((a, b) => {
    const priorityDiff = getAgendaPriority(a) - getAgendaPriority(b);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const aDate = a.due_date ?? "9999-12-31";
    const bDate = b.due_date ?? "9999-12-31";
    const dateDiff = aDate.localeCompare(bDate);

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return b.created_at.localeCompare(a.created_at);
  });
}

export default function PaymentsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Servicios");
  const [paymentKind, setPaymentKind] = useState<PaymentKind>("recurrent");
  const [dueDate, setDueDate] = useState("");
  const [spaceId, setSpaceId] = useState("");

  const [totalAmount, setTotalAmount] = useState("");
  const [installmentTotal, setInstallmentTotal] = useState("");
  const [notes, setNotes] = useState("");

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [deleteTargetPayment, setDeleteTargetPayment] =
    useState<PaymentItem | null>(null);
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

    const { data: paymentsData, error: paymentsError } = await supabase
      .from("payment_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (paymentsError) {
      setMessage(paymentsError.message);
      setIsLoading(false);
      return;
    }

    setPayments((paymentsData ?? []) as PaymentItem[]);
    setIsLoading(false);
  }

  const summary = useMemo(() => {
    const pending = payments
      .filter((payment) => getEffectiveStatus(payment) === "pending")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const postponed = payments
      .filter((payment) => getEffectiveStatus(payment) === "postponed")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const overdue = payments
      .filter((payment) => getEffectiveStatus(payment) === "overdue")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const paid = payments
      .filter((payment) => getEffectiveStatus(payment) === "paid")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const omitted = payments
      .filter((payment) => getEffectiveStatus(payment) === "omitted")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const projectedBase = 2000000;
    const projectedAvailable = projectedBase - pending - postponed - overdue;

    return {
      pending,
      postponed,
      overdue,
      paid,
      omitted,
      activeTotal: pending + postponed + overdue,
      projectedAvailable,
    };
  }, [payments]);

  const sortedPayments = useMemo(() => sortAgendaPayments(payments), [payments]);

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
    const numericTotalAmount = Number(totalAmount);
    const numericInstallmentTotal = Number(installmentTotal);

    let finalAmount = numericAmount;
    let finalTotalAmount: number | null = null;
    let finalInstallmentTotal: number | null = null;
    let finalRemainingAmount: number | null = null;
    let finalInstallmentNumber: number | null = null;

    if (paymentKind === "temporary") {
      finalTotalAmount = numericTotalAmount > 0 ? numericTotalAmount : null;
      finalInstallmentTotal =
        numericInstallmentTotal > 0 ? numericInstallmentTotal : null;
      finalInstallmentNumber = finalInstallmentTotal ? 1 : null;

      if (finalTotalAmount && finalInstallmentTotal && numericAmount <= 0) {
        finalAmount = Math.ceil(finalTotalAmount / finalInstallmentTotal);
      }

      finalRemainingAmount = finalTotalAmount;
    }

    if (!name.trim() || !category.trim() || finalAmount <= 0) {
      setMessage("Completa nombre, categoría y valor correctamente.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { data, error } = await supabase
      .from("payment_items")
      .insert({
        space_id: spaceId,
        user_id: userId,
        name,
        amount: finalAmount,
        category,
        payment_kind: paymentKind,
        status: "pending",
        due_date: dueDate || null,
        installment_number: finalInstallmentNumber,
        installment_total: finalInstallmentTotal,
        total_amount: finalTotalAmount,
        remaining_amount: finalRemainingAmount,
        notes: notes.trim() || null,
      })
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPayments((current) => [data as PaymentItem, ...current]);

    setName("");
    setAmount("");
    setCategory("Servicios");
    setPaymentKind("recurrent");
    setDueDate("");
    setTotalAmount("");
    setInstallmentTotal("");
    setNotes("");
    setMessage("Pago agregado a la agenda correctamente.");
  }

  function startEditingPayment(payment: PaymentItem) {
    setEditingPaymentId(payment.id);
    setEditName(payment.name);
    setEditAmount(String(Number(payment.amount)));
    setEditCategory(payment.category);
    setEditDueDate(payment.due_date ?? "");
    setEditNotes(payment.notes ?? "");
    setMessage("");
  }

  function cancelEditingPayment() {
    setEditingPaymentId(null);
    setEditName("");
    setEditAmount("");
    setEditCategory("");
    setEditDueDate("");
    setEditNotes("");
  }

  async function saveEditedPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingPaymentId) {
      return;
    }

    const numericAmount = Number(editAmount);

    if (!editName.trim() || !editCategory.trim() || numericAmount <= 0) {
      setMessage("Completa nombre, categoría y valor correctamente.");
      return;
    }

    const updatedPayment = await updatePayment(
      editingPaymentId,
      {
        name: editName.trim(),
        amount: numericAmount,
        category: editCategory.trim(),
        due_date: editDueDate || null,
        notes: editNotes.trim() || null,
      },
      "Pago actualizado correctamente.",
    );

    if (!updatedPayment) {
      return;
    }

    cancelEditingPayment();
  }
  async function updatePayment(
    id: string,
    values: Partial<PaymentItem>,
    successMessage: string,
  ) {
    setIsUpdating(id);
    setMessage("");

    const { data, error } = await supabase
      .from("payment_items")
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

    setPayments((current) =>
      current.map((payment) =>
        payment.id === id ? (data as PaymentItem) : payment,
      ),
    );

    setMessage(successMessage);
    return data as PaymentItem;
  }
  async function markAsPaid(payment: PaymentItem) {
    const newRemaining =
      payment.payment_kind === "temporary" && payment.remaining_amount
        ? Math.max(Number(payment.remaining_amount) - Number(payment.amount), 0)
        : payment.remaining_amount;

    const updatedPayment = await updatePayment(
      payment.id,
      {
        status: "paid",
        paid_at: new Date().toISOString(),
        remaining_amount: newRemaining,
      },
      "Pago marcado como pagado.",
    );

    if (!updatedPayment) return;

    if (payment.payment_kind === "recurrent" && userId) {
      const { data: nextPayment, error } = await supabase
        .from("payment_items")
        .insert({
          space_id: payment.space_id,
          user_id: userId,
          name: payment.name,
          amount: payment.amount,
          category: payment.category,
          payment_kind: "recurrent",
          status: "pending",
          due_date: addOneMonth(payment.due_date),
          installment_number: null,
          installment_total: null,
          total_amount: null,
          remaining_amount: null,
          notes: payment.notes,
        })
        .select()
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }

      setPayments((current) => [nextPayment as PaymentItem, ...current]);
      setMessage("Pago marcado como pagado y siguiente mes creado.");
      return;
    }

    const shouldCreateNextInstallment =
      payment.payment_kind === "temporary" &&
      payment.installment_number &&
      payment.installment_total &&
      payment.installment_number < payment.installment_total &&
      newRemaining !== null &&
      Number(newRemaining) > 0 &&
      userId;

    if (!shouldCreateNextInstallment) return;

    const nextInstallmentNumber = Number(payment.installment_number) + 1;
    const nextAmount = Math.min(Number(payment.amount), Number(newRemaining));

    const { data: nextPayment, error } = await supabase
      .from("payment_items")
      .insert({
        space_id: payment.space_id,
        user_id: userId,
        name: payment.name,
        amount: nextAmount,
        category: payment.category,
        payment_kind: "temporary",
        status: "pending",
        due_date: addOneMonth(payment.due_date),
        installment_number: nextInstallmentNumber,
        installment_total: payment.installment_total,
        total_amount: payment.total_amount,
        remaining_amount: newRemaining,
        notes: payment.notes,
      })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setPayments((current) => [nextPayment as PaymentItem, ...current]);
    setMessage("Pago marcado como pagado y siguiente cuota creada.");
  }
  async function postponePayment(payment: PaymentItem) {
    const nextDate = addDays(payment.due_date, 7);

    await updatePayment(
      payment.id,
      {
        status: "postponed",
        due_date: nextDate,
        postponed_to: nextDate,
      },
      "Pago pospuesto 7 días.",
    );
  }

  async function omitPayment(payment: PaymentItem) {
    await updatePayment(
      payment.id,
      {
        status: "omitted",
      },
      "Pago omitido este mes.",
    );
  }
  function requestDeletePayment(payment: PaymentItem) {
    setDeleteTargetPayment(payment);
    setMessage("");
  }

  function cancelDeletePayment() {
    if (isUpdating) {
      return;
    }

    setDeleteTargetPayment(null);
  }

  async function confirmDeletePayment() {
    if (!deleteTargetPayment) {
      return;
    }

    const paymentId = deleteTargetPayment.id;
    const paymentName = deleteTargetPayment.name;

    setIsUpdating(paymentId);
    setMessage("");

    const { error } = await supabase
      .from("payment_items")
      .delete()
      .eq("id", paymentId);

    setIsUpdating(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPayments((current) =>
      current.filter((payment) => payment.id !== paymentId),
    );

    if (editingPaymentId === paymentId) {
      cancelEditingPayment();
    }

    setDeleteTargetPayment(null);
    setMessage(`"${paymentName}" eliminado correctamente.`);
  }
  return (
    <SimplePage
      title="Agenda de pagos"
      description="Controla tus pagos fijos, deudas temporales, cuotas, vencidos y pagados sin perder de vista cuánto te queda disponible."
    >
      <div className="grid gap-6">
        {deleteTargetPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[2rem] border border-red-400/30 bg-slate-950 p-6 shadow-2xl shadow-red-950/40">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-400/10 text-2xl">
                ⚠️
              </div>

              <div className="mt-5 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">
                  Eliminar pago de la agenda
                </p>

                <h2 className="mt-3 text-2xl font-black text-white">
                  ¿Eliminar "{deleteTargetPayment.name}"?
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Esta acción no se puede deshacer. Si este pago pertenece a una
                  deuda, cuota o servicio recurrente, se eliminará de tu agenda.
                </p>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {deleteTargetPayment.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {deleteTargetPayment.category} ·{" "}
                      {getKindLabel(deleteTargetPayment.payment_kind)}
                    </p>
                  </div>

                  <p className="text-lg font-black text-white">
                    {moneyFormatter.format(Number(deleteTargetPayment.amount))}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={cancelDeletePayment}
                  disabled={Boolean(isUpdating)}
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmDeletePayment}
                  disabled={isUpdating === deleteTargetPayment.id}
                  className="rounded-full bg-red-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUpdating === deleteTargetPayment.id
                    ? "Eliminando..."
                    : "Sí, eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <SummaryCard
            title="Pendiente"
            value={moneyFormatter.format(summary.pending + summary.postponed)}
            detail="Pagos por realizar este mes"
            tone="warning"
          />

          <SummaryCard
            title="Vencido"
            value={moneyFormatter.format(summary.overdue)}
            detail="No se marcaron como pagados"
            tone="danger"
          />

          <SummaryCard
            title="Pagado"
            value={moneyFormatter.format(summary.paid)}
            detail="Pagos confirmados"
            tone="success"
          />

          <SummaryCard
            title="Después de pagos"
            value={moneyFormatter.format(summary.projectedAvailable)}
            detail="Disponible estimado"
            tone={summary.projectedAvailable < 0 ? "danger" : "neutral"}
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
            Tienes {moneyFormatter.format(summary.activeTotal)} por cubrir.
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Los pagos pendientes y vencidos siguen descontando de tu disponible
            proyectado hasta que los marques como pagados, los pospongas, los
            edites, los omitas este mes o los elimines.
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
                  Nuevo pago
                </p>

                <h2 className="mt-3 text-2xl font-bold">Agregar a la agenda</h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Registra pagos recurrentes, únicos o temporales por cuotas.
                </p>
              </div>

              <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                Supabase
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              <Field label="Tipo de pago">
                <select
                  value={paymentKind}
                  onChange={(event) =>
                    setPaymentKind(event.target.value as PaymentKind)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                >
                  <option value="recurrent">Recurrente mensual</option>
                  <option value="temporary">Temporal / por cuotas</option>
                  <option value="single">Único</option>
                </select>
              </Field>

              <Field label="Nombre">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej: Internet, arriendo, deuda con mamá"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                />
              </Field>

              <Field label="Valor de este pago">
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  type="number"
                  min="0"
                  placeholder="Ej: 150000"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                />
              </Field>

              {paymentKind === "temporary" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Valor total de la deuda">
                    <input
                      value={totalAmount}
                      onChange={(event) => setTotalAmount(event.target.value)}
                      type="number"
                      min="0"
                      placeholder="Ej: 300000"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                    />
                  </Field>

                  <Field label="Número de cuotas">
                    <input
                      value={installmentTotal}
                      onChange={(event) =>
                        setInstallmentTotal(event.target.value)
                      }
                      type="number"
                      min="1"
                      placeholder="Ej: 2"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                    />
                  </Field>
                </div>
              )}

              <Field label="Categoría">
                <input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Ej: Servicios, Deudas, Vivienda"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                />
              </Field>

              <Field label="Fecha de vencimiento">
                <input
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
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
                  placeholder="Ej: se paga cada 30, cuota familiar, préstamo temporal..."
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
              {isSaving ? "Guardando..." : "Guardar pago"}
            </button>
          </form>

          <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Lista de agenda</h2>

                <p className="mt-2 text-sm text-slate-400">
                  Recurrentes, temporales, vencidos y pagados.
                </p>
              </div>

              <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-300">
                Datos reales
              </span>
            </div>

            {editingPaymentId && (
              <form
                onSubmit={saveEditedPayment}
                className="mt-6 rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                      Editando pago
                    </p>

                    <h3 className="mt-2 text-xl font-bold">
                      Actualiza la información de este pago
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={cancelEditingPayment}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="Nombre">
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                    />
                  </Field>

                  <Field label="Valor">
                    <input
                      value={editAmount}
                      onChange={(event) => setEditAmount(event.target.value)}
                      type="number"
                      min="0"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                    />
                  </Field>

                  <Field label="Categoría">
                    <input
                      value={editCategory}
                      onChange={(event) => setEditCategory(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                    />
                  </Field>

                  <Field label="Fecha de vencimiento">
                    <input
                      value={editDueDate}
                      onChange={(event) => setEditDueDate(event.target.value)}
                      type="date"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Notas">
                    <textarea
                      value={editNotes}
                      onChange={(event) => setEditNotes(event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                    />
                  </Field>
                </div>

                <button
                  type="submit"
                  disabled={Boolean(isUpdating)}
                  className="mt-5 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUpdating ? "Guardando..." : "Guardar cambios"}
                </button>
              </form>
            )}
            <div className="mt-6 space-y-4">
              {isLoading ? (
                <EmptyText text="Cargando agenda de pagos..." />
              ) : sortedPayments.length === 0 ? (
                <EmptyText text="Aún no tienes pagos en la agenda." />
              ) : (
                sortedPayments.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    isUpdating={isUpdating === payment.id}
                    onPaid={() => markAsPaid(payment)}
                    onPostpone={() => postponePayment(payment)}
                    onOmit={() => omitPayment(payment)}
                    onEdit={() => startEditingPayment(payment)}
                    onDelete={() => requestDeletePayment(payment)}
                  />
                ))
              )}
            </div>
          </section>
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
  tone: "success" | "danger" | "warning" | "neutral";
}) {
  const valueClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "danger"
        ? "text-red-300"
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

function PaymentCard({
  payment,
  isUpdating,
  onPaid,
  onPostpone,
  onOmit,
  onEdit,
  onDelete,
}: {
  payment: PaymentItem;
  isUpdating: boolean;
  onPaid: () => void;
  onPostpone: () => void;
  onOmit: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const effectiveStatus = getEffectiveStatus(payment);

  const isPaid = effectiveStatus === "paid";
  const isOmitted = effectiveStatus === "omitted";
  const canAct = !isPaid && !isOmitted;

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{payment.name}</h3>
            <StatusBadge status={effectiveStatus} />

            {isNextMonthPayment(payment) && (
              <span className="rounded-full bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-300">
                Próximo mes
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-slate-400">
            {payment.category} · {getKindLabel(payment.payment_kind)}
          </p>

          {payment.installment_number && payment.installment_total && (
            <p className="mt-2 text-sm font-semibold text-emerald-300">
              Cuota {payment.installment_number} de {payment.installment_total}
            </p>
          )}

          <p className="mt-2 text-sm text-slate-500">
            {payment.due_date
              ? `Vence: ${payment.due_date}`
              : "Sin fecha de vencimiento"}
          </p>

          {payment.remaining_amount !== null && (
            <p className="mt-2 text-sm text-slate-500">
              Saldo pendiente registrado:{" "}
              {moneyFormatter.format(Number(payment.remaining_amount))}
            </p>
          )}

          {payment.notes && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              {payment.notes}
            </p>
          )}
        </div>

        <p className="text-2xl font-black">
          {moneyFormatter.format(Number(payment.amount))}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {isPaid && (
          <div className="rounded-full bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-300">
            Pago confirmado
          </div>
        )}

        {isOmitted && (
          <div className="rounded-full bg-slate-400/10 px-4 py-2 text-xs font-semibold text-slate-300">
            Omitido este mes
          </div>
        )}

        {canAct && (
          <>
            <button
              type="button"
              onClick={onPaid}
              disabled={isUpdating}
              className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUpdating ? "Procesando..." : "Marcar pagado"}
            </button>

            <button
              type="button"
              onClick={onPostpone}
              disabled={isUpdating}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Posponer 7 días
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

        <button
          type="button"
          onClick={onEdit}
          disabled={isUpdating}
          className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Editar
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={isUpdating}
          className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "paid") {
    return (
      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
        Pagado
      </span>
    );
  }

  if (status === "overdue") {
    return (
      <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-300">
        Vencido
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

  if (status === "postponed") {
    return (
      <span className="rounded-full bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-300">
        Pospuesto
      </span>
    );
  }

  return (
    <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-200">
      Pendiente
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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




