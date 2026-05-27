"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SimplePage from "@/components/SimplePage";
import BillsPanel from "@/components/BillsPanel";
import { createClient } from "@/lib/supabase/client";

type Tab = "summary" | "quick" | "movements" | "bills" | "goals" | "members";

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

type SpaceMember = {
  space_id: string;
  user_id: string;
  role: "owner" | "member";
  created_at: string;
};

type SpaceInvitation = {
  id: string;
  space_id: string;
  space_name: string;
  invited_email: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  accepted_at: string | null;
};

type Insight = {
  title: string;
  description: string;
  tone: "success" | "warning" | "info";
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const tabs: { id: Tab; label: string }[] = [
  { id: "summary", label: "Resumen" },
  { id: "quick", label: "Registro rápido" },
  { id: "movements", label: "Movimientos" },
  { id: "bills", label: "Vencimientos" },
  { id: "goals", label: "Metas" },
  { id: "members", label: "Miembros" },
];



function detectCategory(text: string) {
  const lower = text.toLowerCase();

  if (lower.includes("uber") || lower.includes("taxi") || lower.includes("bus")) {
    return "Transporte";
  }

  if (
    lower.includes("mercado") ||
    lower.includes("comida") ||
    lower.includes("restaurante") ||
    lower.includes("almuerzo") ||
    lower.includes("cena")
  ) {
    return "Alimentación";
  }

  if (
    lower.includes("arriendo") ||
    lower.includes("renta") ||
    lower.includes("servicio") ||
    lower.includes("luz") ||
    lower.includes("agua") ||
    lower.includes("internet")
  ) {
    return "Hogar";
  }

  if (
    lower.includes("sueldo") ||
    lower.includes("salario") ||
    lower.includes("freelance") ||
    lower.includes("pago")
  ) {
    return "Trabajo";
  }

  if (
    lower.includes("inversion") ||
    lower.includes("inversión") ||
    lower.includes("accion") ||
    lower.includes("acción") ||
    lower.includes("etf")
  ) {
    return "Inversión";
  }

  if (
    lower.includes("tarjeta") ||
    lower.includes("credito") ||
    lower.includes("crédito") ||
    lower.includes("prestamo") ||
    lower.includes("préstamo")
  ) {
    return "Deudas";
  }

  return "General";
}

function detectTransactionType(text: string): "income" | "expense" {
  const lower = text.toLowerCase();

  const incomeWords = [
    "sueldo",
    "salario",
    "ingreso",
    "pago",
    "freelance",
    "venta",
    "comision",
    "comisión",
    "bono",
  ];

  return incomeWords.some((word) => lower.includes(word))
    ? "income"
    : "expense";
}

function cleanMoneyToken(token: string) {
  return token.replace(/[^\d]/g, "");
}

function isLikelyMoneyToken(token: string) {
  const cleanToken = cleanMoneyToken(token);

  if (!cleanToken) {
    return false;
  }

  const value = Number(cleanToken);

  return value >= 1000;
}

function isDueKeyword(token: string) {
  const cleanToken = token.toLowerCase();

  return (
    cleanToken === "vence" ||
    cleanToken === "vencimiento" ||
    cleanToken === "para"
  );
}

function getDueDateTokenCount(tokens: string[], startIndex: number) {
  const first = tokens[startIndex]?.toLowerCase();

  if (!first) {
    return 0;
  }

  if (first === "hoy" || first === "mañana" || first === "manana") {
    return 1;
  }

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(first)) {
    return 1;
  }

  if (/^\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?$/.test(first)) {
    return 1;
  }

  const second = tokens[startIndex + 1]?.toLowerCase();

  if (/^\d{1,2}$/.test(first) && second) {
    if (second === "de") {
      return tokens[startIndex + 2] ? 3 : 1;
    }

    return 2;
  }

  return 1;
}

