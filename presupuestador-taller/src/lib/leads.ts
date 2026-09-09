import type { Categoria, DatosContacto, Servicio } from "../types";

export interface LeadPayload {
  contacto: DatosContacto;
  tipoVehiculo?: string;
  categoria: Pick<Categoria, "id" | "nombre">;
  servicio: Pick<Servicio, "id" | "nombre" | "precioMin" | "precioMax">;
}

/**
 * Guarda el lead en el backend (Cloudflare Pages Function + D1).
 * Si la petición falla (por ejemplo, en local sin `wrangler pages dev`),
 * no bloquea al usuario: el presupuesto y el PDF se siguen mostrando.
 */
export async function guardarLead(payload: LeadPayload): Promise<void> {
  try {
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn("No se pudo guardar el lead:", error);
  }
}
