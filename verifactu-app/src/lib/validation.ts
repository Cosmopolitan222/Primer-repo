// Validaciones reales de entrada. Nada aqui es decorativo: cada funcion se
// usa en las rutas API antes de tocar la base de datos.

const NIF_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";
const CIF_CONTROL_LETTERS = "JABCDEFGHI";
// Letras de CIF que exigen digito de control numerico.
const CIF_SOLO_DIGITO = new Set(["A", "B", "E", "H"]);
// Letras de CIF que exigen letra de control.
const CIF_SOLO_LETRA = new Set(["K", "P", "Q", "S"]);
const CIF_LETRAS_VALIDAS = new Set([
  "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "U", "V", "W",
]);

export type TipoDocumento = "NIF" | "NIE" | "CIF";

export interface ValidacionDocumento {
  valido: boolean;
  tipo: TipoDocumento | null;
  error?: string;
}

function calcularLetraNif(numero: number): string {
  return NIF_LETTERS[numero % 23] ?? "";
}

function validarNif(valor: string): ValidacionDocumento {
  const match = /^(\d{8})([A-Za-z])$/.exec(valor);
  if (!match) return { valido: false, tipo: null, error: "Formato de NIF invalido (8 digitos + letra)" };
  const numero = parseInt(match[1] as string, 10);
  const letra = (match[2] as string).toUpperCase();
  const esperada = calcularLetraNif(numero);
  if (letra !== esperada) {
    return { valido: false, tipo: "NIF", error: `Letra de control incorrecta (se esperaba ${esperada})` };
  }
  return { valido: true, tipo: "NIF" };
}

function validarNie(valor: string): ValidacionDocumento {
  const match = /^([XYZxyz])(\d{7})([A-Za-z])$/.exec(valor);
  if (!match) return { valido: false, tipo: null, error: "Formato de NIE invalido (X/Y/Z + 7 digitos + letra)" };
  const prefijo = { X: "0", Y: "1", Z: "2" }[(match[1] as string).toUpperCase() as "X" | "Y" | "Z"];
  const numero = parseInt(prefijo + (match[2] as string), 10);
  const letra = (match[3] as string).toUpperCase();
  const esperada = calcularLetraNif(numero);
  if (letra !== esperada) {
    return { valido: false, tipo: "NIE", error: `Letra de control incorrecta (se esperaba ${esperada})` };
  }
  return { valido: true, tipo: "NIE" };
}

function validarCif(valor: string): ValidacionDocumento {
  const match = /^([A-Za-z])(\d{7})([0-9A-Za-z])$/.exec(valor);
  if (!match) return { valido: false, tipo: null, error: "Formato de CIF invalido (letra + 7 digitos + control)" };
  const letraOrg = (match[1] as string).toUpperCase();
  if (!CIF_LETRAS_VALIDAS.has(letraOrg)) {
    return { valido: false, tipo: null, error: "Letra de organizacion de CIF no reconocida" };
  }
  const digitos = match[2] as string;
  const control = (match[3] as string).toUpperCase();

  let sumaPares = 0;
  let sumaImpares = 0;
  for (let i = 0; i < digitos.length; i++) {
    const d = parseInt(digitos[i] as string, 10);
    if (i % 2 === 0) {
      // posiciones 1,3,5,7 (index 0,2,4,6) -> se duplican
      let doble = d * 2;
      if (doble > 9) doble -= 9;
      sumaImpares += doble;
    } else {
      sumaPares += d;
    }
  }
  const total = sumaPares + sumaImpares;
  const digitoControl = (10 - (total % 10)) % 10;
  const letraControl = CIF_CONTROL_LETTERS[digitoControl] ?? "";

  const debeSerDigito = CIF_SOLO_DIGITO.has(letraOrg);
  const debeSerLetra = CIF_SOLO_LETRA.has(letraOrg);

  if (debeSerDigito) {
    if (control !== String(digitoControl)) {
      return { valido: false, tipo: "CIF", error: `Digito de control incorrecto (se esperaba ${digitoControl})` };
    }
  } else if (debeSerLetra) {
    if (control !== letraControl) {
      return { valido: false, tipo: "CIF", error: `Letra de control incorrecta (se esperaba ${letraControl})` };
    }
  } else {
    if (control !== String(digitoControl) && control !== letraControl) {
      return {
        valido: false,
        tipo: "CIF",
        error: `Control incorrecto (se esperaba ${digitoControl} o ${letraControl})`,
      };
    }
  }
  return { valido: true, tipo: "CIF" };
}

