"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { api, ApiError } from "@/lib/apiClient";

interface FacturaDetalle {
  id: number;
  numero: string;
  tipo: string;
  estado: string;
  fecha_expedicion: string;
  base_imponible: number;
  cuota_iva: number;
  total: number;
  hash_actual: string;
  hash_anterior: string | null;
  hash_algoritmo: string;
  qr_data_url: string;
  cliente: { nombre: string; nif: string; direccion: string; email: string };
  negocio: { nombre: string; nif: string; direccion: string };
  lineas: Array<{ id: number; descripcion: string; cantidad: number; precio_unitario: number; iva_pct: number; importe_linea: number }>;
}

export default function FacturaDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [factura, setFactura] = useState<FacturaDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [anulando, setAnulando] = useState(false);

  function cargar() {
    api
      .obtenerFactura(Number(params.id))
      .then((data) => setFactura(data.factura))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error al cargar la factura"));
  }

  useEffect(cargar, [params.id]);

  async function handleAnular() {
    const motivo = prompt("Motivo de la anulacion (se emitira una factura rectificativa):");
    if (!motivo) return;
    setAnulando(true);
    try {
      const { rectificativa } = await api.anularFactura(Number(params.id), motivo);
      router.push(`/facturas/${rectificativa.id}`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Error al anular la factura");
    } finally {
      setAnulando(false);
    }
  }

  if (error) {
    return (
      <AppShell>
        <p className="text-red-600">{error}</p>
      </AppShell>
    );
  }

  if (!factura) {
    return (
      <AppShell>
        <p className="text-slate-500">Cargando...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
        <h1 className="text-xl font-semibold">Factura {factura.numero}</h1>
        <div className="flex gap-2">
          <a href={`/api/facturas/${factura.id}/exportar`} className="btn-secondary">Exportar JSON</a>
          <button onClick={() => window.print()} className="btn-secondary">Imprimir / PDF</button>
          {factura.tipo === "ORDINARIA" && factura.estado === "EMITIDA" && (
            <button onClick={handleAnular} disabled={anulando} className="btn-danger">
              {anulando ? "Anulando..." : "Anular factura"}
            </button>
          )}
        </div>
      </div>

      <div className="card p-6 print:shadow-none print:border-0">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div>
            <p className="font-bold text-lg">{factura.negocio.nombre}</p>
            <p className="text-sm text-slate-500">NIF {factura.negocio.nif}</p>
            <p className="text-sm text-slate-500">{factura.negocio.direccion}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Factura</p>
            <p className="text-xl font-bold">{factura.numero}</p>
            <p className="text-sm text-slate-500">{new Date(factura.fecha_expedicion).toLocaleString("es-ES")}</p>
            <p className={`text-sm font-semibold ${factura.estado === "ANULADA" ? "text-red-600" : "text-green-700"}`}>
              {factura.tipo === "RECTIFICATIVA" ? "RECTIFICATIVA" : "ORDINARIA"} &middot; {factura.estado}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-slate-600">Cliente</p>
          <p>{factura.cliente.nombre}</p>
          <p className="text-sm text-slate-500">NIF {factura.cliente.nif}</p>
          <p className="text-sm text-slate-500">{factura.cliente.direccion}</p>
        </div>

        <table className="table-base w-full mb-6">
          <thead>
            <tr>
              <th>Descripcion</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>IVA</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            {factura.lineas.map((l) => (
              <tr key={l.id}>
                <td>{l.descripcion}</td>
                <td>{l.cantidad}</td>
                <td>{l.precio_unitario.toFixed(2)} €</td>
                <td>{l.iva_pct}%</td>
                <td>{l.importe_linea.toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col sm:flex-row justify-between gap-6">
          <div className="text-right sm:text-left order-2 sm:order-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={factura.qr_data_url} alt="Codigo QR de verificacion (demo local)" width={140} height={140} />
            <p className="text-xs text-slate-400 max-w-[180px] mt-1">
              QR de verificacion simulado (demo local, no apunta a la AEAT real)
            </p>
          </div>
          <div className="text-right space-y-1 order-1 sm:order-2">
            <p className="text-sm text-slate-500">Base imponible: <span className="font-medium text-slate-800">{factura.base_imponible.toFixed(2)} €</span></p>
            <p className="text-sm text-slate-500">Cuota IVA: <span className="font-medium text-slate-800">{factura.cuota_iva.toFixed(2)} €</span></p>
            <p className="text-lg font-bold text-brand-800">Total: {factura.total.toFixed(2)} €</p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 break-all">
          <p><span className="font-semibold">Huella (SHA-256):</span> {factura.hash_actual}</p>
          <p><span className="font-semibold">Huella registro anterior:</span> {factura.hash_anterior ?? "(primer registro de la cadena)"}</p>
        </div>
      </div>
    </AppShell>
  );
}
