"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Bill = {
  id: string;
  space_id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  due_date: string;
  status: "pending" | "paid";
  is_recurring: boolean;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
};

type BillsPanelProps = {
  spaceId: string;
  userId: string | null;
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isOverdue(bill: Bill) {
  const today = new Date().toISOString().slice(0, 10);
  return bill.status === "pending" && bill.due_date < today;
}

export default function BillsPanel({ spaceId, userId }: BillsPanelProps) {
  const supabase = useMemo(() => createClient(), []);

  const [bills, setBills] = useState<Bill[]>([]);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [dueDate, setDueDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadBills = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .eq("space_id", spaceId)
      .order("due_date", { ascending: true });

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    setBills(data ?? []);
    setIsLoading(false);
  }, [spaceId, supabase]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const summary = useMemo(() => {
    const pendingBills = bills.filter((bill) => bill.status === "pending");
    const paidBills = bills.filter((bill) => bill.status === "paid");
    const overdueBills = bills.filter(isOverdue);

    const pendingAmount = pendingBills.reduce(
      (sum, bill) => sum + Number(bill.amount),
      0,
    );

    return {
      pendingCount: pendingBills.length,
      paidCount: paidBills.length,
      overdueCount: overdueBills.length,
      pendingAmount,
    };
  }, [bills]);

  async function handleCreateBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      setMessage("No hay usuario activo.");
      return;
    }

    const numericAmount = Number(amount);

    if (!name.trim() || numericAmount <= 0 || !dueDate) {
      setMessage("Completa nombre, monto y fecha de vencimiento.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { data, error } = await supabase
      .from("bills")
      .insert({
        space_id: spaceId,
        user_id: userId,
        name,
        amount: numericAmount,
        category,
        due_date: dueDate,
        status: "pending",
        is_recurring: isRecurring,
        notes: notes || null,
      })
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setBills((current) =>
      [data, ...current].sort((a, b) => a.due_date.localeCompare(b.due_date)),
    );

    setName("");
    setAmount("");
    setCategory("General");
    setDueDate("");
    setIsRecurring(false);
    setNotes("");
    setMessage("Vencimiento agregado correctamente.");
  }

  async function togglePaidStatus(bill: Bill) {
    setMessage("");

    const nextStatus = bill.status === "pending" ? "paid" : "pending";

    const { data, error } = await supabase
      .from("bills")
      .update({
        status: nextStatus,
        paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", bill.id)
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setBills((current) =>
      current.map((item) => (item.id === bill.id ? data : item)),
    );

    setMessage(
      nextStatus === "paid"
        ? "Vencimiento marcado como pagado."
        : "Vencimiento marcado como pendiente.",
    );
  }

  async function removeBill(id: string) {
    setMessage("");

    const { error } = await supabase.from("bills").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setBills((current) => current.filter((bill) => bill.id !== id));
    setMessage("Vencimiento eliminado.");
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Pendientes"
          value={String(summary.pendingCount)}
          detail="Cuentas por pagar"
        />
        <SummaryCard
          title="Total pendiente"
          value={moneyFormatter.format(summary.pendingAmount)}
          detail="Valor total por pagar"
        />
        <SummaryCard
          title="Vencidos"
          value={String(summary.overdueCount)}
          detail="Pagos fuera de fecha"
          warning={summary.overdueCount > 0}
        />
        <SummaryCard
          title="Pagados"
          value={String(summary.paidCount)}
          detail="Cuentas ya cerradas"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={handleCreateBill}
          className="rounded-3xl border border-white/10 bg-slate-900 p-6"
        >
          <h2 className="text-2xl font-bold">Nuevo vencimiento</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Registra cuentas por pagar, fechas límite, servicios o cuotas.
          </p>

          <div className="mt-6 grid gap-4">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Arriendo, Internet, Tarjeta"
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
            />

            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="number"
              min="0"
              placeholder="Monto"
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
            />

            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Categoría"
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
            />

            <input
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
            />

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notas opcionales"
              rows={3}
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
            />

            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(event) => setIsRecurring(event.target.checked)}
              />
              Es recurrente
            </label>
          </div>

          {message && (
            <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950 p-3 text-sm text-slate-300">
              {message}
            </p>
          )}

          <button
            disabled={isSaving}
            className="mt-6 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
          >
            {isSaving ? "Guardando..." : "Guardar vencimiento"}
          </button>
        </form>

        <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Cuentas por pagar</h2>

          {isLoading ? (
            <p className="mt-6 rounded-2xl bg-slate-950 p-4 text-sm text-slate-400">
              Cargando vencimientos...
            </p>
          ) : bills.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-slate-950 p-4 text-sm text-slate-400">
              Este mapa todavía no tiene vencimientos.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {bills.map((bill) => (
                <div
                  key={bill.id}
                  className={`rounded-2xl border p-4 ${
                    isOverdue(bill)
                      ? "border-red-400/40 bg-red-400/10"
                      : "border-white/10 bg-slate-950"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{bill.name}</h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            bill.status === "paid"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-yellow-400/10 text-yellow-300"
                          }`}
                        >
                          {bill.status === "paid" ? "Pagado" : "Pendiente"}
                        </span>

                        {isOverdue(bill) && (
                          <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-300">
                            Vencido
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-2xl font-black">
                        {moneyFormatter.format(Number(bill.amount))}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {bill.category} · vence {formatDate(bill.due_date)}
                      </p>

                      {bill.notes && (
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {bill.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => togglePaidStatus(bill)}
                        className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
                      >
                        {bill.status === "paid"
                          ? "Marcar pendiente"
                          : "Marcar pagado"}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeBill(bill.id)}
                        className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
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