function splitCompactQuickEntry(entry: string) {
  const tokens = entry.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return [];
  }

  const amountIndexes = tokens
    .map((token, index) => (isLikelyMoneyToken(token) ? index : -1))
    .filter((index) => index >= 0);

  if (amountIndexes.length <= 1) {
    return [entry.trim()];
  }

  const entries: string[] = [];
  let start = 0;
  let pointer = 0;

  while (pointer < amountIndexes.length) {
    const amountIndex = amountIndexes[pointer];

    if (amountIndex < start) {
      pointer += 1;
      continue;
    }

    let end = amountIndex;
    const nextToken = tokens[amountIndex + 1]?.toLowerCase();

    if (nextToken && isDueKeyword(nextToken)) {
      const dueTokens = getDueDateTokenCount(tokens, amountIndex + 2);
      end = amountIndex + 1 + dueTokens;
    } else if (
      nextToken === "fecha" &&
      tokens[amountIndex + 2]?.toLowerCase() === "limite"
    ) {
      const dueTokens = getDueDateTokenCount(tokens, amountIndex + 3);
      end = amountIndex + 2 + dueTokens;
    } else if (nextToken && !isLikelyMoneyToken(nextToken)) {
      end = amountIndex + 1;
    }

    const item = tokens.slice(start, end + 1).join(" ").trim();

    if (item) {
      entries.push(item);
    }

    start = end + 1;

    while (
      pointer < amountIndexes.length &&
      amountIndexes[pointer] <= end
    ) {
      pointer += 1;
    }
  }

  return entries.filter(Boolean);
}

function getQuickEntries(text: string) {
  return text
    .split(/\n|;/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => splitCompactQuickEntry(entry));
}

function parseQuickMovement(text: string) {
  const amountMatch = text.match(/(\d[\d.,]*)/);
  const amountText = amountMatch?.[1] ?? "";
  const amount = Number(amountText.replace(/[.,]/g, ""));

  const cleanName = text
    .replace(amountText, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    name: cleanName || "Movimiento rápido",
    amount,
    type: detectTransactionType(text),
    category: detectCategory(text),
  };
}

const spanishMonths: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isBillQuickText(text: string) {
  const lower = text.toLowerCase();

  return (
    lower.includes("vence") ||
    lower.includes("vencimiento") ||
    lower.includes("fecha limite") ||
    lower.includes("fecha límite")
  );
}

function parseDueDate(text: string) {
  const lower = text.toLowerCase();
  const today = new Date();

  if (lower.includes("hoy")) {
    return toDateInputValue(today);
  }

  if (lower.includes("mañana") || lower.includes("manana")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return toDateInputValue(tomorrow);
  }

  const isoMatch = lower.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const slashMatch = lower.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);

  if (slashMatch) {
    const [, day, month, yearText] = slashMatch;
    let year = today.getFullYear();

    if (yearText) {
      year = Number(yearText.length === 2 ? `20${yearText}` : yearText);
    }

    const parsedDate = new Date(year, Number(month) - 1, Number(day));

    if (!yearText && parsedDate < today) {
      parsedDate.setFullYear(parsedDate.getFullYear() + 1);
    }

    return toDateInputValue(parsedDate);
  }

  const monthMatch = lower.match(
    /(?:vence|vencimiento|para|el)\s+(?:el\s+)?(\d{1,2})(?:\s+de)?\s+([a-záéíóúñ]+)/,
  );

  if (monthMatch) {
    const [, dayText, monthText] = monthMatch;
    const month = spanishMonths[monthText];

    if (month === undefined) {
      return "";
    }

    const parsedDate = new Date(today.getFullYear(), month, Number(dayText));

    if (parsedDate < today) {
      parsedDate.setFullYear(parsedDate.getFullYear() + 1);
    }

    return toDateInputValue(parsedDate);
  }

  return "";
}

function parseQuickBill(text: string) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const markerIndex = tokens.findIndex((token, index) => {
    const lower = token.toLowerCase();

    return (
      isDueKeyword(lower) ||
      lower === "vencimiento" ||
      (lower === "fecha" &&
        tokens[index + 1]?.toLowerCase() === "limite")
    );
  });

  const amountIndexes = tokens
    .map((token, index) => (isLikelyMoneyToken(token) ? index : -1))
    .filter((index) => index >= 0);

  const validAmountIndexes =
    markerIndex >= 0
      ? amountIndexes.filter((index) => index < markerIndex)
      : amountIndexes;

  const amountIndex =
    validAmountIndexes.length > 0
      ? validAmountIndexes[validAmountIndexes.length - 1]
      : amountIndexes[0];

  const amountText = amountIndex !== undefined ? tokens[amountIndex] : "";
  const amount = Number(cleanMoneyToken(amountText));

  const previousAmountIndexes = amountIndexes.filter(
    (index) => index < amountIndex,
  );

  let nameTokens = tokens.slice(0, amountIndex);

  if (previousAmountIndexes.length > 0 && amountIndex > 0) {
    nameTokens = [tokens[amountIndex - 1]];
  }

  const name = nameTokens
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const lower = text.toLowerCase();

  return {
    name: name || "Vencimiento rápido",
    amount,
    category: detectCategory(text),
    dueDate: parseDueDate(text),
    isRecurring:
      lower.includes("mensual") ||
      lower.includes("recurrente") ||
      lower.includes("cada mes"),
  };
}

