"use client";

import SimplePage from "@/components/SimplePage";

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const flowData = {
  income: 4000000,
  fixedExpenses: 1800000,
  variableExpenses: 900000,
  savings: 400000,
  investments: 300000,
  goals: 300000,
  free: 300000,
};

const nodes = [
  {
    title: "Gastos fijos",
    amount: flowData.fixedExpenses,
    description: "Arriendo, servicios, obligaciones mensuales.",
  },
  {
    title: "Gastos variables",
    amount: flowData.variableExpenses,
    description: "Mercado, transporte, comida y otros consumos.",
  },
  {
    title: "Ahorro",
    amount: flowData.savings,
    description: "Fondo de emergencia o reserva mensual.",
  },
  {
    title: "Inversión",
    amount: flowData.investments,
    description: "Aportes a portafolio, Hapi, ETFs u otros activos.",
  },
  {
    title: "Metas",
    amount: flowData.goals,
    description: "Viaje, computador, casa, moto o metas compartidas.",
  },
  {
    title: "Libre",
    amount: flowData.free,
    description: "Dinero sin asignar o para uso flexible.",
  },
];

export default function MapPage() {
  const assigned = nodes.reduce((sum, item) => sum + item.amount, 0);
  const difference = flowData.income - assigned;

  return (
    <SimplePage
      title="Mapa financiero visual"
      description="Visualiza cómo fluye el dinero del mes desde tus ingresos hacia gastos, ahorro, inversión, metas y dinero libre."
    >
      <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Ingresos"
            value={moneyFormatter.format(flowData.income)}
          />
          <SummaryCard
            title="Asignado"
            value={moneyFormatter.format(assigned)}
          />
          <SummaryCard
            title="Diferencia"
            value={moneyFormatter.format(difference)}
            warning={difference < 0}
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
              {moneyFormatter.format(flowData.income)}
            </p>
          </div>

          <div className="h-12 w-px bg-white/20" />

          <div className="h-px w-full max-w-4xl bg-white/20" />

          <div className="grid w-full gap-4 pt-8 md:grid-cols-2 xl:grid-cols-3">
            {nodes.map((node) => {
              const percentage = Math.round((node.amount / flowData.income) * 100);

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
            Este mapa permite entender hacia dónde se va el dinero del mes.
            Más adelante esta vista se alimentará automáticamente con los
            movimientos reales registrados por el usuario.
          </p>
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Siguiente mejora</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Después conectaremos este mapa con ingresos, gastos, metas y decisión
            del mes para que los nodos cambien solos.
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