/** Valida un NIF, NIE o CIF espanol con su algoritmo de digito/letra de control real. */
export function validarDocumentoFiscal(valorOriginal: string): ValidacionDocumento {
  const valor = (valorOriginal || "").trim().toUpperCase().replace(/[\s-]/g, "");
  if (!valor) return { valido: false, tipo: null, error: "El documento fiscal es obligatorio" };
  if (/^\d{8}[A-Z]$/.test(valor)) return validarNif(valor);
  if (/^[XYZ]\d{7}[A-Z]$/.test(valor)) return validarNie(valor);
  if (/^[A-Z]\d{7}[0-9A-Z]$/.test(valor)) return validarCif(valor);
  return { valido: false, tipo: null, error: "Formato no reconocido como NIF, NIE o CIF" };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const CONTROL_CHARS_RE = new RegExp("[\\u0000-\\u001F\\u007F]", "g");

/** Elimina caracteres de control y recorta espacios; limita longitud. */
export function sanitizeText(value: unknown, maxLength = 255): string {
  if (typeof value !== "string") throw new ValidationError("Se esperaba un texto");
  const cleaned = value.replace(CONTROL_CHARS_RE, "").trim();
  if (cleaned.length > maxLength) {
    throw new ValidationError(`El texto supera la longitud maxima de ${maxLength} caracteres`);
  }
  return cleaned;
}

export function requireNonEmpty(value: unknown, campo: string, maxLength = 255): string {
  const text = sanitizeText(value, maxLength);
  if (!text) throw new ValidationError(`El campo "${campo}" es obligatorio`);
  return text;
}

export function optionalText(value: unknown, maxLength = 255): string {
  if (value === undefined || value === null || value === "") return "";
  return sanitizeText(value, maxLength);
}

export function requirePositiveNumber(value: unknown, campo: string, opts: { allowZero?: boolean } = {}): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) throw new ValidationError(`El campo "${campo}" debe ser numerico`);
  if (opts.allowZero ? num < 0 : num <= 0) {
    throw new ValidationError(`El campo "${campo}" debe ser ${opts.allowZero ? "mayor o igual que 0" : "mayor que 0"}`);
  }
  return Math.round(num * 10000) / 10000;
}

const IVA_PERMITIDOS = [0, 4, 10, 21];

export function requireIvaPct(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!IVA_PERMITIDOS.includes(num)) {
    throw new ValidationError(`El tipo de IVA debe ser uno de: ${IVA_PERMITIDOS.join(", ")}`);
  }
  return num;
}

export function requireEmail(value: unknown, opcional = false): string {
  if (opcional && (value === undefined || value === null || value === "")) return "";
  const text = sanitizeText(value, 255);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(text)) throw new ValidationError("El formato de email no es valido");
  return text;
}

export function requireTipoProducto(value: unknown): "producto" | "servicio" {
  if (value !== "producto" && value !== "servicio") {
    throw new ValidationError('El tipo debe ser "producto" o "servicio"');
  }
  return value;
}

export function requireFechaISO(value: unknown, campo: string): string {
  const text = sanitizeText(value, 40);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new ValidationError(`El campo "${campo}" no es una fecha valida`);
  return date.toISOString();
}

/** Evita inyeccion de formulas (CSV injection) al exportar a hojas de calculo. */
export function sanitizeCsvField(value: string | number): string {
  const text = String(value);
  const peligroso = /^[=+\-@\t\r]/.test(text);
  const escapado = text.replace(/"/g, '""');
  const conPrefijo = peligroso ? `'${escapado}` : escapado;
  return `"${conPrefijo}"`;
}
