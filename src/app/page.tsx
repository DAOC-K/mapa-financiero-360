import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">
          Mapa Financiero 360
        </p>

        <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
          Mapea tu dinero y toma mejores decisiones cada mes
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-300">
          Una web app para organizar ingresos, gastos, metas, aportes
          compartidos y decisiones financieras mensuales. Diseñada para personas,
          parejas o grupos que quieren ver con claridad hacia dónde va su dinero.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-emerald-400 px-8 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Crear cuenta gratis
          </Link>

          <Link
            href="/login"
            className="rounded-full border border-white/20 px-8 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            Iniciar sesión
          </Link>
        </div>

        <div className="mt-16 grid w-full gap-4 md:grid-cols-3">
          <FeatureCard
            title="Mapa personal"
            description="Organiza tus ingresos, gastos, metas y dinero disponible en un solo lugar."
          />
          <FeatureCard
            title="Mapa compartido"
            description="Crea espacios financieros para pareja, hogar o grupo, manteniendo claridad sobre aportes y gastos."
          />
          <FeatureCard
            title="Decisión del mes"
            description="Distribuye el dinero disponible entre ahorro, inversión, deudas, metas o dinero libre."
          />
        </div>

        <div className="mt-10 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
          <p className="text-sm font-semibold text-emerald-300">
            MVP activo con Supabase
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Login, registro, mapas, movimientos, metas, decisiones y dashboard
            ya conectados a base de datos.
          </p>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </article>
  );
}
