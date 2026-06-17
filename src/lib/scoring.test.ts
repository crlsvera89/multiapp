import { describe, it, expect } from "vitest";
import {
  puntuar,
  construirModelo,
  prioridad,
  tokens,
  MODELO_DEFAULT,
  type Historico,
} from "./scoring";

describe("tokens", () => {
  it("extrae palabras significativas sin tildes ni stopwords", () => {
    const t = tokens({ nombre: "FERRETERÍA para HERRAMIENTAS", notas: null });
    expect(t).toContain("FERRETERIA");
    expect(t).toContain("HERRAMIENTAS");
    expect(t).not.toContain("PARA");
  });
});

describe("puntuar (modelo por defecto)", () => {
  it("da puntaje alto a rubro+región del negocio", () => {
    const r = puntuar({ region: "ÑUBLE", nombre: "FERRETERIA", notas: "HERRAMIENTAS" });
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(prioridad(r.score)).toBe("alta");
  });
  it("penaliza rubro negativo conocido", () => {
    const r = puntuar({ region: "ÑUBLE", nombre: "PRODUCTO COMPUTACION Y LIBRERIA", notas: null });
    expect(r.score).toBeLessThan(50);
  });
  it("baja el puntaje fuera de las regiones del negocio", () => {
    const dentro = puntuar({ region: "ÑUBLE", nombre: "FERRETERIA", notas: null }).score;
    const fuera = puntuar({ region: "ARICA", nombre: "FERRETERIA", notas: null }).score;
    expect(fuera).toBeLessThan(dentro);
  });
  it("devuelve motivos explicables", () => {
    const r = puntuar({ region: "ÑUBLE", nombre: "FERRETERIA", notas: null });
    expect(r.motivos.length).toBeGreaterThan(0);
  });
});

describe("construirModelo (aprende del historial)", () => {
  it("aprende un rubro negativo desde los datos", () => {
    const hist: Historico[] = [
      { estado: "REALIZADA", region: "ÑUBLE", nombre: "FERRETERIA", notas: null },
      { estado: "REALIZADA", region: "ÑUBLE", nombre: "FERRETERIA herramientas", notas: null },
      { estado: "NO_EJECUTABLE", region: "ÑUBLE", nombre: "ARTICULOS HOSPITAL", notas: null },
      { estado: "NO_EJECUTABLE", region: "ÑUBLE", nombre: "HOSPITAL insumos", notas: null },
    ];
    const m = construirModelo(hist);
    expect(m.keywords["HOSPITAL"]).toBeLessThan(0);
    expect(m.keywords["FERRETERIA"]).toBeGreaterThan(0);
  });
});

describe("prioridad", () => {
  it("clasifica por umbrales", () => {
    expect(prioridad(80)).toBe("alta");
    expect(prioridad(50)).toBe("media");
    expect(prioridad(20)).toBe("baja");
  });
});
