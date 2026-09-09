import { useMemo, useState } from "react";
import { tallerConfig } from "./config/taller.config";
import { Landing } from "./components/Landing";
import { StepShell } from "./components/StepShell";
import { OptionList } from "./components/OptionList";
import { PriceEstimate } from "./components/PriceEstimate";
import { ContactForm } from "./components/ContactForm";
import { SummaryScreen } from "./components/SummaryScreen";
import { guardarLead } from "./lib/leads";
import type { DatosContacto } from "./types";

type Paso = "landing" | "vehiculo" | "categoria" | "servicio" | "precio" | "contacto" | "resumen";

const ICONOS_VEHICULO: Record<string, string> = {
  turismo: "🚗",
  furgoneta: "🚐",
  moto: "🏍️",
};

const TOTAL_PASOS = 5;

export default function App() {
  const [paso, setPaso] = useState<Paso>("landing");
  const [tipoVehiculoId, setTipoVehiculoId] = useState<string | null>(null);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [contacto, setContacto] = useState<DatosContacto | null>(null);
  const [enviando, setEnviando] = useState(false);

  const categoria = useMemo(
    () => tallerConfig.categorias.find((c) => c.id === categoriaId) ?? null,
    [categoriaId],
  );
  const servicio = useMemo(
    () => categoria?.servicios.find((s) => s.id === servicioId) ?? null,
    [categoria, servicioId],
  );
  const tipoVehiculo = useMemo(
    () => tallerConfig.tiposVehiculo.find((t) => t.id === tipoVehiculoId) ?? null,
    [tipoVehiculoId],
  );

  function reiniciar() {
    setPaso("landing");
    setTipoVehiculoId(null);
    setCategoriaId(null);
    setServicioId(null);
    setContacto(null);
  }

  async function handleEnviarContacto(datos: DatosContacto) {
    if (!categoria || !servicio) return;
    setEnviando(true);
    setContacto(datos);
    await guardarLead({
      contacto: datos,
      tipoVehiculo: tipoVehiculo?.nombre,
      categoria: { id: categoria.id, nombre: categoria.nombre },
      servicio: {
        id: servicio.id,
        nombre: servicio.nombre,
        precioMin: servicio.precioMin,
        precioMax: servicio.precioMax,
      },
    });
    setEnviando(false);
    setPaso("resumen");
  }

  if (paso === "landing") {
    return <Landing config={tallerConfig} onEmpezar={() => setPaso("vehiculo")} />;
  }

  if (paso === "vehiculo") {
    return (
      <StepShell
        titulo="¿Qué tipo de vehículo es?"
        pasoActual={1}
        totalPasos={TOTAL_PASOS}
        onVolver={() => setPaso("landing")}
      >
        <OptionList
          opciones={tallerConfig.tiposVehiculo.map((t) => ({
            id: t.id,
            nombre: t.nombre,
            icono: ICONOS_VEHICULO[t.id] ?? "🚘",
          }))}
          onSeleccionar={(id) => {
            setTipoVehiculoId(id);
            setPaso("categoria");
          }}
        />
      </StepShell>
    );
  }

  if (paso === "categoria") {
    return (
      <StepShell
        titulo="¿Qué necesitas revisar?"
        subtitulo="Elige la categoría del servicio"
        pasoActual={2}
        totalPasos={TOTAL_PASOS}
        onVolver={() => setPaso("vehiculo")}
      >
        <OptionList
          opciones={tallerConfig.categorias.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            icono: c.icono,
          }))}
          onSeleccionar={(id) => {
            setCategoriaId(id);
            setPaso("servicio");
          }}
        />
      </StepShell>
    );
  }

  if (paso === "servicio" && categoria) {
    return (
      <StepShell
        titulo={categoria.nombre}
        subtitulo="Elige el servicio concreto"
        pasoActual={3}
        totalPasos={TOTAL_PASOS}
        onVolver={() => setPaso("categoria")}
      >
        <OptionList
          opciones={categoria.servicios.map((s) => ({
            id: s.id,
            nombre: s.nombre,
            descripcion: s.descripcion,
          }))}
          onSeleccionar={(id) => {
            setServicioId(id);
            setPaso("precio");
          }}
        />
      </StepShell>
    );
  }

  if (paso === "precio" && categoria && servicio) {
    return (
      <StepShell
        titulo="Tu precio estimado"
        pasoActual={4}
        totalPasos={TOTAL_PASOS}
        onVolver={() => setPaso("servicio")}
      >
        <PriceEstimate servicio={servicio} config={tallerConfig} onContinuar={() => setPaso("contacto")} />
      </StepShell>
    );
  }

  if (paso === "contacto" && categoria && servicio) {
    return (
      <StepShell
        titulo="Casi listo"
        subtitulo="Déjanos tus datos para confirmar el presupuesto"
        pasoActual={5}
        totalPasos={TOTAL_PASOS}
        onVolver={() => setPaso("precio")}
      >
        <ContactForm onEnviar={handleEnviarContacto} enviando={enviando} />
      </StepShell>
    );
  }

  if (paso === "resumen" && categoria && servicio && contacto) {
    return (
      <SummaryScreen
        config={tallerConfig}
        categoria={categoria}
        servicio={servicio}
        contacto={contacto}
        tipoVehiculoNombre={tipoVehiculo?.nombre}
        onEmpezarDeNuevo={reiniciar}
      />
    );
  }

  // Estado inconsistente (p. ej. recarga de página a mitad de flujo): reiniciar.
  reiniciar();
  return null;
}
