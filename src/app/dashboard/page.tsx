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

const mapItems = [
  "Gastos fijos",
  "Gastos variables",
  "Ahorro",
  "Metas",
  "Disponible",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
        <nav className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              Mapa Financiero 360
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              Panel financiero personal y compartido
            </h1>
          </div>

          <button className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300">
            Crear mapa
          </button>
        </nav>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
            <p className="text-sm font-medium text-slate-400">
              Resumen del mes
            </p>

            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-4xl font-bold">
                  Toma mejores decisiones con tu dinero
                </h2>
                <p className="mt-3 max-w-2xl text-slate-300">
                  Visualiza ingresos, gastos, metas y aportes compartidos en un
                  solo mapa financiero. Ideal para personas, parejas o grupos
                  que quieren organizar el mes con claridad.
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-400 p-5 text-slate-950">
                <p className="text-sm font-semibold">Salud financiera</p>
                <p className="mt-1 text-4xl font-black">78/100</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-slate-900 p-5"
                >
                  <p className="text-sm text-slate-400">{item.title}</p>
                  <p className="mt-2 text-2xl font-bold">{item.value}</p>
                  <p className="mt-2 text-sm text-slate-500">{item.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="text-sm font-medium text-slate-400">
              Mapa compartido
            </p>
            <h3 className="mt-2 text-2xl font-bold">Dairo y pareja</h3>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-slate-900 p-5">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Aporte Dairo</span>
                  <span>60%</span>
                </div>
                <p className="mt-1 text-xl font-semibold">$1.500.000</p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-5">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Aporte pareja</span>
                  <span>40%</span>
                </div>
                <p className="mt-1 text-xl font-semibold">$1.000.000</p>
              </div>

              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-5">
                <p className="text-sm text-emerald-300">Total compartido</p>
                <p className="mt-1 text-3xl font-bold">$2.500.000</p>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="text-sm font-medium text-slate-400">
              Decisión del mes
            </p>
            <h3 className="mt-2 text-2xl font-bold">
              ¿Qué hacemos con el disponible?
            </h3>

            <div className="mt-6 space-y-3">
              <DecisionItem label="Fondo de emergencia" amount="$400.000" />
              <DecisionItem label="Inversión" amount="$300.000" />
              <DecisionItem label="Viaje" amount="$300.000" />
              <DecisionItem label="Libre" amount="$300.000" />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="text-sm font-medium text-slate-400">
              Mapa financiero visual
            </p>
            <h3 className="mt-2 text-2xl font-bold">
              Así fluye tu dinero este mes
            </h3>

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
                    className="rounded-2xl border border-white/10 bg-slate-900 p-4 text-center text-sm font-semibold"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function DecisionItem({
  label,
  amount,
}: {
  label: string;
  amount: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-900 p-4">
      <span className="text-slate-300">{label}</span>
      <span className="font-bold text-emerald-300">{amount}</span>
    </div>
  );
}