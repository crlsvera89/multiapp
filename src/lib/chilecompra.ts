/**
 * Cliente de Mercado Público (ChileCompra) — ingesta real.
 * Portado y adaptado desde el sync probado de chilecompra2.
 *
 * Fuentes:
 *  - Compras Ágiles (COT): buscador de Mercado Público
 *      auth: servicios-prd.mercadopublico.cl/v1/auth/publico
 *      datos: api.buscador.mercadopublico.cl/compra-agil  (x-api-key pública del buscador)
 *  - Licitaciones (LE/LP/LR/L1): API oficial api.mercadopublico.cl (requiere ticket)
 *
 * Fechas: se parsean SIEMPRE respetando America/Santiago (horario verano/invierno)
 * con date-fns-tz, nunca con offset fijo.
 */
import { fromZonedTime } from "date-fns-tz";

const TZ = "America/Santiago";

const MP_AUTH_URL = "https://servicios-prd.mercadopublico.cl/v1/auth/publico";
const MP_SEARCH_URL = "https://api.buscador.mercadopublico.cl/compra-agil";
// Clave PÚBLICA del buscador (la misma que usa buscador.mercadopublico.cl).
// Se puede sobreescribir por env si ChileCompra la cambia.
const MP_BUSCADOR_KEY =
  process.env.MP_BUSCADOR_API_KEY ?? "e93089e4-437c-4723-b343-4fa20045e3bc";

const MP_API_URL =
  "https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json";

/** Código numérico de región (MP) → nombre usado en el sistema. */
export const REGION_NOMBRE: Record<string, string> = {
  "7": "MAULE",
  "8": "BIO BIO",
  "13": "METROPOLITANA",
  "15": "ARICA",
  "16": "ÑUBLE",
};
/** Regiones por defecto a sincronizar (las del negocio). */
export const REGIONES_DEFAULT = ["16", "8", "7"]; // Ñuble, Biobío, Maule

export type TipoItem = "COT" | "LE" | "LP" | "LR" | "L1" | "LC";

export interface ItemSync {
  codigo: string;
  nombre: string;
  fecha_publicacion: string | null; // ISO UTC
  fecha_cierre: string | null; // ISO UTC
  organismo: string;
  monto: number | null;
  tipo: TipoItem;
  region: string | null; // nombre de región
}

