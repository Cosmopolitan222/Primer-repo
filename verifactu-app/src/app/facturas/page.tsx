"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/apiClient";

interface Factura {
  id: number;
  numero: string;
  tipo: string;
  fecha_expedicion: string;
  cliente_nombre: string;
  total: number;
  estado: string;
}

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    api.listarFacturas().then((data) => setFacturas(data.facturas));
  }, []);

  const visibles = facturas.filter((f) =>
    `${f.numero} ${f.cliente_nombre}`.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold">Historico de facturas</h1>
        <div className="flex gap-2">
          <a href="/api/facturas/exportar-csv" className="btn-secondary">Exportar CSV</a>
          <Link href="/facturas/nueva" className="btn-primary">+ Nueva factura</Link>
        </div>
      </div>

      <input
        className="input mb-4 max-w-sm"
        placeholder="Buscar por numero o cliente..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Numero</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => (
              <tr key={f.id}>
                <td>
                  <Link href={`/facturas/${f.id}`} className="text-brand-600 hover:underline">{f.numero}</Link>
                </td>
                <td>{f.tipo === "RECTIFICATIVA" ? "Rectificativa" : "Ordinaria"}</td>
                <td>{new Date(f.fecha_expedicion).toLocaleString("es-ES")}</td>
                <td>{f.cliente_nombre}</td>
                <td>{f.total.toFixed(2)} €</td>
                <td>
                  <span className={f.estado === "ANULADA" ? "text-red-600" : "text-green-700"}>{f.estado}</span>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr><td colSpan={6} className="text-center text-slate-400 py-6">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
