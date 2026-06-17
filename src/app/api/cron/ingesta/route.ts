import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  fetchCOT,
  fetchLicitaciones,
  REGIONES_DEFAULT,
  type ItemSync,
} from "@/lib/chilecompra";
import {
  construirModelo,
  puntuar,
  MODELO_DEFAULT,
  type Modelo,
  type Historico,
} from "@/lib/scoring";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const AUTOR = "CLAUDE (auto)";

/**
 * Ingesta horaria desde Mercado Público (Vercel Cron, ver vercel.json).
 * - COT desde el buscador -> tabla compras_agiles
 * - Licitaciones desde la API oficial -> tabla licitaciones
 *
 * Regla clave (portada de chilecompra2): para procesos que YA existen solo se
 * actualizan metadatos (nombre, fechas, monto, organismo). NUNCA se pisa el
 * trabajo del equipo: estado, notas, vendedor, trabajado_por, revisar_label.
 * Sincronización incremental con la tabla sync_estado.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const ticket = process.env.MP_TICKET ?? "";
  const hoy = new Date();
  const toChile = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Santiago" });

  // Watermarks (última publicación sincronizada por tipo)
  const { data: estado } = await supabase
    .from("sync_estado")
    .select("ultima_publicacion_cot, ultima_publicacion_lic")
    .eq("id", 1)
    .maybeSingle();
  const ultCOT = estado?.ultima_publicacion_cot ? new Date(estado.ultima_publicacion_cot) : null;
  const ultLIC = estado?.ultima_publicacion_lic ? new Date(estado.ultima_publicacion_lic) : null;

  const dateFrom = ultCOT ? toChile(ultCOT) : toChile(new Date(hoy.getTime() - 7 * 86400000));
  const dateTo = toChile(hoy);

  const resumen: Record<string, unknown> = { inicio: new Date().toISOString() };
  try {
    const [cot, lic] = await Promise.all([
      fetchCOT(dateFrom, dateTo, REGIONES_DEFAULT).catch((e) => {
        resumen.error_cot = String(e.message ?? e);
        return [] as ItemSync[];
      }),
      fetchLicitaciones(ticket, REGIONES_DEFAULT).catch((e) => {
        resumen.error_lic = String(e.message ?? e);
        return [] as ItemSync[];
      }),
    ]);

    const modelo = await cargarModelo(supabase);

    const rCA = await upsertConservando(supabase, "compras_agiles", cot, modelo);
    const rLic = await upsertConservando(supabase, "licitaciones", lic, modelo);

    // Avanzar watermarks con la última publicación vista
    const maxPub = (items: ItemSync[]) =>
      items.reduce<Date | null>((max, i) => {
        const p = i.fecha_publicacion ? new Date(i.fecha_publicacion) : null;
        return p && (!max || p > max) ? p : max;
      }, null);
    const updates: Record<string, string | number> = { id: 1, actualizado_en: new Date().toISOString() };
    const mc = maxPub(cot);
    const ml = maxPub(lic);
    if (mc && (!ultCOT || mc > ultCOT)) updates.ultima_publicacion_cot = mc.toISOString();
    if (ml && (!ultLIC || ml > ultLIC)) updates.ultima_publicacion_lic = ml.toISOString();
    await supabase.from("sync_estado").upsert(updates, { onConflict: "id" });

    return NextResponse.json({
      ok: true,
      ...resumen,
      compras_agiles: rCA,
      licitaciones: rLic,
      fin: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e), ...resumen }, { status: 500 });
  }
}

/**
 * Inserta procesos nuevos (estado NUEVO, subido_por CLAUDE auto) y, si ya existen,
 * actualiza SOLO metadatos preservando el trabajo del usuario.
 */
/** Construye el modelo de puntaje desde el historial clasificado de la base. */
async function cargarModelo(supabase: ReturnType<typeof createClient>): Promise<Modelo> {
  const [ca, lic] = await Promise.all([
    supabase.from("compras_agiles").select("estado, region, nombre, notas"),
    supabase.from("licitaciones").select("estado, region, nombre, notas"),
  ]);
  const hist = [...(ca.data ?? []), ...(lic.data ?? [])] as Historico[];
  const entrenables = hist.filter((h) =>
    ["REALIZADA", "NO_EJECUTABLE", "CERRADA"].includes((h.estado ?? "").toUpperCase())
  ).length;
  // Si hay poco historial, usar el modelo por defecto (cold-start).
  return entrenables >= 20 ? construirModelo(hist) : MODELO_DEFAULT;
}

async function upsertConservando(
  supabase: ReturnType<typeof createClient>,
  tabla: "compras_agiles" | "licitaciones",
  items: ItemSync[],
  modelo: Modelo
) {
  let nuevos = 0;
  let actualizados = 0;
  const errores: string[] = [];

  for (const it of items) {
    const codigo = it.codigo.trim();
    if (!codigo) continue;

    const pj = puntuar({ region: it.region, nombre: it.nombre, notas: it.organismo }, modelo);

    const metadatos: Record<string, unknown> = {
      nombre: it.nombre || null,
      institucion: it.organismo || null,
      region: it.region,
      fecha_publicacion: it.fecha_publicacion ? it.fecha_publicacion.slice(0, 10) : null,
      fecha_cierre: it.fecha_cierre,
      monto: it.monto,
      puntaje: pj.score,
      puntaje_motivos: pj.motivos.join(" · "),
    };

    const insertRow: Record<string, unknown> = {
      ...metadatos,
      codigo,
      estado: "NUEVO",
      subido_por: AUTOR,
    };
    if (tabla === "licitaciones") {
      const { derivarTipoLicitacion } = await import("@/lib/normalizer");
      insertRow.tipo = derivarTipoLicitacion(codigo);
    }

    const { error: insErr } = await supabase.from(tabla).insert(insertRow);
    if (insErr) {
      if ((insErr as { code?: string }).code === "23505") {
        // Ya existe -> actualizar solo metadatos, preservando estado/notas/vendedor/trabajado_por
        const { error: updErr } = await supabase.from(tabla).update(metadatos).eq("codigo", codigo);
        if (updErr) errores.push(`${codigo}: ${updErr.message}`);
        else actualizados++;
      } else {
        errores.push(`${codigo}: ${insErr.message}`);
      }
    } else {
      nuevos++;
    }
  }
  return { recibidos: items.length, nuevos, actualizados, errores: errores.slice(0, 10) };
}
