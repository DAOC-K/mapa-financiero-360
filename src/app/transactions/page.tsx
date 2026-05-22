import SimplePage from "@/components/SimplePage";

const transactions = [
  { name: "Salario", type: "Ingreso", amount: "$4.000.000", category: "Trabajo" },
  { name: "Arriendo", type: "Gasto", amount: "$1.200.000", category: "Hogar" },
  { name: "Mercado", type: "Gasto", amount: "$600.000", category: "Alimentación" },
  { name: "Inversión mensual", type: "Gasto", amount: "$800.000", category: "Inversión" },
];

export default function TransactionsPage() {
  return (
    <SimplePage
      title="Movimientos"
      description="Registra ingresos y gastos manualmente para construir tu mapa financiero."
    >
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-4">Nombre</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Categoría</th>
              <th className="p-4 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((item) => (
              <tr key={item.name} className="border-t border-white/10">
                <td className="p-4 font-semibold">{item.name}</td>
                <td className="p-4 text-slate-300">{item.type}</td>
                <td className="p-4 text-slate-300">{item.category}</td>
                <td className="p-4 text-right font-bold">{item.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SimplePage>
  );
}