export default function SpaceDetailPage() {
  const params = useParams<{ id: string }>();
  const spaceId = params.id;
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<Tab>("summary");

  const [space, setSpace] = useState<Space | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [invitations, setInvitations] = useState<SpaceInvitation[]>([]);

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const [quickText, setQuickText] = useState("");

  const [manualName, setManualName] = useState("");
  const [manualType, setManualType] = useState<"income" | "expense">("expense");
  const [manualAmount, setManualAmount] = useState("");
  const [manualCategory, setManualCategory] = useState("");

  const [goalName, setGoalName] = useState("");
  const [goalCurrentAmount, setGoalCurrentAmount] = useState("");
  const [goalTargetAmount, setGoalTargetAmount] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingQuick, setIsSavingQuick] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [message, setMessage] = useState("");

  const isOwner = space?.created_by === userId;

  const loadData = useCallback(async () => {
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
    setUserEmail((user.email ?? "").toLowerCase());

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

    const { data: transactionsData, error: transactionsError } = await supabase
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

    const { data: billsData, error: billsError } = await supabase
      .from("bills")
      .select("*")
      .eq("space_id", spaceId)
      .order("due_date", { ascending: true });

    if (billsError) {
      setMessage(billsError.message);
      setIsLoading(false);
      return;
    }

    const { data: membersData } = await supabase
      .from("space_members")
      .select("*")
      .eq("space_id", spaceId);

    let invitationsData: SpaceInvitation[] = [];

    if (spaceData.created_by === user.id) {
      const { data } = await supabase
        .from("space_invitations")
        .select("*")
        .eq("space_id", spaceId)
        .order("created_at", { ascending: false });

      invitationsData = data ?? [];
    }

    setSpace(spaceData);
    setTransactions(transactionsData ?? []);
    setGoals(goalsData ?? []);
    setBills(billsData ?? []);
    setMembers(membersData ?? []);
    setInvitations(invitationsData);
    setIsLoading(false);
  }, [spaceId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const expenses = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const today = new Date().toISOString().slice(0, 10);

    const pendingBills = bills.filter((bill) => bill.status === "pending");
    const overdueBills = pendingBills.filter((bill) => bill.due_date < today);
    const nextBill = pendingBills[0];

    const pendingBillAmount = pendingBills.reduce(
      (sum, bill) => sum + Number(bill.amount),
      0,
    );

    return {
      income,
      expenses,
      available: income - expenses,
      goalsCount: goals.length,
      membersCount: Math.max(members.length, 1),
      pendingInvitations: invitations.filter((item) => item.status === "pending")
        .length,
      pendingBillsCount: pendingBills.length,
      overdueBillsCount: overdueBills.length,
      pendingBillAmount,
      nextBillName: nextBill?.name ?? "Sin pagos pendientes",
      nextBillAmount: nextBill ? Number(nextBill.amount) : 0,
    };
  }, [transactions, goals, members, invitations, bills]);

  const insights = useMemo<Insight[]>(() => {
    const items: Insight[] = [];

    const expenseByCategory = transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce<Record<string, number>>((acc, transaction) => {
        const category = transaction.category || "General";
        acc[category] = (acc[category] ?? 0) + Number(transaction.amount);
        return acc;
      }, {});

    const topExpenseCategory = Object.entries(expenseByCategory).sort(
      ([, amountA], [, amountB]) => amountB - amountA,
    )[0];

    const projectedAfterBills =
      summary.available - Number(summary.pendingBillAmount ?? 0);

    if (summary.overdueBillsCount > 0) {
      items.push({
        title: "Tienes vencimientos atrasados",
        description: `${summary.overdueBillsCount} pago(s) están fuera de fecha. Revisa la pestaña Vencimientos para ponerlos al día.`,
        tone: "warning",
      });
    }

    if (summary.pendingBillsCount > 0) {
      items.push({
        title: "Pagos pendientes del mapa",
        description: `Tienes ${summary.pendingBillsCount} vencimiento(s) pendiente(s) por ${moneyFormatter.format(
          summary.pendingBillAmount,
        )}.`,
        tone: "info",
      });
    }

    if (summary.nextBillAmount > 0) {
      items.push({
        title: "Próximo pago importante",
        description: `Tu próximo pago es ${summary.nextBillName} por ${moneyFormatter.format(
          summary.nextBillAmount,
        )}.`,
        tone: "info",
      });
    }

    if (summary.pendingBillAmount > 0) {
      items.push({
        title:
          projectedAfterBills >= 0
            ? "Puedes cubrir tus vencimientos"
            : "Tus vencimientos superan tu disponible",
        description:
          projectedAfterBills >= 0
            ? `Después de pagar vencimientos te quedarían aproximadamente ${moneyFormatter.format(
              projectedAfterBills,
            )}.`
            : `Después de pagar vencimientos quedarías en ${moneyFormatter.format(
              projectedAfterBills,
            )}. Conviene revisar gastos o priorizar pagos.`,
        tone: projectedAfterBills >= 0 ? "success" : "warning",
      });
    }

    if (topExpenseCategory) {
      const [category, amount] = topExpenseCategory;

      items.push({
        title: "Categoría con mayor gasto",
        description: `Tu mayor gasto registrado está en ${category}, con ${moneyFormatter.format(
          amount,
        )}.`,
        tone: "info",
      });
    }

    if (summary.available > 0 && summary.pendingBillsCount === 0) {
      items.push({
        title: "Buen margen disponible",
        description: `Tienes ${moneyFormatter.format(
          summary.available,
        )} disponibles y no hay vencimientos pendientes registrados.`,
        tone: "success",
      });
    }

    if (summary.goalsCount === 0) {
      items.push({
        title: "Aún no tienes metas en este mapa",
        description:
          "Crea una meta para que el mapa no solo registre gastos, sino que también te ayude a avanzar.",
        tone: "info",
      });
    }

    if (items.length === 0) {
      items.push({
        title: "Mapa financiero estable",
        description:
          "No hay alertas importantes por ahora. Sigue registrando movimientos para obtener mejores recomendaciones.",
        tone: "success",
      });
    }

    return items;
  }, [summary, transactions]);

  type Insight = {
    title: string;
    description: string;
    tone: "success" | "warning" | "info";
  };

  async function createTransaction(input: {
    name: string;
    type: "income" | "expense";
    amount: number;
    category: string;
  }) {
    if (!userId) {
      setMessage("No hay usuario activo.");
      return null;
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        space_id: spaceId,
        user_id: userId,
        type: input.type,
        name: input.name,
        amount: input.amount,
        category: input.category,
        date: new Date().toISOString().slice(0, 10),
        is_fixed: false,
        visibility: "shared",
      })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return null;
    }

    setTransactions((current) => [data, ...current]);
    return data;
  }

  async function createBill(input: {
    name: string;
    amount: number;
    category: string;
    dueDate: string;
    isRecurring: boolean;
  }) {
    if (!userId) {
      setMessage("No hay usuario activo.");
      return null;
    }

    const { data, error } = await supabase
      .from("bills")
      .insert({
        space_id: spaceId,
        user_id: userId,
        name: input.name,
        amount: input.amount,
        category: input.category,
        due_date: input.dueDate,
        status: "pending",
        is_recurring: input.isRecurring,
        notes: null,
      })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return null;
    }

    return data;
  }

  async function handleQuickSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const entries = getQuickEntries(quickText)

    if (entries.length === 0) {
      setMessage("Escribe al menos un movimiento o vencimiento.");
      return;
    }

    setIsSavingQuick(true);
    setMessage("");

    let movementCount = 0;
    let billCount = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      if (isBillQuickText(entry)) {
        const parsedBill = parseQuickBill(entry);

        if (parsedBill.amount <= 0 || !parsedBill.dueDate) {
          errors.push(`No pude leer el vencimiento: "${entry}"`);
          continue;
        }

        const result = await createBill(parsedBill);

        if (result) {
          billCount += 1;
        } else {
          errors.push(`No se pudo guardar el vencimiento: "${entry}"`);
        }

        continue;
      }

      const parsedMovement = parseQuickMovement(entry);

      if (parsedMovement.amount <= 0) {
        errors.push(`No pude leer el movimiento: "${entry}"`);
        continue;
      }

      const result = await createTransaction(parsedMovement);

      if (result) {
        movementCount += 1;
      } else {
        errors.push(`No se pudo guardar el movimiento: "${entry}"`);
      }
    }

    setIsSavingQuick(false);

    if (movementCount > 0 || billCount > 0) {
      setQuickText("");
    }

    const successParts = [];

    if (movementCount > 0) {
      successParts.push(`${movementCount} movimiento(s)`);
    }

    if (billCount > 0) {
      successParts.push(`${billCount} vencimiento(s)`);
    }

    if (errors.length > 0) {
      setMessage(
        `${successParts.length > 0 ? `Guardado: ${successParts.join(" y ")}. ` : ""}${errors.join(" | ")}`,
      );
      return;
    }

    setMessage(`Guardado: ${successParts.join(" y ")}.`);
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(manualAmount);

    if (!manualName.trim() || !manualCategory.trim() || amount <= 0) {
      setMessage("Completa correctamente el movimiento.");
      return;
    }

    setIsSavingManual(true);
    setMessage("");

    const result = await createTransaction({
      name: manualName,
      type: manualType,
      amount,
      category: manualCategory,
    });

    setIsSavingManual(false);

    if (!result) {
      return;
    }

    setManualName("");
    setManualType("expense");
    setManualAmount("");
    setManualCategory("");
    setMessage("Movimiento agregado al mapa.");
  }

  async function handleGoalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      setMessage("No hay usuario activo.");
      return;
    }

    const currentAmount = Number(goalCurrentAmount);
    const targetAmount = Number(goalTargetAmount);

    if (!goalName.trim() || currentAmount < 0 || targetAmount <= 0) {
      setMessage("Completa correctamente la meta.");
      return;
    }

    setIsSavingGoal(true);
    setMessage("");

    const { data, error } = await supabase
      .from("goals")
      .insert({
        space_id: spaceId,
        user_id: userId,
        name: goalName,
        current_amount: currentAmount,
        target_amount: targetAmount,
        target_date: goalTargetDate || null,
      })
      .select()
      .single();

    setIsSavingGoal(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setGoals((current) => [data, ...current]);
    setGoalName("");
    setGoalCurrentAmount("");
    setGoalTargetAmount("");
    setGoalTargetDate("");
    setMessage("Meta agregada al mapa.");
  }

  async function sendInvitation() {
    if (!space || !userId) {
      setMessage("No hay mapa o usuario activo.");
      return;
    }

    const email = inviteEmail.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      setMessage("Escribe un correo válido.");
      return;
    }

    if (email === userEmail) {
      setMessage("No puedes invitarte a ti mismo.");
      return;
    }

    setIsInviting(true);
    setMessage("");

    const { error } = await supabase.from("space_invitations").insert({
      space_id: space.id,
      space_name: space.name,
      invited_email: email,
      invited_by: userId,
      status: "pending",
    });

    setIsInviting(false);

    if (error) {
      if (error.message.includes("duplicate key")) {
        setMessage("Esa persona ya tiene una invitación para este mapa.");
        return;
      }

      setMessage(error.message);
      return;
    }

    setInviteEmail("");
    setMessage(`Invitación enviada a ${email}.`);
    await loadData();
  }

  return (
    <SimplePage
      title={space?.name ?? "Mapa financiero"}
      description={space?.description ?? "Centro de control financiero del mapa."}
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/spaces"
          className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          ← Volver a mapas
        </Link>

        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === tab.id
              ? "bg-emerald-400 text-slate-950"
              : "border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <section className="mb-6 rounded-3xl border border-white/10 bg-slate-900 p-4">
          <p className="text-sm text-slate-300">{message}</p>
        </section>
      )}

      {isLoading ? (
        <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-slate-400">Cargando mapa financiero...</p>
        </section>
      ) : (
        <div className="grid gap-6">
          {activeTab === "summary" && (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  title="Presupuesto"
                  value={moneyFormatter.format(Number(space?.monthly_budget ?? 0))}
                  detail="Monto base del mapa"
                />
                <SummaryCard
                  title="Ingresos"
                  value={moneyFormatter.format(summary.income)}
                  detail="Ingresos del mapa"
                />
                <SummaryCard
                  title="Gastos"
                  value={moneyFormatter.format(summary.expenses)}
                  detail="Gastos del mapa"
                />
                <SummaryCard
                  title="Disponible"
                  value={moneyFormatter.format(summary.available)}
                  detail="Ingresos menos gastos"
                  warning={summary.available < 0}
                />
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <SummaryCard
                  title="Metas"
                  value={String(summary.goalsCount)}
                  detail="Metas activas en este mapa"
                />
                <SummaryCard
                  title="Miembros"
                  value={String(summary.membersCount)}
                  detail="Personas dentro del mapa"
                />
                <SummaryCard
                  title="Invitaciones"
                  value={String(summary.pendingInvitations)}
                  detail="Pendientes por aceptar"
                />
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <SummaryCard
                  title="Vencimientos pendientes"
                  value={String(summary.pendingBillsCount)}
                  detail={moneyFormatter.format(summary.pendingBillAmount)}
                />
                <SummaryCard
                  title="Vencidos"
                  value={String(summary.overdueBillsCount)}
                  detail="Pagos fuera de fecha"
                  warning={summary.overdueBillsCount > 0}
                />
                <SummaryCard
                  title="Próximo pago"
                  value={summary.nextBillName}
                  detail={moneyFormatter.format(summary.nextBillAmount)}
                />
              </section>
              <FinancialInsights insights={insights} />
            </>
          )}

          {activeTab === "quick" && (
            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <form
                onSubmit={handleQuickSubmit}
                className="rounded-3xl border border-white/10 bg-slate-900 p-6"
              >
                <h2 className="text-2xl font-bold">Registro rápido</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Escribe un movimiento o vencimiento por línea. La app intenta
                  detectar monto, tipo, categoría y fecha.
                </p>

                <textarea
                  value={quickText}
                  onChange={(event) => setQuickText(event.target.value)}
                  placeholder={
                    "Ej: mercado 320000 alimentación\nEj: sueldo 4000000 ingreso\nEj: internet 120000 vence 30 junio\nEj: tarjeta 350000 vence mañana"
                  }
                  rows={6}
                  className="mt-6 w-full rounded-3xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                />

                <button
                  disabled={isSavingQuick}
                  className="mt-5 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                >
                  {isSavingQuick ? "Guardando..." : "Agregar al mapa"}
                </button>
              </form>

              <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
                <h2 className="text-2xl font-bold">Ejemplos</h2>

                <div className="mt-6 space-y-3 text-sm text-slate-300">
                  <p className="rounded-2xl bg-slate-950 p-4">
                    mercado 320000 alimentación
                  </p>
                  <p className="rounded-2xl bg-slate-950 p-4">
                    sueldo 4000000 ingreso
                  </p>
                  <p className="rounded-2xl bg-slate-950 p-4">
                    internet 120000 vence 30 junio
                  </p>
                  <p className="rounded-2xl bg-slate-950 p-4">
                    tarjeta 350000 vence mañana
                  </p>
                </div>
              </article>
            </section>
          )}

          {activeTab === "movements" && (
            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <form
                onSubmit={handleManualSubmit}
                className="rounded-3xl border border-white/10 bg-slate-900 p-6"
              >
                <h2 className="text-2xl font-bold">Nuevo movimiento</h2>

                <div className="mt-6 grid gap-4">
                  <input
                    value={manualName}
                    onChange={(event) => setManualName(event.target.value)}
                    placeholder="Nombre"
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                  />

                  <select
                    value={manualType}
                    onChange={(event) =>
                      setManualType(event.target.value as "income" | "expense")
                    }
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                  >
                    <option value="income">Ingreso</option>
                    <option value="expense">Gasto</option>
                  </select>

                  <input
                    value={manualAmount}
                    onChange={(event) => setManualAmount(event.target.value)}
                    type="number"
                    min="0"
                    placeholder="Monto"
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                  />

                  <input
                    value={manualCategory}
                    onChange={(event) => setManualCategory(event.target.value)}
                    placeholder="Categoría"
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </div>

                <button
                  disabled={isSavingManual}
                  className="mt-5 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                >
                  {isSavingManual ? "Guardando..." : "Guardar movimiento"}
                </button>
              </form>

              <ListCard title="Movimientos recientes">
                {transactions.length === 0 ? (
                  <EmptyText text="Este mapa todavía no tiene movimientos." />
                ) : (
                  transactions.map((transaction) => (
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
              </ListCard>
            </section>
          )}

          {activeTab === "bills" && (
            <BillsPanel spaceId={spaceId} userId={userId} />
          )}

          {activeTab === "goals" && (
            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <form
                onSubmit={handleGoalSubmit}
                className="rounded-3xl border border-white/10 bg-slate-900 p-6"
              >
                <h2 className="text-2xl font-bold">Nueva meta</h2>

                <div className="mt-6 grid gap-4">
                  <input
                    value={goalName}
                    onChange={(event) => setGoalName(event.target.value)}
                    placeholder="Nombre de la meta"
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                  />

                  <input
                    value={goalCurrentAmount}
                    onChange={(event) => setGoalCurrentAmount(event.target.value)}
                    type="number"
                    min="0"
                    placeholder="Monto actual"
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                  />

                  <input
                    value={goalTargetAmount}
                    onChange={(event) => setGoalTargetAmount(event.target.value)}
                    type="number"
                    min="0"
                    placeholder="Meta total"
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                  />

                  <input
                    value={goalTargetDate}
                    onChange={(event) => setGoalTargetDate(event.target.value)}
                    type="date"
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </div>

                <button
                  disabled={isSavingGoal}
                  className="mt-5 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                >
                  {isSavingGoal ? "Guardando..." : "Guardar meta"}
                </button>
              </form>

              <ListCard title="Metas del mapa">
                {goals.length === 0 ? (
                  <EmptyText text="Este mapa todavía no tiene metas." />
                ) : (
                  goals.map((goal) => {
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
              </ListCard>
            </section>
          )}

          {activeTab === "members" && (
            <section className="grid gap-6 xl:grid-cols-2">
              <ListCard title="Miembros">
                {members.length === 0 ? (
                  <EmptyText text="No se encontraron miembros adicionales." />
                ) : (
                  members.map((member) => (
                    <div
                      key={`${member.space_id}-${member.user_id}`}
                      className="rounded-2xl bg-slate-950 p-4"
                    >
                      <p className="font-semibold">
                        {member.role === "owner" ? "Dueño" : "Miembro"}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        {member.user_id}
                      </p>
                    </div>
                  ))
                )}
              </ListCard>

              {space?.type === "shared" && isOwner ? (
                <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
                  <h2 className="text-2xl font-bold">Invitar miembro</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Invita a otra persona para trabajar contigo en este mapa.
                  </p>

                  <div className="mt-6 flex flex-col gap-3">
                    <input
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      type="email"
                      placeholder="correo@ejemplo.com"
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                    />

                    <button
                      type="button"
                      onClick={sendInvitation}
                      disabled={isInviting}
                      className="rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                    >
                      {isInviting ? "Enviando..." : "Invitar"}
                    </button>
                  </div>

                  <div className="mt-6 space-y-3">
                    {invitations.length === 0 ? (
                      <EmptyText text="Aún no hay invitaciones para este mapa." />
                    ) : (
                      invitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="rounded-2xl bg-slate-950 p-4"
                        >
                          <p className="font-semibold">
                            {invitation.invited_email}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Estado: {invitation.status}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              ) : (
                <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
                  <h2 className="text-2xl font-bold">Invitaciones</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Solo el dueño del mapa puede invitar nuevos miembros.
                  </p>
                </article>
              )}
            </section>
          )}
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
        className={`mt-2 break-words text-3xl font-black leading-tight ${warning ? "text-red-300" : "text-white"
          }`}
      >
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-500">{detail}</p>
    </article>
  );
}

function ListCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
      <h2 className="text-2xl font-bold">{title}</h2>
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

function FinancialInsights({ insights }: { insights: Insight[] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
            Análisis
          </p>
          <h2 className="mt-2 text-2xl font-bold">Alertas inteligentes</h2>
        </div>

        <p className="text-sm text-slate-400">
          Lectura automática del estado financiero de este mapa.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {insights.map((insight) => (
          <article
            key={`${insight.title}-${insight.description}`}
            className={`rounded-3xl border p-5 ${insight.tone === "warning"
              ? "border-red-400/30 bg-red-400/10"
              : insight.tone === "success"
                ? "border-emerald-400/30 bg-emerald-400/10"
                : "border-white/10 bg-slate-950"
              }`}
          >
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${insight.tone === "warning"
                ? "bg-red-400/10 text-red-300"
                : insight.tone === "success"
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-sky-400/10 text-sky-300"
                }`}
            >
              {insight.tone === "warning"
                ? "Atención"
                : insight.tone === "success"
                  ? "Bien"
                  : "Dato"}
            </span>

            <h3 className="mt-4 text-lg font-bold">{insight.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {insight.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );

}