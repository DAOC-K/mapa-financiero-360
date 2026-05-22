import SimplePage from "@/components/SimplePage";

const goals = [
  { name: "Fondo de emergencia", current: "$1.200.000", target: "$5.000.000", progress: "24%" },
  { name: "Viaje", current: "$800.000", target: "$4.000.000", progress: "20%" },
  { name: "Inversión mensual", current: "$800.000", target: "$1.000.000", progress: "80%" },
];

export default function GoalsPage() {
  return (
    <SimplePage
      title="Metas"
      description="Crea metas personales o compartidas y revisa cuánto falta para cumplirlas."
    >
      <div className="space-y-4">
        {goals.map((goal) => (
          <article
            key={goal.name}
            className="rounded-3xl border border-white/10 bg-slate-900 p-6"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold">{goal.name}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {goal.current} de {goal.target}
                </p>
              </div>

              <span className="text-2xl font-black text-emerald-300">
                {goal.progress}
              </span>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: goal.progress }}
              />
            </div>
          </article>
        ))}
      </div>
    </SimplePage>
  );
}
