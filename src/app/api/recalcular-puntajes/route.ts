import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  construirModelo,
  puntuar,
  MODELO_DEFAULT,
  type Historico,
} from "@/lib/scoring";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/recalcular-puntajes
 * Reconstruye el modelo desde TODO el historial clasificado y recalcula el
 * puntaje de las oportunidades en estado NUEVO. Este es el "aprendizaje":
 * mientras más procesos marque el equipo como Realizada / No ejecutable,
 * más afinado queda el puntaje.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const [ca, lic] = await Promise.all([
    supabase.from("compras_agiles").select("estado, region, nombre, notas"),
    supabase.from("licitaciones").select("estado, region, nombre, notas"),
  ]);
  const hist = [...(ca.data ?? []), ...(lic.data ?? [])] as Historico[];
  const entrenables = hist.filter((h) =>
    ["REALIZADA", "NO_EJECUTABLE", "CERRADA"].includes((h.estado ?? "").toUpperCase())
  ).length;
  const modelo = entrenables >= 20 ? construirModelo(hist) : MODELO_DEFAULT;

  let actualizados = 0;
  for (const tabla of ["compras_agiles", "licitaciones"] as const) {
    const { data } = await supabase
      .from(tabla)
      .select("id, region, nombre, notas")
      .eq("estado", "NUEVO");
    for (const row of data ?? []) {
      const pj = puntuar(row, modelo);
      const { error } = await supabase
        .from(tabla)
        .update({ puntaje: pj.score, puntaje_motivos: pj.motivos.join(" · ") })
        .eq("id", (row as { id: string }).id);
      if (!error) actualizados++;
    }
  }

  return NextResponse.json({
    ok: true,
    modelo: entrenables >= 20 ? "aprendido del historial" : "por defecto (poco historial)",
    historial_entrenable: entrenables,
    actualizados,
  });
}
