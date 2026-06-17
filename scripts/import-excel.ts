/**
 * Importador de Excel -> Supabase.
 *
 * Uso:
 *   npm run import:excel -- ./ruta/a/tu/planilla.xlsx [--dry]
 *
 * --dry  : solo muestra el resumen, NO escribe en la base.
 *
 * Aplica la misma limpieza que el seed:
 *   - normaliza código (sin espacios/saltos)
 *   - mapea estado al enum
 *   - separa fecha_cierre real de la marca "REVISAR N"
 *   - corrige años 2029 -> 2026
 *   - deriva tipo de licitación
 *   - upsert por 'codigo' (no duplica al reimportar)
 *
 * Requiere SUPABASE_SERVICE_ROLE_KEY (solo se usa aquí, en servidor).
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import {
  normalizarEstado,
  limpiarCodigo,
  parsearCierre,
  parsearFechaHora,
  derivarTipoLicitacion,
} from "../src/lib/normalizer";

const file = process.argv[2];
const dry = process.argv.includes("--dry");

if (!file) {
  console.error("Falta la ruta del Excel. Ej: npm run import:excel -- planilla.xlsx");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dry && (!url || !serviceKey)) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

function fechaISO(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

function filasDeHoja(ws: XLSX.WorkSheet): string[][] {
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, {
    header: 1,
    raw: false,
    defval: "",
  });
  return rows.map((r) => r.map((c) => (c ?? "").toString()));
}

/** Detecta la fila de encabezado (la primera con un código tipo COT/L en col 0). */
function indiceDatos(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const c = limpiarCodigo(rows[i][0] ?? "");
    if (/-(COT|L[EPQR1]?\d*)\d*$/i.test(c) || /COT\d+$/i.test(c) || /L[EP]\d+$/i.test(c)) {
      return i;
    }
  }
  return 1;
}

function mapCompraAgil(r: string[]) {
  const codigo = limpiarCodigo(r[0] ?? "");
  if (!codigo) return null;
  const { fechaCierre, revisarLabel } = parsearCierre(r[5]);
  return {
    codigo,
    region: (r[1] ?? "").trim() || null,
    vendedor: (r[2] ?? "").trim() || null,
    estado: normalizarEstado(r[3]),
    estado_original: (r[3] ?? "").trim() || null,
    fecha_publicacion: fechaISO(parsearFechaHora(r[4]))?.slice(0, 10) ?? null,
    fecha_cierre: fechaISO(fechaCierre),
    revisar_label: revisarLabel,
    subido_por: (r[6] ?? "").trim() || null,
    notas: (r[7] ?? "").trim() || null,
  };
}

function mapLicitacion(r: string[]) {
  const codigo = limpiarCodigo(r[0] ?? "");
  if (!codigo) return null;
  const { fechaCierre, revisarLabel } = parsearCierre(r[5]);
  return {
    codigo,
    tipo: derivarTipoLicitacion(codigo),
    region: (r[1] ?? "").trim() || null,
    vendedor: (r[2] ?? "").trim() || null,
    estado: normalizarEstado(r[3]),
    estado_original: (r[3] ?? "").trim() || null,
    fecha_publicacion: fechaISO(parsearFechaHora(r[4]))?.slice(0, 10) ?? null,
    fecha_cierre: fechaISO(fechaCierre),
    revisar_label: revisarLabel,
    subido_por: (r[6] ?? "").trim() || null,
    notas: (r[7] ?? "").trim() || null,
    anteriores: (r[8] ?? "").trim() || null,
  };
}

function dedup<T extends { codigo: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter((x) => (seen.has(x.codigo) ? false : (seen.add(x.codigo), true)));
}

async function main() {
  const wb = XLSX.read(readFileSync(file), { type: "buffer" });

  const wsCA = wb.Sheets["COMPRA AGIL"];
  const wsLic = wb.Sheets["LICITACIONES"];
  if (!wsCA || !wsLic) {
    console.error("El Excel debe tener hojas 'COMPRA AGIL' y 'LICITACIONES'.");
    process.exit(1);
  }

  const rowsCA = filasDeHoja(wsCA);
  const rowsLic = filasDeHoja(wsLic);

  const ca = dedup(
    rowsCA
      .slice(indiceDatos(rowsCA) + 1)
      .map(mapCompraAgil)
      .filter((x): x is NonNullable<typeof x> => x !== null)
  );
  const lic = dedup(
    rowsLic
      .slice(indiceDatos(rowsLic) + 1)
      .map(mapLicitacion)
      .filter((x): x is NonNullable<typeof x> => x !== null)
  );

  console.log("── Resumen de importación ──");
  console.log(`Compras Ágiles: ${ca.length} filas`);
  console.log(`  con fecha real: ${ca.filter((x) => x.fecha_cierre).length}`);
  console.log(`  con REVISAR:    ${ca.filter((x) => x.revisar_label).length}`);
  console.log(`Licitaciones:   ${lic.length} filas`);

  if (dry) {
    console.log("\n[--dry] No se escribió nada en la base.");
    return;
  }

  const supabase = createClient(url!, serviceKey!, {
    auth: { persistSession: false },
  });

  const r1 = await supabase
    .from("compras_agiles")
    .upsert(ca, { onConflict: "codigo" });
  if (r1.error) throw r1.error;

  const r2 = await supabase
    .from("licitaciones")
    .upsert(lic, { onConflict: "codigo" });
  if (r2.error) throw r2.error;

  console.log("\n✓ Importación completada.");
}

main().catch((e) => {
  console.error("Error en la importación:", e.message ?? e);
  process.exit(1);
});
