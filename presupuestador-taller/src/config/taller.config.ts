import type { TallerConfig } from "../types";

/**
 * ARCHIVO ÚNICO DE PERSONALIZACIÓN
 * ---------------------------------
 * Para generar una variante para un taller concreto, edita SOLO este
 * archivo (nombre, logo, colores, teléfono y catálogo de servicios) y
 * vuelve a desplegar. No hace falta tocar ningún otro fichero del proyecto.
 *
 * Los precios de este config son de EJEMPLO/DEMO, orientativos para
 * España. Sustitúyelos por los precios reales del taller antes de enviar
 * la demo o publicarla en producción.
 */
export const tallerConfig: TallerConfig = {
  nombre: "Taller Ejemplo",
  eslogan: "Presupuesto claro, sin sorpresas, en menos de un minuto",
  logoUrl: "/logo.svg",
  colorPrimario: "#1e3a8a",
  colorPrimarioOscuro: "#152a63",
  telefonoWhatsapp: "34600000000",
  direccion: "Calle del Taller, 12, Madrid",

  tiposVehiculo: [
    { id: "turismo", nombre: "Turismo" },
    { id: "furgoneta", nombre: "Furgoneta" },
    { id: "moto", nombre: "Moto" },
  ],

  categorias: [
    {
      id: "frenos",
      nombre: "Frenos",
      icono: "🛑",
      servicios: [
        {
          id: "pastillas-delanteras",
          nombre: "Pastillas de freno delanteras",
          descripcion: "Sustitución de pastillas del eje delantero, incluye mano de obra.",
          precioMin: 60,
          precioMax: 110,
        },
        {
          id: "discos-pastillas",
          nombre: "Discos + pastillas (eje delantero)",
          descripcion: "Sustitución completa de discos y pastillas delanteros.",
          precioMin: 140,
          precioMax: 240,
        },
        {
          id: "liquido-frenos",
          nombre: "Cambio de líquido de frenos",
          descripcion: "Purgado y sustitución del líquido de frenos.",
          precioMin: 45,
          precioMax: 70,
        },
      ],
    },
    {
      id: "neumaticos",
      nombre: "Neumáticos",
      icono: "🛞",
      servicios: [
        {
          id: "cambio-1-neumatico",
          nombre: "Cambio de 1 neumático (turismo)",
          descripcion: "Montaje, equilibrado y válvula incluidos. No incluye el neumático.",
          precioMin: 70,
          precioMax: 140,
        },
        {
          id: "cambio-4-neumaticos",
          nombre: "Cambio de 4 neumáticos + equilibrado",
          descripcion: "Montaje y equilibrado de las 4 ruedas. No incluye los neumáticos.",
          precioMin: 320,
          precioMax: 650,
        },
        {
          id: "alineacion",
          nombre: "Alineación de dirección",
          precioMin: 35,
          precioMax: 60,
        },
      ],
    },
    {
      id: "distribucion",
      nombre: "Distribución / correa",
      icono: "⚙️",
      servicios: [
        {
          id: "kit-distribucion",
          nombre: "Correa de distribución + kit + bomba de agua",
          descripcion: "Sustitución completa del kit de distribución y bomba de agua.",
          precioMin: 280,
          precioMax: 550,
        },
        {
          id: "correa-poli-v",
          nombre: "Correa poli-V / alternador",
          precioMin: 60,
          precioMax: 120,
        },
      ],
    },
    {
      id: "bateria",
      nombre: "Batería",
      icono: "🔋",
      servicios: [
        {
          id: "sustitucion-bateria",
          nombre: "Sustitución de batería (turismo)",
          descripcion: "Incluye batería estándar, montaje y reciclaje de la usada.",
          precioMin: 90,
          precioMax: 180,
        },
        {
          id: "comprobacion-carga",
          nombre: "Comprobación y carga de batería",
          precioMin: 15,
          precioMax: 30,
        },
      ],
    },
    {
      id: "embrague",
      nombre: "Embrague",
      icono: "🔧",
      servicios: [
        {
          id: "kit-embrague",
          nombre: "Kit de embrague completo",
          descripcion: "Disco, plato y collarín, incluye mano de obra.",
          precioMin: 450,
          precioMax: 850,
        },
        {
          id: "ajuste-embrague",
          nombre: "Ajuste y revisión de embrague",
          precioMin: 40,
          precioMax: 70,
        },
      ],
    },
    {
      id: "aire-acondicionado",
      nombre: "Aire acondicionado",
      icono: "❄️",
      servicios: [
        {
          id: "recarga-gas",
          nombre: "Recarga de gas",
          precioMin: 50,
          precioMax: 90,
        },
        {
          id: "diagnostico-fugas",
          nombre: "Revisión + diagnóstico de fugas",
          precioMin: 35,
          precioMax: 60,
        },
      ],
    },
    {
      id: "itv",
      nombre: "Revisión / ITV previa",
      icono: "✅",
      servicios: [
        {
          id: "revision-pre-itv",
          nombre: "Revisión pre-ITV completa",
          precioMin: 35,
          precioMax: 60,
        },
        {
          id: "revision-pre-itv-ajustes",
          nombre: "Revisión pre-ITV + ajustes menores",
          precioMin: 60,
          precioMax: 120,
        },
      ],
    },
    {
      id: "aceite-filtros",
      nombre: "Aceite y filtros",
      icono: "🛢️",
      servicios: [
        {
          id: "cambio-aceite-filtro",
          nombre: "Cambio de aceite + filtro de aceite",
          precioMin: 50,
          precioMax: 90,
        },
        {
          id: "cambio-aceite-filtros-completo",
          nombre: "Cambio de aceite + filtros (aire, aceite y habitáculo)",
          precioMin: 80,
          precioMax: 140,
        },
      ],
    },
  ],

  avisoLegal:
    "Presupuesto orientativo calculado de forma automática. El precio final puede variar tras la revisión física del vehículo en el taller.",
};
