import { sanitizeCsvField } from "./validation";
import type { FacturaResumen } from "./invoices";

// Los importes son numeros calculados por el propio servidor (nunca texto
// libre introducido por un usuario), asi que solo necesitan ir entre
// comillas para ser un CSV valido: aplicarles la heuristica anti-formula
// de sanitizeCsvField les añadiria una comilla superflua cuando son
// negativos (facturas rectificativas), al empezar por "-".
function csvNumero(valor: number): string {
  return `"${valor.toFixed(2)}"`;
}

/** Genera un CSV del historico de facturas, con sanitizacion anti-inyeccion de formulas en los campos de texto. */
export function facturasACsv(facturas: FacturaResumen[]): string {
  const cabecera = ["Numero", "Fecha", "Tipo", "Cliente", "Base imponible", "Cuota IVA", "Total", "Estado", "Huella (hash)"];
  const filas = facturas.map((f) =>
    [
      sanitizeCsvField(f.numero),
      sanitizeCsvField(f.fecha_expedicion),
      sanitizeCsvField(f.tipo),
      sanitizeCsvField(f.cliente_nombre),
      csvNumero(f.base_imponible),
      csvNumero(f.cuota_iva),
      csvNumero(f.total),
      sanitizeCsvField(f.estado),
      sanitizeCsvField(f.hash_actual),
    ].join(",")
  );
  return [cabecera.map(sanitizeCsvField).join(","), ...filas].join("\r\n");
}

/**
 * Construye una representacion tipo "registro de facturacion" (formato propio,
 * inspirado en los campos que exige Verifactu) para exportar una factura individual
 * como JSON. No es el formato XML/JSON oficial de la AEAT: ver README.
 */
export function facturaARegistroJson(detalle: {
  numero: string;
  fecha_expedicion: string;
  tipo: string;
  base_imponible: number;
  cuota_iva: number;
  total: number;
  hash_actual: string;
  hash_anterior: string | null;
  hash_algoritmo: string;
  qr_payload: string;
  negocio: { nombre: string; nif: string };
  cliente: { nombre: string; nif: string };
  lineas: Array<{ descripcion: string; cantidad: number; precio_unitario: number; iva_pct: number; importe_linea: number }>;
}) {
  return {
    _aviso: "Documento de demostracion. No es un registro oficial validado por la AEAT.",
    emisor: { nombre: detalle.negocio.nombre, nif: detalle.negocio.nif },
    destinatario: { nombre: detalle.cliente.nombre, nif: detalle.cliente.nif },
    factura: {
      numero: detalle.numero,
      fecha_expedicion: detalle.fecha_expedicion,
      tipo: detalle.tipo,
      lineas: detalle.lineas,
      base_imponible: detalle.base_imponible,
      cuota_iva: detalle.cuota_iva,
      total: detalle.total,
    },
    encadenamiento: {
      algoritmo: detalle.hash_algoritmo,
      huella: detalle.hash_actual,
      huella_registro_anterior: detalle.hash_anterior,
    },
    qr: { payload: detalle.qr_payload },
    generado_en: new Date().toISOString(),
  };
}
