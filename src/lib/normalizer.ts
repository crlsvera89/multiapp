import type { EstadoProceso, TipoLicitacion } from "./types";

/**
 * Normaliza el valor de "Estado" del Excel a uno de los estados del sistema.
 * Estados reales encontrados en el Excel: Nuevo, En curso, Realizada,
 * No ejecutable, Cerrada (y vacío -> SIN_ESTADO).
 */
export function normalizarEstado(
  valor: string | null | undefined
): EstadoProceso {
  if (!valor) return "SIN_ESTADO";
  const v = valor
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();

  if (v === "NUEVO") return "NUEVO";
  if (v === "EN CURSO") return "EN_CURSO";
  if (v === "REALIZADA") return "REALIZADA";
  if (v === "NO EJECUTABLE") return "NO_EJECUTABLE";
  if (v === "CERRADA") return "CERRADA";
  return "SIN_ESTADO";
}

/** Limpia un código de proceso: sin espacios extremos ni saltos de línea. */
export function limpiarCodigo(codigo: string): string {
  return codigo.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * La columna "fecha cierre" del Excel mezcla fechas reales y marcas "REVISAR N".
 * Devuelve {fechaCierre} si es fecha real (corrige typos de año 2029 -> 2026),
 * o {revisarLabel} normalizado ("REVISAR 11") si es una marca de revisión.
 */
export function parsearCierre(valor: string | null | undefined): {
  fechaCierre: Date | null;
  revisarLabel: string | null;
} {
  if (!valor || !valor.trim()) return { fechaCierre: null, revisarLabel: null };
  const txt = valor.trim();

  // ¿Es marca tipo REVISAR/REVISA R/REVIAR + número?
  if (/REVIS|REVIA/i.test(txt)) {
    const n = txt.match(/\d+/);
    return { fechaCierre: null, revisarLabel: n ? `REVISAR ${n[0]}` : txt.toUpperCase() };
  }

  const fecha = parsearFechaHora(txt);
  if (fecha) {
    if (fecha.getFullYear() === 2029) fecha.setFullYear(2026); // typo conocido
    return { fechaCierre: fecha, revisarLabel: null };
  }
  // No es ni fecha ni REVISAR reconocible: lo guardamos como label crudo.
  return { fechaCierre: null, revisarLabel: txt };
}

/** Parsea fechas chilenas day-first: d/m/Y [H:M:S]. */
export function parsearFechaHora(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const m = valor
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [, d, mo, y, h = "0", mi = "0", s = "0"] = m;
  const date = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s)
  );
  return isNaN(date.getTime()) ? null : date;
}

/** Deriva el tipo de licitación del sufijo del código (3361-6-L126 -> L1). */
export function derivarTipoLicitacion(codigo: string): TipoLicitacion {
  const token = limpiarCodigo(codigo).split("-").pop() ?? "";
  const prefijo = token.replace(/\d{2}$/, "").toUpperCase(); // quita los 2 dígitos de año
  if (["L1", "LE", "LP", "LQ", "LR"].includes(prefijo)) {
    return prefijo as TipoLicitacion;
  }
  return "OTRO";
}
