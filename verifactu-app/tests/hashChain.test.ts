import { describe, it, expect } from "vitest";
import { calcularHuella, verificarCadena, type RegistroCadena, type DatosHuellaFactura } from "../src/lib/hashChain";

function datosBase(overrides: Partial<DatosHuellaFactura> = {}): DatosHuellaFactura {
  return {
    nifEmisor: "B12345674",
    numero: "2026-0001",
    fechaExpedicion: "2026-01-01T10:00:00.000Z",
    tipo: "ORDINARIA",
    baseImponible: 100,
    cuotaIva: 21,
    total: 121,
    hashAnterior: null,
    timestamp: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("calcularHuella", () => {
  it("es determinista para los mismos datos", () => {
    const datos = datosBase();
    expect(calcularHuella(datos)).toBe(calcularHuella(datos));
  });

  it("cambia si cambia cualquier campo relevante", () => {
    const original = calcularHuella(datosBase());
    expect(calcularHuella(datosBase({ total: 121.01 }))).not.toBe(original);
    expect(calcularHuella(datosBase({ numero: "2026-0002" }))).not.toBe(original);
    expect(calcularHuella(datosBase({ hashAnterior: "abc" }))).not.toBe(original);
  });

  it("produce un hash SHA-256 valido (64 caracteres hexadecimales)", () => {
    expect(calcularHuella(datosBase())).toMatch(/^[a-f0-9]{64}$/);
  });
});

function construirCadenaValida(n: number): RegistroCadena[] {
  const registros: RegistroCadena[] = [];
  let hashAnterior: string | null = null;
  for (let i = 1; i <= n; i++) {
    const datos = datosBase({ numero: `2026-000${i}`, hashAnterior, total: 100 + i });
    const hash = calcularHuella(datos);
    registros.push({ id: i, numero: datos.numero, hash_actual: hash, hash_anterior: hashAnterior, datos });
    hashAnterior = hash;
  }
  return registros;
}

describe("verificarCadena", () => {
  it("confirma que una cadena sin alterar es integra", () => {
    const resultado = verificarCadena(construirCadenaValida(4));
    expect(resultado.cadenaIntegra).toBe(true);
    expect(resultado.totalRegistros).toBe(4);
    expect(resultado.primerFalloId).toBeNull();
    expect(resultado.eslabones.every((e) => e.huellaValida && e.enlaceAnteriorValido)).toBe(true);
  });

  it("detecta la manipulacion de un importe en un registro intermedio", () => {
    const cadena = construirCadenaValida(4);
    // Simula un ataque: se altera el importe total almacenado de la factura 2
    // sin recalcular su huella (lo que haria un atacante que edite la BD directamente).
    cadena[1] = { ...cadena[1]!, datos: { ...cadena[1]!.datos, total: 999999 } };

    const resultado = verificarCadena(cadena);
    expect(resultado.cadenaIntegra).toBe(false);
    expect(resultado.primerFalloId).toBe(2);
    expect(resultado.eslabones[1]!.huellaValida).toBe(false);
  });

  it("detecta la rotura de un enlace entre registros", () => {
    const cadena = construirCadenaValida(3);
    cadena[2] = { ...cadena[2]!, hash_anterior: "hash-inventado-que-no-encaja" };

    const resultado = verificarCadena(cadena);
    expect(resultado.cadenaIntegra).toBe(false);
    expect(resultado.eslabones[2]!.enlaceAnteriorValido).toBe(false);
  });

  it("una cadena vacia se considera integra por definicion", () => {
    const resultado = verificarCadena([]);
    expect(resultado.cadenaIntegra).toBe(true);
    expect(resultado.totalRegistros).toBe(0);
  });
});
