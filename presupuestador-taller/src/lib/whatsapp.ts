import type { Categoria, Servicio, TallerConfig } from "../types";
import { formatearPrecio } from "./formato";

export function construirEnlaceWhatsapp({
  config,
  categoria,
  servicio,
  nombreCliente,
}: {
  config: TallerConfig;
  categoria: Categoria;
  servicio: Servicio;
  nombreCliente: string;
}): string {
  const mensaje = [
    `Hola ${config.nombre}, soy ${nombreCliente}.`,
    `He calculado un presupuesto online para: ${categoria.nombre} — ${servicio.nombre}.`,
    `Rango estimado: ${formatearPrecio(servicio.precioMin)} – ${formatearPrecio(servicio.precioMax)}.`,
    `¿Podéis confirmarme disponibilidad para traer el vehículo?`,
  ].join("\n");

  const numero = config.telefonoWhatsapp.replace(/[^0-9]/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
