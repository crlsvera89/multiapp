import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchPorCodigo, tipoDesdeCodigo } from "@/lib/chilecompra";
import { derivarTipoLicitacion } from "@/lib/normalizer";

export const dynamic = "force-dynamic";

function tablaDe(codigo: string): "compras_agiles" | "licitaciones" {
  return tipoDesdeCodigo(codigo) === "COT" ? "compras_agiles" : "licitaciones";
}

/** GET /api/buscar-codigo?codigo=... → previsualiza un proceso desde Mercado Público. */
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const codigo = new URL(req.url).searchParams.get("codigo")?.trim();
  if (!codigo) return NextResponse.json({ error: "Falta el código" }, { status: 400 });

  const item = await fetchPorCodigo(codigo, process.env.MP_TICKET ?? "");
  if (!item) return NextResponse.json({ error: "No encontrado en Mercado Público" }, { status: 404 });

  const { data: existe } = await supabase
    .from(tablaDe(codigo))
    .select("id")
    .eq("codigo", item.codigo)
    .maybeSingle();

  return NextResponse.json({ item, yaExiste: !!existe });
}

/** POST /api/buscar-codigo  body: { codigo } → importa ese proceso. */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { codigo } = await req.json();
  if (!codigo) return NextResponse.json({ error: "Falta el código" }, { status: 400 });

  const item = await fetchPorCodigo(String(codigo).trim(), process.env.MP_TICKET ?? "");
  if (!item) return NextResponse.json({ error: "No encontrado en Mercado Público" }, { status: 404 });

  const tabla = tablaDe(item.codigo);
  const nombre = user.user_metadata?.full_name ?? user.email ?? "Usuario";

  const row: Record<string, unknown> = {
    codigo: item.codigo,
    nombre: item.nombre || null,
    institucion: item.organismo || null,
    region: item.region,
    fecha_publicacion: item.fecha_publicacion ? item.fecha_publicacion.slice(0, 10) : null,
    fecha_cierre: item.fecha_cierre,
    monto: item.monto,
    estado: "NUEVO",
    subido_por: nombre,
    created_by: user.id,
  };
  if (tabla === "licitaciones") row.tipo = derivarTipoLicitacion(item.codigo);

  const { error } = await supabase
    .from(tabla)
    .upsert(row, { onConflict: "codigo", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, tabla, codigo: item.codigo });
}
