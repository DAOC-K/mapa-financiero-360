import SimplePage from "@/components/SimplePage";

const stats = [
  {
    title: "Ingresos del mes",
    value: "$4.000.000",
    detail: "Salario, freelance y otros ingresos",
  },
  {
    title: "Gastos del mes",
    value: "$2.700.000",
    detail: "Fijos y variables registrados",
  },
  {
    title: "Disponible",
    value: "$1.300.000",
    detail: "Dinero libre para decidir",
  },
  {
    title: "Metas activas",
    value: "3",
    detail: "Viaje, emergencia e inversión",
  },
];

const decisions = [
  { label: "Fondo de emergencia", amount: "$400.000" },
  { label: "Inversión", amount: "$300.000" },
  { label: "Viaje", amount: "$300.000" },
  { label: "Libre", amount: "$300.000" },
];

const mapItems = [
  "Gastos fijos",
  "Gastos variables",
  "Ahorro",
  "Metas",
  "Disponible",
];

export default function DashboardPage() {
  return (
    <SimplePage
      title="Dashboard"
      description="Resumen general de tus ingresos, gastos, metas, aportes y decisiones del mes."
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-white/10 bg-slate-900 p-6"
            >
              <p className="text-sm text-slate-400">{item.title}</p>
              <p className="mt-2 text-3xl font-black">{item.value}</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {item.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <p className="text-sm font-medium text-slate-400">
              Mapa compartido
            </p>
            <h2 className="mt-2 text-2xl font-bold">Dairo y pareja</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-950 p-5">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Aporte Dairo</span>
                  <span>60%</span>
                </div>
                <p className="mt-2 text-xl font-bold">$1.500.000</p>
              </div>

              <div className="rounded-2xl bg-slate-950 p-5">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Aporte pareja</span>
                  <span>40%</span>
                </div>
                <p className="mt-2 text-xl font-bold">$1.000.000</p>
              </div>

              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-5">
                <p className="text-sm text-emerald-300">Total compartido</p>
                <p className="mt-2 text-xl font-bold">$2.500.000</p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <p className="text-sm font-medium text-slate-400">
              Salud financiera
            </p>
            <div className="mt-4 rounded-3xl bg-emerald-400 p-6 text-slate-950">
              <p className="text-sm font-semibold">Puntaje estimado</p>
              <p className="mt-1 text-5xl font-black">78/100</p>
              <p className="mt-3 text-sm font-medium">
                Buen balance entre ingresos, gastos, metas y dinero disponible.
              </p>
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <p className="text-sm font-medium text-slate-400">
              Decisión del mes
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              ¿Qué hacemos con el disponible?
            </h2>

            <div className="mt-6 space-y-3">
              {decisions.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl bg-slate-950 p-4"
                >
                  <span className="text-slate-300">{item.label}</span>
                  <span className="font-bold text-emerald-300">
                    {item.amount}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <p className="text-sm font-medium text-slate-400">
              Mapa financiero visual
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Así fluye tu dinero este mes
            </h2>

            <div className="mt-8 flex flex-col items-center gap-4">
              <div className="rounded-2xl bg-emerald-400 px-8 py-4 text-center font-bold text-slate-950">
                Ingresos
                <p className="text-sm font-medium">$4.000.000</p>
              </div>

              <div className="h-8 w-px bg-white/20" />

              <div className="grid w-full gap-4 md:grid-cols-5">
                {mapItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-slate-950 p-4 text-center text-sm font-semibold"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>
      </div>
    </SimplePage>
  );
}