/** Convierte cualquier formato de fecha de MP a ISO UTC respetando zona Chile. */
export function parseFechaMP(s: string | null | undefined): string | null {
  if (!s) return null;
  const txt = String(s).trim();

  // Ya viene con zona (Z u offset): parsear directo
  if (txt.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(txt)) {
    const d = new Date(txt);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  // Buscador: "2026-06-02 16:49"
  let m = txt.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (m) return fromZonedTime(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00`, TZ).toISOString();
  // API oficial ISO sin offset: "2026-06-02T16:41:22.677"
  m = txt.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
  if (m) return fromZonedTime(m[1], TZ).toISOString();
  // API oficial chilena: "03-06-2026 9:02:58"
  m = txt.match(/^(\d{1,2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const local = `${m[3]}-${m[2]}-${m[1].padStart(2, "0")}T${m[4].padStart(2, "0")}:${m[5]}:${m[6] ?? "00"}`;
    return fromZonedTime(local, TZ).toISOString();
  }
  return null;
}

/** Tipo de proceso a partir del sufijo del código externo. */
export function tipoDesdeCodigo(codigo: string): TipoItem {
  const m = codigo.match(/-(L[A-Z0-9]+|CO[A-Z]?\d*)$/i);
  if (!m) return "COT";
  // El año son los 2 últimos dígitos; el resto es el tipo (ej. L126 -> L1, LE26 -> LE).
  const t = m[1].replace(/\d{2}$/, "").toUpperCase();
  if (t === "L1") return "L1";
  if (t === "LE") return "LE";
  if (t === "LP") return "LP";
  if (t === "LR") return "LR";
  if (t === "LC") return "LC";
  return "COT";
}

async function tokenBuscador(): Promise<string> {
  const res = await fetch(MP_AUTH_URL, {
    headers: { Accept: "application/json", Origin: "https://buscador.mercadopublico.cl" },
    cache: "no-store",
  });
  return (await res.json()).payload.access_token;
}

function headersBuscador(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "x-api-key": MP_BUSCADOR_KEY,
    Accept: "application/json",
    Origin: "https://buscador.mercadopublico.cl",
  };
}

/** Compras Ágiles (COT) desde el buscador, por rango de fecha y regiones. */
export async function fetchCOT(
  dateFrom: string,
  dateTo: string,
  regiones: string[] = REGIONES_DEFAULT
): Promise<ItemSync[]> {
  const token = await tokenBuscador();

  const fetchRegion = async (region: string): Promise<ItemSync[]> => {
    const headers = headersBuscador(token);
    const fetchPag = async (page: number) => {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        order_by: "recent",
        region,
        status: "2",
        page_number: String(page),
      });
      const res = await fetch(`${MP_SEARCH_URL}?${params}`, { headers, cache: "no-store" });
      const json = await res.json();
      return {
        resultados: json.payload?.resultados ?? [],
        pageCount: json.payload?.pageCount ?? 1,
      };
    };
    const primera = await fetchPag(1);
    let todas = [...primera.resultados];
    for (let p = 2; p <= Math.min(primera.pageCount, 10); p++) {
      todas = todas.concat((await fetchPag(p)).resultados);
    }
    return todas.map((r: Record<string, unknown>) => ({
      codigo: String(r.codigo),
      nombre: String(r.nombre ?? ""),
      fecha_publicacion: parseFechaMP(r.fecha_publicacion as string),
      fecha_cierre: parseFechaMP(r.fecha_cierre as string),
      organismo: String(r.organismo ?? ""),
      monto: typeof r.monto_disponible_CLP === "number" ? r.monto_disponible_CLP : null,
      tipo: "COT" as const,
      region: REGION_NOMBRE[region] ?? region,
    }));
  };

  const res = await Promise.all(regiones.map((r) => fetchRegion(r).catch(() => [] as ItemSync[])));
  return dedupPorCodigo(res.flat());
}

/** Licitaciones (LE/LP/LR/L1) desde la API oficial. */
export async function fetchLicitaciones(
  ticket: string,
  regiones: string[] = REGIONES_DEFAULT
): Promise<ItemSync[]> {
  if (!ticket) return [];
  const fetchRegion = async (region: string): Promise<ItemSync[]> => {
    const res = await fetch(
      `${MP_API_URL}?ticket=${ticket}&estado=publicada&region=${region}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    if (json.Codigo && json.Codigo !== 200) return [];
    return (json.Listado ?? []).map((r: Record<string, unknown>) => {
      const fechas = r.Fechas as Record<string, string> | null;
      const comprador = r.Comprador as Record<string, string> | null;
      const codigo = String(r.CodigoExterno ?? "");
      return {
        codigo,
        nombre: String(r.Nombre ?? ""),
        fecha_publicacion: parseFechaMP(fechas?.FechaPublicacion),
        fecha_cierre: parseFechaMP(fechas?.FechaCierre),
        organismo: String(comprador?.NombreOrganismo ?? comprador?.NombreUnidad ?? ""),
        monto: typeof r.MontoEstimado === "number" ? r.MontoEstimado : null,
        tipo: tipoDesdeCodigo(codigo),
        region: REGION_NOMBRE[region] ?? region,
      };
    });
  };
  const res = await Promise.all(regiones.map((r) => fetchRegion(r).catch(() => [] as ItemSync[])));
  return dedupPorCodigo(res.flat());
}

/** Busca un proceso puntual por su código (licitaciones por API oficial). */
export async function fetchPorCodigo(
  codigo: string,
  ticket: string
): Promise<ItemSync | null> {
  if (tipoDesdeCodigo(codigo) === "COT") {
    // El buscador no permite buscar por código directo: traer últimos 90 días y filtrar.
    try {
      const token = await tokenBuscador();
      const hoy = new Date();
      const fmt = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
      const desde = new Date(hoy.getTime() - 90 * 86400000);
      const objetivo = codigo.trim().toUpperCase();
      const headers = headersBuscador(token);
      for (let page = 1; page <= 20; page++) {
        const params = new URLSearchParams({
          date_from: fmt(desde),
          date_to: fmt(hoy),
          order_by: "recent",
          page_number: String(page),
        });
        const res = await fetch(`${MP_SEARCH_URL}?${params}`, { headers, cache: "no-store" });
        const json = await res.json();
        const resultados: Record<string, unknown>[] = json.payload?.resultados ?? [];
        const r = resultados.find((x) => String(x.codigo ?? "").trim().toUpperCase() === objetivo);
        if (r) {
          return {
            codigo: String(r.codigo),
            nombre: String(r.nombre ?? ""),
            fecha_publicacion: parseFechaMP(r.fecha_publicacion as string),
            fecha_cierre: parseFechaMP(r.fecha_cierre as string),
            organismo: String(r.organismo ?? ""),
            monto: typeof r.monto_disponible_CLP === "number" ? r.monto_disponible_CLP : null,
            tipo: "COT",
            region: null,
          };
        }
        if (page >= (json.payload?.pageCount ?? 1)) break;
      }
    } catch {
      /* ignorar */
    }
    return null;
  }

  if (!ticket) return null;
  try {
    const res = await fetch(`${MP_API_URL}?ticket=${ticket}&codigo=${encodeURIComponent(codigo)}`, {
      cache: "no-store",
    });
    const json = await res.json();
    const r = (json.Listado ?? [])[0];
    if (!r) return null;
    const fechas = r.Fechas as Record<string, string> | null;
    const comprador = r.Comprador as Record<string, string> | null;
    const cod = String(r.CodigoExterno ?? "");
    return {
      codigo: cod,
      nombre: String(r.Nombre ?? ""),
      fecha_publicacion: parseFechaMP(fechas?.FechaPublicacion),
      fecha_cierre: parseFechaMP(fechas?.FechaCierre),
      organismo: String(comprador?.NombreOrganismo ?? comprador?.NombreUnidad ?? ""),
      monto: typeof r.MontoEstimado === "number" ? r.MontoEstimado : null,
      tipo: tipoDesdeCodigo(cod),
      region: null,
    };
  } catch {
    return null;
  }
}

function dedupPorCodigo(items: ItemSync[]): ItemSync[] {
  const vistos = new Set<string>();
  return items.filter((i) => {
    if (!i.codigo || vistos.has(i.codigo)) return false;
    vistos.add(i.codigo);
    return true;
  });
}
