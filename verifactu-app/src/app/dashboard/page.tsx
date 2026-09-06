"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/apiClient";

interface Factura {
  id: number;
  numero: string;
  total: number;
  estado: string;
  cliente_nombre: string;
  fecha_expedicion: string;
}

export default function DashboardPage() {
  const [clientes, setClientes] = useState(0);
  const [productos, setProductos] = useState(0);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cadenaIntegra, setCadenaIntegra] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listarClientes(), api.listarProductos(), api.listarFacturas(), api.verificarCadena()])
      .then(([c, p, f, cadena]) => {
        setClientes(c.clientes.length);
        setProductos(p.productos.length);
        setFacturas(f.facturas);
        setCadenaIntegra(cadena.resultado.cadenaIntegra);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error cargando el panel"));
  }, []);

  const facturasCobradas = facturas.filter((f) => f.estado === "PAGADA");
  const facturasPendientes = facturas.filter((f) => f.estado === "EMITIDA");
  const totalCobrado = facturasCobradas.reduce((acc, f) => acc + f.total, 0);
  const totalPendiente = facturasPendientes.reduce((acc, f) => acc + f.total, 0);

  return (
    <AppShell>
      <h1 className="text-xl font-semibold mb-4">Panel general</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Metric label="Clientes" value={clientes} href="/clientes" />
        <Metric label="Productos/servicios" value={productos} href="/productos" />
        <Metric label="Facturas emitidas" value={facturas.length} href="/facturas" />
        <div className="card p-4">
          <p className="text-sm text-slate-500">Cadena de integridad</p>
          <p className={`text-lg font-bold ${cadenaIntegra === false ? "text-red-600" : "text-brand-700"}`}>
            {cadenaIntegra === null ? "..." : cadenaIntegra ? "Integra" : "Rota"}
          </p>
          <Link href="/cadena" className="text-xs text-brand-600 underline">Ver detalle</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-slate-500">Pendiente de cobro ({facturasPendientes.length} facturas)</p>
          <p className="text-2xl font-bold text-amber-600">{totalPendiente.toFixed(2)} €</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">Cobrado ({facturasCobradas.length} facturas)</p>
          <p className="text-2xl font-bold text-green-700">{totalCobrado.toFixed(2)} €</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Link href="/facturas/nueva" className="btn-primary">+ Nueva factura</Link>
        <Link href="/clientes" className="btn-secondary">Gestionar clientes</Link>
        <Link href="/productos" className="btn-secondary">Gestionar productos/servicios</Link>
      </div>

      <h2 className="text-lg font-semibold mb-2">Ultimas facturas</h2>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Numero</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {facturas.slice(0, 8).map((f) => (
              <tr key={f.id}>
                <td>
                  <Link href={`/facturas/${f.id}`} className="text-brand-600 hover:underline">{f.numero}</Link>
                </td>
                <td>{new Date(f.fecha_expedicion).toLocaleString("es-ES")}</td>
                <td>{f.cliente_nombre}</td>
                <td>{f.total.toFixed(2)} €</td>
                <td>
                  <span className={colorEstado(f.estado)}>{f.estado}</span>
                </td>
              </tr>
            ))}
            {facturas.length === 0 && (
              <tr><td colSpan={5} className="text-center text-slate-400 py-6">Todavia no hay facturas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function colorEstado(estado: string): string {
  if (estado === "ANULADA") return "text-red-600";
  if (estado === "PAGADA") return "text-green-700";
  return "text-amber-600";
}

function Metric({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="card p-4 block hover:border-brand-400 transition-colors">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-brand-800">{value}</p>
    </Link>
  );
}
