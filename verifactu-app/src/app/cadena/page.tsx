"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/apiClient";

interface Eslabon {
  id: number;
  numero: string;
  huellaAlmacenada: string;
  huellaRecalculada: string;
  enlaceAnteriorValido: boolean;
  huellaValida: boolean;
}

interface Resultado {
  totalRegistros: number;
  cadenaIntegra: boolean;
  eslabones: Eslabon[];
  primerFalloId: number | null;
}

function corto(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

export default function CadenaPage() {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [cargando, setCargando] = useState(false);

  function verificar() {
    setCargando(true);
    api
      .verificarCadena()
      .then((data) => setResultado(data.resultado))
      .finally(() => setCargando(false));
  }

  useEffect(verificar, []);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Cadena de integridad de facturas</h1>
        <button className="btn-secondary" onClick={verificar} disabled={cargando}>
          {cargando ? "Verificando..." : "Verificar de nuevo"}
        </button>
      </div>

      <p className="text-sm text-slate-500 mb-4">
        Cada factura incluye la huella (hash SHA-256) del registro anterior, formando una cadena inalterable:
        si alguien modificara un registro ya emitido, su huella recalculada dejaria de coincidir con la
        almacenada y la cadena se rompe visiblemente a partir de ese punto.
      </p>

      {resultado && (
        <div className={`card p-4 mb-6 ${resultado.cadenaIntegra ? "border-green-300" : "border-red-400"}`}>
          <p className={`text-lg font-bold ${resultado.cadenaIntegra ? "text-green-700" : "text-red-600"}`}>
            {resultado.cadenaIntegra ? "Cadena integra" : "Se ha detectado una rotura en la cadena"}
          </p>
          <p className="text-sm text-slate-500">{resultado.totalRegistros} registros verificados.</p>
          {!resultado.cadenaIntegra && (
            <p className="text-sm text-red-600">Primer registro afectado: id {resultado.primerFalloId}</p>
          )}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>#</th>
              <th>Numero</th>
              <th>Huella almacenada</th>
              <th>Huella recalculada</th>
              <th>Enlace anterior</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {resultado?.eslabones.map((e) => {
              const ok = e.huellaValida && e.enlaceAnteriorValido;
              return (
                <tr key={e.id} className={ok ? "" : "bg-red-50"}>
                  <td>{e.id}</td>
                  <td>{e.numero}</td>
                  <td className="font-mono text-xs">{corto(e.huellaAlmacenada)}</td>
                  <td className="font-mono text-xs">{corto(e.huellaRecalculada)}</td>
                  <td>{e.enlaceAnteriorValido ? "OK" : "ROTO"}</td>
                  <td className={ok ? "text-green-700" : "text-red-600"}>{ok ? "Valido" : "Manipulado"}</td>
                </tr>
              );
            })}
            {resultado?.eslabones.length === 0 && (
              <tr><td colSpan={6} className="text-center text-slate-400 py-6">Todavia no hay facturas en la cadena</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
