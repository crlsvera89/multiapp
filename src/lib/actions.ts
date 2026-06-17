"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizarEstado, derivarTipoLicitacion } from "@/lib/normalizer";
import type { EstadoProceso } from "@/lib/types";

type Tabla = "compras_agiles" | "licitaciones";

function basePath(tabla: Tabla) {
  return tabla === "compras_agiles" ? "/compras-agiles" : "/licitaciones";
}

/** Convierte un valor de formulario vacío en null. */
function v(form: FormData, key: string): string | null {
  const val = (form.get(key) as string | null)?.trim();
  return val ? val : null;
}

function payloadComun(form: FormData, userId: string | null) {
  const estadoRaw = v(form, "estado");
  const montoRaw = v(form, "monto");
  return {
    region: v(form, "region"),
    vendedor: v(form, "vendedor"),
    estado: (estadoRaw ?? "SIN_ESTADO") as EstadoProceso,
    estado_original: estadoRaw,
    fecha_publicacion: v(form, "fecha_publicacion"),
    fecha_cierre: v(form, "fecha_cierre"), // datetime-local -> ISO local
    revisar_label: v(form, "revisar_label"),
    monto: montoRaw ? Number(montoRaw) : null,
    notas: v(form, "notas"),
    updated_by: userId,
  };
}

/** Crea o actualiza un proceso. Si hay id => update, si no => insert. */
export async function guardarProceso(tabla: Tabla, form: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const id = v(form, "id");
  const codigo = v(form, "codigo");
  if (!codigo) throw new Error("El código es obligatorio.");

  // El estado puede venir ya como enum desde el <select>; normalizamos por si acaso.
  const base = payloadComun(form, user?.id ?? null);
  const estado = ["NUEVO", "EN_CURSO", "REALIZADA", "NO_EJECUTABLE", "CERRADA", "SIN_ESTADO"].includes(
    base.estado
  )
    ? base.estado
    : normalizarEstado(base.estado);

  const registro: Record<string, unknown> = { ...base, estado, codigo };
  if (tabla === "licitaciones") {
    registro.tipo = derivarTipoLicitacion(codigo);
    registro.anteriores = v(form, "anteriores");
  }

  if (id) {
    const { error } = await supabase.from(tabla).update(registro).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    registro.created_by = user?.id ?? null;
    const { error } = await supabase.from(tabla).insert(registro);
    if (error) throw new Error(error.message);
  }

  revalidatePath(basePath(tabla));
  redirect(basePath(tabla));
}

/** "Tomar" un proceso: lo asigna al usuario logueado para trabajarlo. */
export async function tomarProceso(tabla: Tabla, id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nombre = user?.user_metadata?.full_name ?? user?.email ?? "Usuario";

  const { error } = await supabase
    .from(tabla)
    .update({ trabajado_por: nombre, trabajado_en: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`${basePath(tabla)}/${id}/editar`);
}

/** Elimina un proceso. */
export async function eliminarProceso(tabla: Tabla, id: string) {
  const supabase = createClient();
  const { error } = await supabase.from(tabla).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(basePath(tabla));
  redirect(basePath(tabla));
}
