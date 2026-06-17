/**
 * Puntaje de oportunidades (Etapa 1).
 *
 * Idea: priorizar las oportunidades NUEVAS según el historial del equipo.
 * NO es una caja negra: es un modelo transparente derivado de los datos.
 *
 *  - `construirModelo(historial)` calcula pesos por región y por palabra clave
 *    a partir de procesos ya clasificados (REALIZADA = positivo;
 *    NO_EJECUTABLE / CERRADA = negativo). Cuanto más marque el equipo, mejor.
 *  - `puntuar(proceso, modelo)` devuelve un score 0–100 + los motivos.
 *
 * Cold-start: si todavía no hay suficiente historial, se usa MODELO_DEFAULT,
 * derivado del análisis del Excel inicial.
 */

export interface Modelo {
  regiones: Record<string, number>; // -1..1
  keywords: Record<string, number>; // -1..1
  defaultRegion: number;
}

export interface ProcesoPuntuable {
  region?: string | null;
  nombre?: string | null;
  notas?: string | null;
  estado_original?: string | null;
}

export interface Historico extends ProcesoPuntuable {
  estado: string;
}

const STOPWORDS = new Set([
  "PARA", "CON", "LOS", "LAS", "DEL", "POR", "QUE", "UNA", "UNO", "SIN",
  "MAS", "ESPERA", "ESPERANDO", "RESPUESTA", "REVISAR", "ENVIADA", "ENVIADO",
]);

/** Tokeniza nombre + notas en palabras significativas (>=4 letras, sin tildes). */
export function tokens(p: ProcesoPuntuable): string[] {
  const txt = `${p.nombre ?? ""} ${p.notas ?? ""}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
  const raw = txt.match(/[A-Z]{4,}/g) ?? [];
  return Array.from(new Set(raw)).filter((t) => !STOPWORDS.has(t));
}

/** Construye el modelo a partir del historial clasificado. */
export function construirModelo(historial: Historico[]): Modelo {
  const kpos: Record<string, number> = {};
  const kneg: Record<string, number> = {};
  const rpos: Record<string, number> = {};
  const rneg: Record<string, number> = {};

  for (const h of historial) {
    const e = h.estado?.toUpperCase();
    const pos = e === "REALIZADA";
    const neg = e === "NO_EJECUTABLE" || e === "CERRADA";
    if (!pos && !neg) continue; // NUEVO/EN_CURSO/SIN_ESTADO no entrenan

    const reg = (h.region ?? "").trim().toUpperCase();
    if (reg) (pos ? rpos : rneg)[reg] = ((pos ? rpos : rneg)[reg] ?? 0) + 1;

    for (const t of tokens(h)) {
      (pos ? kpos : kneg)[t] = ((pos ? kpos : kneg)[t] ?? 0) + 1;
    }
  }

  // Afinidad con suavizado de Laplace: (pos-neg)/(pos+neg+k)
  const K = 2;
  const afinidad = (
    pos: Record<string, number>,
    neg: Record<string, number>,
    minTotal: number
  ) => {
    const out: Record<string, number> = {};
    const claves = new Set([...Object.keys(pos), ...Object.keys(neg)]);
    for (const c of claves) {
      const p = pos[c] ?? 0;
      const n = neg[c] ?? 0;
      if (p + n < minTotal) continue;
      out[c] = (p - n) / (p + n + K);
    }
    return out;
  };

  return {
    keywords: afinidad(kpos, kneg, 2),
    regiones: afinidad(rpos, rneg, 1),
    defaultRegion: -0.3, // regiones sin historial: leve penalización
  };
}

/** Modelo por defecto (cold-start), derivado del Excel inicial. */
export const MODELO_DEFAULT: Modelo = {
  regiones: { "ÑUBLE": 0.9, "BIO BIO": 0.9, "MAULE": 0.8, "METROPOLITANA": -0.2, "ARICA": -0.1 },
  defaultRegion: -0.4,
  keywords: {
    FERRETERIA: 1, HERRAMIENTAS: 0.9, ELECTRICO: 0.8, POLIETILENO: 0.8, HDPE: 0.8,
    MALLAS: 0.7, SILLAS: 0.6, ESTANQUE: 0.7, PINTURAS: 0.6, MADERA: 0.6,
    FERTILIZANTE: 0.6, SEMILLAS: 0.5, BOMBA: 0.6, TORNILLOS: 0.6, MANGUERA: 0.6,
    TUBERIA: 0.6, HORMIGON: 0.5, POLINES: 0.5, GEOTEXTIL: 0.4, SEGURIDAD: 0.5,
    ZAPATOS: 0.4, BOTAS: 0.4, MOTOSIERRA: 0.5, MOTOR: 0.4,
    // negativos conocidos
    COMPUTACION: -0.8, LIBRERIA: -0.8, HOSPITAL: -0.6, AUTOCONSUMO: -0.7,
  },
};

export interface Puntaje {
  score: number; // 0..100
  motivos: string[];
}

/** Puntúa una oportunidad con el modelo dado. */
export function puntuar(p: ProcesoPuntuable, modelo: Modelo = MODELO_DEFAULT): Puntaje {
  let score = 50;
  const motivos: string[] = [];

  // Región
  const reg = (p.region ?? "").trim().toUpperCase();
  const wReg = reg in modelo.regiones ? modelo.regiones[reg] : modelo.defaultRegion;
  const aporteReg = Math.round(wReg * 18);
  score += aporteReg;
  if (reg) {
    motivos.push(`${aporteReg >= 0 ? "+" : ""}${aporteReg} región ${reg}`);
  }

  // Palabras clave
  const tks = tokens(p);
  const matches = tks
    .map((t) => ({ t, w: modelo.keywords[t] ?? 0 }))
    .filter((m) => m.w !== 0)
    .sort((a, b) => Math.abs(b.w) - Math.abs(a.w));

  let aporteKw = 0;
  for (const m of matches) aporteKw += m.w * 14;
  aporteKw = Math.max(-35, Math.min(40, Math.round(aporteKw)));
  score += aporteKw;

  for (const m of matches.slice(0, 3)) {
    const a = Math.round(m.w * 14);
    motivos.push(`${a >= 0 ? "+" : ""}${a} ${m.t.toLowerCase()}`);
  }
  if (matches.length === 0) motivos.push("sin rubro reconocido");

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, motivos };
}

/** Etiqueta de prioridad para la UI. */
export function prioridad(score: number): "alta" | "media" | "baja" {
  if (score >= 70) return "alta";
  if (score >= 45) return "media";
  return "baja";
}
