import SimplePage from "@/components/SimplePage";

export default function SettingsPage() {
  return (
    <SimplePage
      title="Configuración"
      description="Define preferencias del producto, privacidad y comportamiento de los mapas financieros."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Privacidad</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Define qué información será privada, compartida parcialmente o visible en el mapa común.
          </p>
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Moneda</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Configura pesos colombianos, dólares u otras monedas para futuros módulos.
          </p>
        </article>
      </div>
    </SimplePage>
  );
}
