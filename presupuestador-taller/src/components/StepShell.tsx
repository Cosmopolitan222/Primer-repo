import type { ReactNode } from "react";
import { ProgressBar } from "./ProgressBar";

interface Props {
  titulo: string;
  subtitulo?: string;
  pasoActual: number;
  totalPasos: number;
  onVolver?: () => void;
  children: ReactNode;
}

export function StepShell({ titulo, subtitulo, pasoActual, totalPasos, onVolver, children }: Props) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-5 py-6">
      <div className="mb-6 flex items-center gap-3">
        {onVolver && (
          <button
            onClick={onVolver}
            aria-label="Volver"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 active:scale-95"
          >
            ←
          </button>
        )}
        <div className="flex-1">
          <ProgressBar pasoActual={pasoActual} totalPasos={totalPasos} />
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-900">{titulo}</h2>
      {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}

      <div className="mt-6 flex-1">{children}</div>
    </div>
  );
}
