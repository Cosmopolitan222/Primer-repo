import type { TallerConfig } from "../types";

interface Props {
  config: TallerConfig;
  onEmpezar: () => void;
}

export function Landing({ config, onEmpezar }: Props) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-white px-6 py-12 text-center">
      <img
        src={config.logoUrl}
        alt={config.nombre}
        className="mb-6 h-16 w-16 rounded-xl object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{config.nombre}</h1>
      <p className="mt-2 max-w-sm text-base text-slate-600">{config.eslogan}</p>

      <button
        onClick={onEmpezar}
        className="mt-10 w-full max-w-xs rounded-xl bg-primary px-6 py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 transition active:scale-[0.98]"
      >
        Calcula tu presupuesto en 1 minuto
      </button>

      <div className="mt-8 flex max-w-sm flex-col gap-2 text-sm text-slate-500">
        <p>✓ Sin compromiso ni pagos</p>
        <p>✓ Precio orientativo al instante</p>
        <p>✓ Descarga tu presupuesto en PDF</p>
      </div>

      {config.direccion && (
        <p className="mt-10 text-xs text-slate-400">{config.direccion}</p>
      )}
    </div>
  );
}
