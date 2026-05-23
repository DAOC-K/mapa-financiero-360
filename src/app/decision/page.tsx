"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SimplePage from "@/components/SimplePage";
import { createClient } from "@/lib/supabase/client";

type DecisionType = "saving" | "investment" | "debt" | "goal" | "free";

type Space = {
  id: string;
  name: string;
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
  type: DecisionType;
  created_at: string;
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function getCurrentMonthDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function getTypeLabel(type: DecisionType) {
  const labels: Record<DecisionType, string> = {
    saving: "Ahorro",
    investment: "Inversión",
    debt: "Deuda",
    goal: "Meta",
    free: "Libre",
  };

  return labels[type];
}

export default function DecisionPage() {
  const supabase = useMemo(() => createClient(), []);

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [decision, setDecision] = useState<MonthlyDecision | null>(null);
  const [decisionItems, setDecisionItems] = useState<DecisionItem[]>([]);

  const [availableAmount, setAvailableAmount] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<DecisionType>("saving");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [message, setMessage] = useState("");

  const month = getCurrentMonthDate();

  useEffect(() => {
    async function loadSpaces() {
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

      const { data, error } = await supabase
        .from("spaces")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      const availableSpaces = data ?? [];
      setSpaces(availableSpaces);

      if (availableSpaces.length > 0) {
        setSelectedSpaceId(availableSpaces[0].id);
      } else {
        setIsLoading(false);
      }
    }

    loadSpaces();
  }, [supabase]);

  useEffect(() => {
    async function loadDecision() {
      if (!selectedSpaceId) return;

      setIsLoading(true);
      setMessage("");

      const { data: decisionData, error: decisionError } = await supabase
        .from("monthly_decisions")
        .select("*")
        .eq("space_id", selectedSpaceId)
        .eq("month", month)
        .maybeSingle();

      if (decisionError) {
        setMessage(decisionError.message);
        setIsLoading(false);
        return;
      }

      if (!decisionData) {
        setDecision(null);
        setDecisionItems([]);
        setAvailableAmount("0");
        setIsLoading(false);
        return;
      }

      setDecision(decisionData);
      setAvailableAmount(String(Number(decisionData.available_amount)));

      const { data: itemsData, error: itemsError } = await supabase
        .from("decision_items")
        .select("*")
        .eq("decision_id", decisionData.id)
        .order("created_at", { ascending: false });

      if (itemsError) {
        setMessage(itemsError.message);
        setIsLoading(false);
        return;
      }

      setDecisionItems(itemsData ?? []);
      setIsLoading(false);
    }

    loadDecision();
  }, [selectedSpaceId, month, supabase]);

  const totals = useMemo(() => {
    const numericAvailableAmount = Number(availableAmount) || 0;

    const distributed = decisionItems.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );

    const remaining = numericAvailableAmount - distributed;

    const percentage =
      numericAvailableAmount > 0
        ? Math.min(Math.round((distributed / numericAvailableAmount) * 100), 100)
        : 0;

    return {
      available: numericAvailableAmount,
      distributed,
      remaining,
      percentage,
    };
  }, [availableAmount, decisionItems]);

  async function ensureDecision() {
    if (!userId) {
      throw new Error("No hay usuario activo.");
    }

    if (!selectedSpaceId) {
      throw new Error("Primero crea un mapa financiero.");
    }

    if (decision) {
      return decision;
    }

    const { data, error } = await supabase
      .from("monthly_decisions")
      .insert({
        space_id: selectedSpaceId,
        created_by: userId,
        month,
        available_amount: Number(availableAmount) || 0,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    setDecision(data);
    return data;
  }

  async function saveAvailableAmount() {
    setIsSavingDecision(true);
    setMessage("");

    try {
      const currentDecision = await ensureDecision();

      const { data, error } = await supabase
        .from("monthly_decisions")
        .update({
          available_amount: Number(availableAmount) || 0,
        })
        .eq("id", currentDecision.id)
        .select()
        .single();

      if (error) {
        setMessage(error.message);
        setIsSavingDecision(false);
        return;
      }

      setDecision(data);
      setMessage("Disponible del mes guardado correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    }

    setIsSavingDecision(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!name.trim() || numericAmount <= 0) {
      setMessage("Completa todos los campos correctamente.");
      return;
    }

    setIsSavingItem(true);
    setMessage("");

    try {
      const currentDecision = await ensureDecision();

      const { data, error } = await supabase
        .from("decision_items")
        .insert({
          decision_id: currentDecision.id,
          name,
          amount: numericAmount,
          type,
        })
        .select()
        .single();

      if (error) {
        setMessage(error.message);
        setIsSavingItem(false);
        return;
      }

      setDecisionItems((current) => [data, ...current]);

      setName("");
      setAmount("");
      setType("saving");
      setMessage("Decisión agregada correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    }

    setIsSavingItem(false);
  }

  async function removeItem(id: string) {
    setMessage("");

    const { error } = await supabase.from("decision_items").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setDecisionItems((current) => current.filter((item) => item.id !== id));
    setMessage("Decisión eliminada correctamente.");
  }

  return (
    <SimplePage
      title="Decisión del mes"
      description="Distribuye el dinero disponible entre ahorro, inversión, metas, deudas o dinero libre."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Disponible del mes"
          value={moneyFormatter.format(totals.available)}
        />
        <SummaryCard
          title="Distribuido"
          value={moneyFormatter.format(totals.distributed)}
        />
        <SummaryCard
          title="Falta por asignar"
          value={moneyFormatter.format(totals.remaining)}
          warning={totals.remaining < 0}
        />
      </div>

      <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Disponible para decidir</h2>
            <p className="mt-2 text-sm text-slate-400">
              Esta decisión mensual ahora se guarda en Supabase por mapa financiero.
            </p>
          </div>

          <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            Base de datos activa
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Mapa financiero">
            <select
              value={selectedSpaceId}
              onChange={(event) => setSelectedSpaceId(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
            >
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Monto disponible">
            <input
              value={availableAmount}
              onChange={(event) => setAvailableAmount(event.target.value)}
              type="number"
              min="0"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={saveAvailableAmount}
          disabled={isSavingDecision || spaces.length === 0}
          className="mt-6 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSavingDecision ? "Guardando..." : "Guardar disponible"}
        </button>

        <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all"
            style={{ width: `${totals.percentage}%` }}
          />
        </div>

        <p className="mt-3 text-sm text-slate-400">
          Has asignado el {totals.percentage}% del dinero disponible.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6"
      >
        <h2 className="text-2xl font-bold">Agregar decisión</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Field label="Nombre">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Pagar deuda, ahorro, inversión"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </Field>

          <Field label="Monto">
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="number"
              min="0"
              placeholder="Ej: 300000"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </Field>

          <Field label="Tipo">
            <select
              value={type}
              onChange={(event) => setType(event.target.value as DecisionType)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
            >
              <option value="saving">Ahorro</option>
              <option value="investment">Inversión</option>
              <option value="debt">Deuda</option>
              <option value="goal">Meta</option>
              <option value="free">Libre</option>
            </select>
          </Field>
        </div>

        {message && (
          <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950 p-3 text-sm text-slate-300">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSavingItem || spaces.length === 0}
          className="mt-6 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSavingItem ? "Guardando..." : "Guardar decisión"}
        </button>
      </form>

      {isLoading ? (
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-slate-400">Cargando decisión del mes...</p>
        </section>
      ) : decisionItems.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Aún no hay decisiones</h2>
          <p className="mt-2 text-sm text-slate-400">
            Agrega la primera distribución del dinero disponible.
          </p>
        </section>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {decisionItems.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-white/10 bg-slate-900 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    {getTypeLabel(item.type)}
                  </span>

                  <h3 className="mt-4 text-xl font-bold">{item.name}</h3>

                  <p className="mt-2 text-3xl font-black">
                    {moneyFormatter.format(Number(item.amount))}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  Quitar
                </button>
              </div>
            </article>
          ))}
        </div>
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
    <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
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
