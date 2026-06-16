import SimplePage from "@/components/SimplePage";

type InsightTone = "success" | "warning" | "info";

type Insight = {
  id: string;
  title: string;
  description: string;
  value: string;
  tone: InsightTone;
};

type Recommendation = {
  id: string;
  title: string;
  description: string;
  impact: string;
};

const insights: Insight[] = [
  {
    id: "1",
    title: "Domicilios subieron",
    description: "Gastaste más en domicilios que el mes pasado.",
    value: "+23%",
    tone: "warning",
  },
  {
    id: "2",
    title: "Gastos hormiga",
    description: "Pequeños gastos acumulados durante el mes.",
    value: "$410.000",
    tone: "warning",
  },
  {
    id: "3",
    title: "Ahorro posible",
    description: "Puedes mejorar tu ahorro si reduces gastos variables.",
    value: "$300k - $450k",
    tone: "success",
  },
  {
    id: "4",
    title: "Pagos próximos",
    description: "Tienes pagos del mes cerca de vencerse.",
    value: "2",
    tone: "info",
  },
];

const recommendations: Recommendation[] = [
  {
    id: "1",
    title: "Reduce domicilios esta semana",
    description:
      "Tus domicilios están por encima de lo habitual. Bajar la frecuencia puede liberar dinero para tus metas.",
    impact: "Ahorro estimado: $150.000",
  },
  {
    id: "2",
    title: "Prioriza los pagos vencidos",
    description:
      "Los pagos vencidos siguen afectando tu disponible proyectado hasta que los marques como pagados, pospuestos u omitidos.",
    impact: "Evita desorden financiero",
  },
  {
    id: "3",
    title: "Ajusta ocio y compras pequeñas",
    description:
      "Tus gastos variables pueden reducirse sin afectar tus pagos fijos principales.",
    impact: "Mejora tu margen mensual",
  },
];

const questions = [
  "¿En qué estoy gastando más?",
  "¿Cuánto puedo ahorrar este mes?",
  "¿Qué pagos tengo pendientes?",
  "¿Puedo comprar algo de $500.000?",
  "¿Qué gasto debería reducir?",
  "¿Cómo voy frente al mes pasado?",
];

export default function AssistantPage() {
  return (
    <SimplePage
      title="Asistente IA"
      description="Analiza tus movimientos, pagos, presupuesto y metas para ayudarte a tomar mejores decisiones financieras."
    >
      <div className="grid gap-6">
        <section className="rounded-3xl border border-violet-400/30 bg-violet-400/10 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
            Tu guía financiera
          </p>

          <h2 className="mt-3 text-3xl font-black">
            Hola, aquí tienes el análisis de tu dinero.
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Esta pantalla será el cerebro de la app. La IA no solo responderá
            preguntas: también analizará tus hábitos, pagos pendientes, gastos
            hormiga, metas y capacidad real de ahorro.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Recomendaciones para ti</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Acciones concretas para mejorar este mes.
                </p>
              </div>

              <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-300">
                Concepto V1
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {recommendations.map((recommendation) => (
                <div
                  key={recommendation.id}
                  className="rounded-3xl border border-white/10 bg-slate-950 p-5"
                >
                  <h3 className="text-lg font-bold">{recommendation.title}</h3>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {recommendation.description}
                  </p>

                  <p className="mt-4 rounded-2xl bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-300">
                    {recommendation.impact}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-2xl font-bold">Pregúntale a la IA</h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Más adelante el usuario podrá hacer preguntas sobre su dinero en
              lenguaje natural.
            </p>

            <div className="mt-6 space-y-3">
              {questions.map((question) => (
                <button
                  key={question}
                  type="button"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  {question}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950 p-4">
              <p className="text-sm font-semibold text-white">
                Próxima fase
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Conectar esta pantalla a datos reales de movimientos, pagos del
                mes, metas y presupuesto para generar análisis personalizados.
              </p>
            </div>
          </article>
        </section>
      </div>
    </SimplePage>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const toneClass =
    insight.tone === "success"
      ? "text-emerald-300 bg-emerald-400/10 border-emerald-400/30"
      : insight.tone === "warning"
        ? "text-yellow-200 bg-yellow-400/10 border-yellow-400/30"
        : "text-sky-300 bg-sky-400/10 border-sky-400/30";

  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">{insight.title}</p>

      <p className="mt-2 text-3xl font-black">{insight.value}</p>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {insight.description}
      </p>

      <span
        className={`mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}
      >
        Insight IA
      </span>
    </article>
  );
}
