interface Props {
  pasoActual: number;
  totalPasos: number;
}

export function ProgressBar({ pasoActual, totalPasos }: Props) {
  const porcentaje = Math.round((pasoActual / totalPasos) * 100);
  return (
    <div className="w-full">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-medium text-slate-500">
        Paso {pasoActual} de {totalPasos}
      </p>
    </div>
  );
}
