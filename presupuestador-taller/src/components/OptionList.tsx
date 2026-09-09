interface Opcion {
  id: string;
  nombre: string;
  icono?: string;
  descripcion?: string;
}

interface Props {
  opciones: Opcion[];
  onSeleccionar: (id: string) => void;
}

export function OptionList({ opciones, onSeleccionar }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {opciones.map((opcion) => (
        <button
          key={opcion.id}
          onClick={() => onSeleccionar(opcion.id)}
          className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition active:scale-[0.98] active:border-primary"
        >
          {opcion.icono && <span className="text-2xl">{opcion.icono}</span>}
          <span className="flex-1">
            <span className="block font-semibold text-slate-900">{opcion.nombre}</span>
            {opcion.descripcion && (
              <span className="mt-0.5 block text-sm text-slate-500">{opcion.descripcion}</span>
            )}
          </span>
          <span className="text-slate-300">›</span>
        </button>
      ))}
    </div>
  );
}
