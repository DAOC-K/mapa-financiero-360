import SimplePage from "@/components/SimplePage";

type PaymentStatus = "pending" | "overdue" | "paid";

type PaymentItem = {
  id: string;
  name: string;
  amount: number;
  category: string;
  dueLabel: string;
  typeLabel: string;
  status: PaymentStatus;
  progress?: string;
  note?: string;
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const payments: PaymentItem[] = [
  {
    id: "1",
    name: "Internet hogar",
    amount: 120000,
    category: "Servicios",
    dueLabel: "Vence el 30",
    typeLabel: "Recurrente mensual",
    status: "pending",
    note: "Este pago se repetirá el próximo mes.",
  },
  {
    id: "2",
    name: "Deuda con mamá",
    amount: 150000,
    category: "Deudas",
    dueLabel: "Cuota de este mes",
    typeLabel: "Temporal",
    status: "pending",
    progress: "Cuota 1 de 2",
    note: "Total deuda: $300.000. Falta por pagar: $300.000.",
  },
  {
    id: "3",
    name: "Energía",
    amount: 180000,
    category: "Servicios",
    dueLabel: "Vencido hace 2 días",
    typeLabel: "Recurrente mensual",
    status: "overdue",
    note: "Sigue descontando del disponible proyectado.",
  },
  {
    id: "4",
    name: "Tigo Emily",
    amount: 85000,
    category: "Celular",
    dueLabel: "Pagado",
    typeLabel: "Recurrente mensual",
    status: "paid",
  },
];

const pendingTotal = payments
  .filter((payment) => payment.status === "pending")
  .reduce((sum, payment) => sum + payment.amount, 0);

const overdueTotal = payments
  .filter((payment) => payment.status === "overdue")
  .reduce((sum, payment) => sum + payment.amount, 0);

const paidTotal = payments
  .filter((payment) => payment.status === "paid")
  .reduce((sum, payment) => sum + payment.amount, 0);

const projectedAvailable = 2000000 - pendingTotal - overdueTotal;

export default function PaymentsPage() {
  return (
    <SimplePage
      title="Pagos del mes"
      description="Controla tus pagos fijos, deudas temporales, cuotas, vencidos y pagados sin perder de vista cuánto te queda disponible."
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Pendiente"
            value={moneyFormatter.format(pendingTotal)}
            detail="Pagos por realizar este mes"
          />

          <SummaryCard
            title="Vencido"
            value={moneyFormatter.format(overdueTotal)}
            detail="No se marcaron como pagados"
            danger={overdueTotal > 0}
          />

          <SummaryCard
            title="Pagado"
            value={moneyFormatter.format(paidTotal)}
            detail="Pagos confirmados"
          />

          <SummaryCard
            title="Después de pagos"
            value={moneyFormatter.format(projectedAvailable)}
            detail="Disponible estimado"
            danger={projectedAvailable < 0}
          />
        </section>

        <section className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
            IA financiera
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            Tienes {moneyFormatter.format(pendingTotal + overdueTotal)} por cubrir.
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Los pagos pendientes y vencidos siguen descontando de tu disponible
            proyectado hasta que los marques como pagados, los pospongas, los
            edites o los omitas este mes.
          </p>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-2xl font-bold">Agregar pago rápido</h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Más adelante este campo usará IA para detectar valor, cuotas,
              fechas y tipo de pago desde texto natural.
            </p>

            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Ejemplos</p>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p className="rounded-2xl bg-slate-900 p-3">
                  Internet 120k vence el 30
                </p>
                <p className="rounded-2xl bg-slate-900 p-3">
                  Mamá 300mil en 2 cuotas
                </p>
                <p className="rounded-2xl bg-slate-900 p-3">
                  Administración 250k mensual
                </p>
              </div>
            </div>

            <button
              type="button"
              className="mt-6 w-full rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Próximamente: crear con IA
            </button>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Lista del mes</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Recurrentes, temporales, vencidos y pagados.
                </p>
              </div>

              <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-300">
                Concepto V1
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {payments.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
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
  danger = false,
}: {
  title: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">{title}</p>

      <p
        className={`mt-2 text-3xl font-black ${
          danger ? "text-red-300" : "text-white"
        }`}
      >
        {value}
      </p>

      <p className="mt-3 text-sm leading-6 text-slate-500">{detail}</p>
    </article>
  );
}

function PaymentCard({ payment }: { payment: PaymentItem }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{payment.name}</h3>
            <StatusBadge status={payment.status} />
          </div>

          <p className="mt-2 text-sm text-slate-400">
            {payment.category} · {payment.typeLabel}
          </p>

          {payment.progress && (
            <p className="mt-2 text-sm font-semibold text-emerald-300">
              {payment.progress}
            </p>
          )}

          <p className="mt-2 text-sm text-slate-500">{payment.dueLabel}</p>

          {payment.note && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              {payment.note}
            </p>
          )}
        </div>

        <p className="text-2xl font-black">
          {moneyFormatter.format(payment.amount)}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300">
          Marcar pagado
        </button>

        <button className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">
          Posponer
        </button>

        <button className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">
          Editar
        </button>

        <button className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">
          Omitir este mes
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

  return (
    <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-200">
      Pendiente
    </span>
  );
}
