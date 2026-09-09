import type { Servicio, TallerConfig } from "../types";
import { formatearPrecio } from "../lib/formato";

interface Props {
  servicio: Servicio;
  config: TallerConfig;
  onContinuar: () => void;
}

export function PriceEstimate({ servicio, config, onContinuar }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">{servicio.nombre}</p>
        {servicio.descripcion && (
          <p className="mt-1 text-sm text-slate-500">{servicio.descripcion}</p>
        )}
        <p className="mt-4 text-3xl font-extrabold text-primary">
          {formatearPrecio(servicio.precioMin)} – {formatearPrecio(servicio.precioMax)}
        </p>
        <p className="mt-1 text-xs text-slate-400">Mano de obra y pieza orientativa incluidas</p>
      </div>

      <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        ⚠️ Presupuesto orientativo, sujeto a revisión in situ del vehículo en {config.nombre}.
      </div>

      <button
        onClick={onContinuar}
        className="w-full rounded-xl bg-primary px-6 py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 active:scale-[0.98]"
      >
        Continuar y dejar mis datos
      </button>
    </div>
  );
}
