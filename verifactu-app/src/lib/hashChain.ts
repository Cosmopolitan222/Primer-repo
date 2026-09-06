import crypto from "node:crypto";

/**
 * Calculo de la "huella" (hash) de una factura, inspirado en el concepto de
 * encadenamiento de registros de facturacion de Verifactu: cada registro
 * incluye el hash del registro anterior, de forma que cualquier alteracion
 * posterior de un registro ya emitido rompe la cadena y es detectable.
 *
 * IMPORTANTE: este es un modelo simplificado con fines demostrativos.
 * NO reproduce el algoritmo/formato oficial certificado por la AEAT
 * (ver README, seccion "Limitaciones para produccion").
 */
export interface DatosHuellaFactura {
  nifEmisor: string;
  numero: string;
  fechaExpedicion: string;
  tipo: string;
  baseImponible: number;
  cuotaIva: number;
  total: number;
  hashAnterior: string | null;
  timestamp: string;
}

export function construirMaterialHuella(datos: DatosHuellaFactura): string {
  return [
    `NIF:${datos.nifEmisor}`,
    `NUM:${datos.numero}`,
    `FECHA:${datos.fechaExpedicion}`,
    `TIPO:${datos.tipo}`,
    `BASE:${datos.baseImponible.toFixed(2)}`,
    `CUOTA:${datos.cuotaIva.toFixed(2)}`,
    `TOTAL:${datos.total.toFixed(2)}`,
    `HASH_ANTERIOR:${datos.hashAnterior ?? ""}`,
    `TS:${datos.timestamp}`,
  ].join("|");
}

export function calcularHuella(datos: DatosHuellaFactura): string {
  const material = construirMaterialHuella(datos);
  return crypto.createHash("sha256").update(material, "utf8").digest("hex");
}

export interface RegistroCadena {
  id: number;
  numero: string;
  hash_actual: string;
  hash_anterior: string | null;
  datos: DatosHuellaFactura;
}

export interface ResultadoVerificacionEslabon {
  id: number;
  numero: string;
  huellaAlmacenada: string;
  huellaRecalculada: string;
  enlaceAnteriorValido: boolean;
  huellaValida: boolean;
}

export interface ResultadoVerificacionCadena {
  totalRegistros: number;
  cadenaIntegra: boolean;
  eslabones: ResultadoVerificacionEslabon[];
  primerFalloId: number | null;
}

/** Recalcula y compara el hash de cada factura contra lo almacenado, en orden. */
export function verificarCadena(registros: RegistroCadena[]): ResultadoVerificacionCadena {
  const eslabones: ResultadoVerificacionEslabon[] = [];
  let hashPrevioEsperado: string | null = null;
  let primerFalloId: number | null = null;

  for (const registro of registros) {
    const huellaRecalculada = calcularHuella(registro.datos);
    const huellaValida = huellaRecalculada === registro.hash_actual;
    const enlaceAnteriorValido = registro.hash_anterior === hashPrevioEsperado;

    if ((!huellaValida || !enlaceAnteriorValido) && primerFalloId === null) {
      primerFalloId = registro.id;
    }

    eslabones.push({
      id: registro.id,
      numero: registro.numero,
      huellaAlmacenada: registro.hash_actual,
      huellaRecalculada,
      enlaceAnteriorValido,
      huellaValida,
    });

    hashPrevioEsperado = registro.hash_actual;
  }

  return {
    totalRegistros: registros.length,
    cadenaIntegra: primerFalloId === null,
    eslabones,
    primerFalloId,
  };
}
