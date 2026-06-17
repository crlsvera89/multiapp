import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ESTADO_COLOR, type EstadoProceso } from "@/lib/types";
import {
  construirGrillaMes,
  rangoGrilla,
  normalizarMes,
  NOMBRES_MES,
  DIAS_SEMANA,
} from "@/lib/calendar";

export const dynamic = "force-dynamic";

interface Evento {
  id: string;
  codigo: string;
  estado: EstadoProceso;
  fecha_cierre: string;
  origen: "compras_agiles" | "licitaciones";
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: { y?: string; m?: string };
}) {
  const hoy = new Date();
  const raw = {
    year: searchParams.y ? Number(searchParams.y) : hoy.getFullYear(),
    month: searchParams.m ? Number(searchParams.m) : hoy.getMonth(),
  };
  const { year, month } = normalizarMes(raw.year, raw.month);

  const { desde, hasta } = rangoGrilla(year, month);
  const supabase = createClient();

  const [ca, lic] = await Promise.all([
    supabase
      .from("compras_agiles")
      .select("id, codigo, estado, fecha_cierre")
      .gte("fecha_cierre", desde)
      .lt("fecha_cierre", hasta),
    supabase
      .from("licitaciones")
      .select("id, codigo, estado, fecha_cierre")
      .gte("fecha_cierre", desde)
      .lt("fecha_cierre", hasta),
  ]);

  const eventos: Evento[] = [
    ...(ca.data ?? []).map((e) => ({ ...e, origen: "compras_agiles" as const })),
    ...(lic.data ?? []).map((e) => ({ ...e, origen: "licitaciones" as const })),
  ] as Evento[];

  const porDia = new Map<string, Evento[]>();
  for (const e of eventos) {
    const d = new Date(e.fecha_cierre);
    const pad = (n: number) => String(n).padStart(2, "0");
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    porDia.set(key, [...(porDia.get(key) ?? []), e]);
  }

  const grilla = construirGrillaMes(year, month);
  const prev = normalizarMes(year, month - 1);
  const next = normalizarMes(year, month + 1);
  const hoyIso = (() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;
  })();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          Calendario de cierres
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendario?y=${prev.year}&m=${prev.month}`}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ←
          </Link>
          <span className="w-40 text-center text-sm font-medium">
            {NOMBRES_MES[month]} {year}
          </span>
          <Link
            href={`/calendario?y=${next.year}&m=${next.month}`}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            →
          </Link>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="grid grid-cols-7 border-b bg-gray-50 text-center text-xs font-medium text-gray-500">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grilla.map((dia) => {
            const evs = porDia.get(dia.iso) ?? [];
            return (
              <div
                key={dia.iso}
                className={`min-h-[96px] border-b border-r p-1.5 ${
                  dia.delMes ? "bg-white" : "bg-gray-50/60"
                }`}
              >
                <div
                  className={`mb-1 text-right text-xs ${
                    dia.iso === hoyIso
                      ? "font-bold text-brand"
                      : dia.delMes
                      ? "text-gray-600"
                      : "text-gray-300"
                  }`}
                >
                  {dia.dia}
                </div>
                <div className="space-y-1">
                  {evs.slice(0, 4).map((e) => (
                    <Link
                      key={`${e.origen}-${e.id}`}
                      href={`/${
                        e.origen === "compras_agiles"
                          ? "compras-agiles"
                          : "licitaciones"
                      }/${e.id}/editar`}
                      className={`block truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                        ESTADO_COLOR[e.estado]
                      }`}
                      title={`${e.codigo} (${
                        e.origen === "compras_agiles" ? "CA" : "Lic"
                      })`}
                    >
                      {new Date(e.fecha_cierre).toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      {e.codigo}
                    </Link>
                  ))}
                  {evs.length > 4 && (
                    <p className="px-1 text-[10px] text-gray-400">
                      +{evs.length - 4} más
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Solo se muestran procesos con fecha de cierre real. Los marcados como
        “REVISAR N” no tienen fecha y no aparecen aquí.
      </p>
    </div>
  );
}
