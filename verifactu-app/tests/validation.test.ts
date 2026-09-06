import { describe, it, expect } from "vitest";
import {
  validarDocumentoFiscal,
  requirePositiveNumber,
  requireIvaPct,
  requireEmail,
  sanitizeCsvField,
  ValidationError,
} from "../src/lib/validation";

describe("validarDocumentoFiscal", () => {
  it("acepta un NIF valido", () => {
    expect(validarDocumentoFiscal("12345678Z")).toEqual({ valido: true, tipo: "NIF" });
  });

  it("rechaza un NIF con letra de control incorrecta", () => {
    const resultado = validarDocumentoFiscal("12345678A");
    expect(resultado.valido).toBe(false);
    expect(resultado.tipo).toBe("NIF");
  });

  it("acepta un NIE valido", () => {
    expect(validarDocumentoFiscal("X1234567L")).toEqual({ valido: true, tipo: "NIE" });
  });

  it("rechaza un NIE con letra incorrecta", () => {
    expect(validarDocumentoFiscal("X1234567A").valido).toBe(false);
  });

  it("acepta un CIF valido de sociedad limitada", () => {
    expect(validarDocumentoFiscal("B12345674")).toEqual({ valido: true, tipo: "CIF" });
  });

  it("rechaza un CIF con digito de control incorrecto", () => {
    expect(validarDocumentoFiscal("B12345670").valido).toBe(false);
  });

  it("rechaza formatos irreconocibles", () => {
    const resultado = validarDocumentoFiscal("no-es-un-documento");
    expect(resultado.valido).toBe(false);
    expect(resultado.tipo).toBeNull();
  });

  it("rechaza valores vacios", () => {
    expect(validarDocumentoFiscal("").valido).toBe(false);
  });

  it("normaliza espacios, guiones y mayusculas", () => {
    expect(validarDocumentoFiscal(" 12345678z ").valido).toBe(true);
  });
});

describe("requirePositiveNumber", () => {
  it("acepta numeros positivos", () => {
    expect(requirePositiveNumber(10.5, "campo")).toBe(10.5);
  });
  it("rechaza cero cuando no se permite explicitamente", () => {
    expect(() => requirePositiveNumber(0, "campo")).toThrow(ValidationError);
  });
  it("acepta cero cuando se permite", () => {
    expect(requirePositiveNumber(0, "campo", { allowZero: true })).toBe(0);
  });
  it("rechaza negativos", () => {
    expect(() => requirePositiveNumber(-5, "campo", { allowZero: true })).toThrow(ValidationError);
  });
  it("rechaza valores no numericos", () => {
    expect(() => requirePositiveNumber("abc", "campo")).toThrow(ValidationError);
  });
});

describe("requireIvaPct", () => {
  it("acepta los tipos de IVA permitidos", () => {
    for (const v of [0, 4, 10, 21]) {
      expect(requireIvaPct(v)).toBe(v);
    }
  });
  it("rechaza tipos de IVA no permitidos", () => {
    expect(() => requireIvaPct(15)).toThrow(ValidationError);
  });
});

describe("requireEmail", () => {
  it("acepta emails validos", () => {
    expect(requireEmail("persona@ejemplo.com")).toBe("persona@ejemplo.com");
  });
  it("rechaza emails invalidos", () => {
    expect(() => requireEmail("no-es-un-email")).toThrow(ValidationError);
  });
});

describe("sanitizeCsvField (proteccion contra CSV injection)", () => {
  it("antepone comilla simple a valores que empiezan por formula", () => {
    expect(sanitizeCsvField("=cmd|'/C calc'!A1")).toBe(`"'=cmd|'/C calc'!A1"`);
  });
  it("no modifica texto normal, solo lo entrecomilla", () => {
    expect(sanitizeCsvField("Cliente Normal")).toBe('"Cliente Normal"');
  });
  it("escapa comillas dobles internas", () => {
    expect(sanitizeCsvField('Dice "hola"')).toBe('"Dice ""hola"""');
  });
});
