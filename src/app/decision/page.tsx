import SimplePage from "@/components/SimplePage";

const decisionItems = [
  { name: "Fondo de emergencia", amount: "$400.000" },
  { name: "Inversión", amount: "$300.000" },
  { name: "Viaje", amount: "$300.000" },
  { name: "Libre", amount: "$300.000" },
];

export default function DecisionPage() {
  return (
    <SimplePage
      title="Decisión del mes"
      description="Distribuye el dinero disponible entre ahorro, inversión, metas, deudas o dinero libre."
    >
      <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6">
        <p className="text-sm font-semibold text-emerald-300">
          Disponible para decidir
        </p>
        <p className="mt-2 text-5xl font-black">$1.300.000</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {decisionItems.map((item) => (
          <article
            key={item.name}
            className="rounded-3xl border border-white/10 bg-slate-900 p-6"
          >
            <p className="text-sm text-slate-400">{item.name}</p>
            <p className="mt-2 text-3xl font-bold">{item.amount}</p>
          </article>
        ))}
      </div>
    </SimplePage>
  );
}
