"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/apiClient";

interface Evento {
  id: number;
  tipo: string;
  entidad: string | null;
  entidad_id: number | null;
  usuario_id: number | null;
  detalle: string;
  hash_actual: string;
  hash_anterior: string | null;
  created_at: string;
}

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);

  useEffect(() => {
    api.listarEventos().then((data) => setEventos(data.eventos));
  }, []);

  return (
    <AppShell>
      <h1 className="text-xl font-semibold mb-2">Registro interno de eventos</h1>
      <p className="text-sm text-slate-500 mb-4">
        Traza de todas las acciones relevantes del sistema (accesos, altas, emisiones, anulaciones y
        exportaciones), encadenada igual que las facturas para que cualquier alteracion sea detectable.
      </p>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Entidad</th>
              <th>Detalle</th>
              <th>Huella</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap">{new Date(e.created_at).toLocaleString("es-ES")}</td>
                <td>{e.tipo}</td>
                <td>{e.entidad ? `${e.entidad} #${e.entidad_id}` : "-"}</td>
                <td className="max-w-xs truncate text-xs text-slate-500">{e.detalle}</td>
                <td className="font-mono text-xs">{e.hash_actual.slice(0, 10)}...</td>
              </tr>
            ))}
            {eventos.length === 0 && (
              <tr><td colSpan={5} className="text-center text-slate-400 py-6">Sin eventos todavia</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
