import SimplePage from "@/components/SimplePage";

const spaces = [
  {
    name: "Mi mapa personal",
    type: "Personal",
    amount: "$4.000.000",
    description: "Ingresos, gastos, metas y dinero disponible individual.",
  },
  {
    name: "Dairo y pareja",
    type: "Compartido",
    amount: "$2.500.000",
    description: "Aportes del hogar, gastos comunes y decisiones del mes.",
  },
];

export default function SpacesPage() {
  return (
    <SimplePage
      title="Mapas financieros"
      description="Crea espacios personales o compartidos para organizar el flujo de dinero de cada mes."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {spaces.map((space) => (
          <article
            key={space.name}
            className="rounded-3xl border border-white/10 bg-slate-900 p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{space.name}</h2>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                {space.type}
              </span>
            </div>

            <p className="mt-4 text-3xl font-black">{space.amount}</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {space.description}
            </p>
          </article>
        ))}
      </div>
    </SimplePage>
  );
}
