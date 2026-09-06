import QRCode from "qrcode";

/**
 * Genera el "payload" que codificaria el QR normativo de una factura Verifactu.
 *
 * En produccion real, este QR apunta a un endpoint de cotejo de la AEAT
 * (https://www2.agenciatributaria.gob.es/...). Como esta app no puede ni debe
 * llamar a servicios externos, generamos un payload de VERIFICACION LOCAL,
 * claramente marcado como demo, con los mismos campos que exige la normativa
 * (NIF emisor, numero de factura, fecha, importe total y huella).
 */
export function construirPayloadQr(params: {
  nifEmisor: string;
  numero: string;
  fecha: string;
  total: number;
  huella: string;
}): string {
  const fechaCorta = params.fecha.slice(0, 10);
  const params2 = new URLSearchParams({
    nif: params.nifEmisor,
    num: params.numero,
    fecha: fechaCorta,
    total: params.total.toFixed(2),
    huella: params.huella.slice(0, 16),
  });
  return `https://verifactu-demo.local/verificar?${params2.toString()}`;
}

/** Genera una imagen PNG del QR como data URL (base64), 100% local, sin red. */
export async function generarQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });
}
