import { describe, it, expect } from "vitest";
import {
  normalizarEstado,
  limpiarCodigo,
  parsearCierre,
  parsearFechaHora,
  derivarTipoLicitacion,
} from "./normalizer";

describe("normalizarEstado", () => {
  it("mapea los estados reales del Excel", () => {
    expect(normalizarEstado("Nuevo")).toBe("NUEVO");
    expect(normalizarEstado("En curso")).toBe("EN_CURSO");
    expect(normalizarEstado("Realizada")).toBe("REALIZADA");
    expect(normalizarEstado("No ejecutable")).toBe("NO_EJECUTABLE");
    expect(normalizarEstado("Cerrada")).toBe("CERRADA");
  });
  it("tolera espacios, mayúsculas y tildes", () => {
    expect(normalizarEstado("  realizada ")).toBe("REALIZADA");
    expect(normalizarEstado("EN  CURSO")).toBe("EN_CURSO");
  });
  it("usa SIN_ESTADO para vacío o desconocido", () => {
    expect(normalizarEstado("")).toBe("SIN_ESTADO");
    expect(normalizarEstado(null)).toBe("SIN_ESTADO");
    expect(normalizarEstado("loquesea")).toBe("SIN_ESTADO");
  });
});

describe("limpiarCodigo", () => {
  it("quita espacios y saltos de línea", () => {
    expect(limpiarCodigo(" 2467-385-COT26")).toBe("2467-385-COT26");
    expect(limpiarCodigo("3193-259-COT26\n")).toBe("3193-259-COT26");
  });
});

describe("parsearCierre", () => {
  it("guarda fecha real cuando es fecha", () => {
    const r = parsearCierre("16/06/2026 16:00:00");
    expect(r.fechaCierre).not.toBeNull();
    expect(r.revisarLabel).toBeNull();
  });
  it("corrige el typo de año 2029 -> 2026", () => {
    const r = parsearCierre("17/06/2029 14:00:00");
    expect(r.fechaCierre?.getFullYear()).toBe(2026);
  });
  it("normaliza marcas REVISAR", () => {
    expect(parsearCierre("REVISAR 10").revisarLabel).toBe("REVISAR 10");
    expect(parsearCierre("revisar 5").revisarLabel).toBe("REVISAR 5");
    expect(parsearCierre("REVISA R11").revisarLabel).toBe("REVISAR 11");
    expect(parsearCierre("REVIAR 17").revisarLabel).toBe("REVISAR 17");
  });
});

describe("parsearFechaHora", () => {
  it("parsea day-first d/m/Y", () => {
    const d = parsearFechaHora("8/06/2026");
    expect(d?.getMonth()).toBe(5); // junio
    expect(d?.getDate()).toBe(8);
  });
});

describe("derivarTipoLicitacion", () => {
  it("deriva el tipo del sufijo", () => {
    expect(derivarTipoLicitacion("3361-6-L126")).toBe("L1");
    expect(derivarTipoLicitacion("4236-19-LE26")).toBe("LE");
    expect(derivarTipoLicitacion("3880-41-LP26")).toBe("LP");
  });
});
