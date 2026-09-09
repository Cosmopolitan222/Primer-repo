import type { Categoria, DatosContacto, Servicio, TallerConfig } from "../types";
import { formatearPrecio } from "../lib/formato";
import { generarPdfPresupuesto } from "../lib/pdf";
import { construirEnlaceWhatsapp } from "../lib/whatsapp";

interface Props {
  config: TallerConfig;
  categoria: Categoria;
  servicio: Servicio;
  contacto: DatosContacto;
  tipoVehiculoNombre?: string;
  onEmpezarDeNuevo: () => void;
}

export function SummaryScreen({
  config,
  categoria,
  servicio,
  contacto,
  tipoVehiculoNombre,
  onEmpezarDeNuevo,
}: Props) {
  function handleDescargarPdf() {
    const doc = generarPdfPresupuesto({ config, categoria, servicio, contacto, tipoVehiculoNombre });
    doc.save(`presupuesto-${servicio.id}.pdf`);
  }

  const enlaceWhatsapp = construirEnlaceWhatsapp({
    config,
    categoria,
    servicio,
    nombreCliente: contacto.nombre,
  });

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-5 py-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✅
        </div>
        <h2 className="text-xl font-bold text-slate-900">¡Presupuesto listo, {contacto.nombre.split(" ")[0]}!</h2>
        <p className="mt-1 text-sm text-slate-500">
          Hemos guardado tus datos. Un miembro de {config.nombre} podrá contactarte para confirmar la cita.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {categoria.nombre}
        </p>
        <p className="mt-1 text-lg font-bold text-slate-900">{servicio.nombre}</p>
        <p className="mt-3 text-2xl font-extrabold text-primary">
          {formatearPrecio(servicio.precioMin)} – {formatearPrecio(servicio.precioMax)}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={handleDescargarPdf}
          className="w-full rounded-xl bg-primary px-6 py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 active:scale-[0.98]"
        >
          Descargar presupuesto en PDF
        </button>

        <a
          href={enlaceWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
        >
          Enviar por WhatsApp
        </a>

        <button
          onClick={onEmpezarDeNuevo}
          className="w-full rounded-xl px-6 py-3 text-sm font-medium text-slate-500"
        >
          Calcular otro presupuesto
        </button>
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">{config.avisoLegal}</p>
    </div>
  );
}
