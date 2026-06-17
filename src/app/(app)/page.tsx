import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ESTADO_LABEL, ESTADO_COLOR, type EstadoProceso } from "@/lib/types";
import { prioridad } from "@/lib/scoring";

export const dynamic = "force-dynamic";

async function contarPorEstado(tabla: string) {
  const supabase = createClient();
  const { data } = await supabase.from(tabla).select("estado");
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: { estado: string }) => {
    counts[r.estado] = (counts[r.estado] ?? 0) + 1;
  });
  return { total: data?.length ?? 0, counts };
}

export default async function DashboardPage() {
  const supabase = createClient();
  const ca = await contarPorEstado("compras_agiles");
  const lic = await contarPorEstado("licitaciones");

  const { data: proximos } = await supabase
    .from("compras_agiles")
    .select("codigo, region, estado, fecha_cierre")
    .not("fecha_cierre", "is", null)
    .gte("fecha_cierre", new Date().toISOString())
    .order("fecha_cierre", { ascending: true })
    .limit(8);

  const { data: priorizadas } = await supabase
    .from("compras_agiles")
    .select("id, codigo, region, nombre, puntaje, puntaje_motivos")
    .eq("estado", "NUEVO")
    .not("puntaje", "is", null)
    .order("puntaje", { ascending: false })
    .limit(8);

  const tasaExito =
    ca.total > 0
      ? Math.round(((ca.counts["REALIZADA"] ?? 0) / ca.total) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Resumen general de procesos</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi titulo="Compras Ágiles" valor={ca.total} />
        <Kpi titulo="Licitaciones" valor={lic.total} />
        <Kpi titulo="Realizadas (CA)" valor={ca.counts["REALIZADA"] ?? 0} />
        <Kpi titulo="Tasa realizada" valor={`${tasaExito}%`} />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card titulo="Compras Ágiles por estado">
          <EstadoBars counts={ca.counts} total={ca.total} />
        </Card>
        <Card titulo="Licitaciones por estado">
          <EstadoBars counts={lic.counts} total={lic.total} />
        </Card>
      </section>

      <Card titulo="Oportunidades priorizadas (nuevas, por puntaje)">
        {priorizadas && priorizadas.length > 0 ? (
          <ul className="space-y-2">
            {priorizadas.map((p) => (
              <li
                key={p.codigo}
                className="flex items-center gap-3 border-t pt-2 first:border-0 first:pt-0"
              >
                <PuntajeChip score={p.puntaje as number} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/compras-agiles/${p.id}/editar`}
                    className="font-mono text-xs text-brand hover:underline"
                  >
                    {p.codigo}
                  </Link>
                  <p className="truncate text-xs text-gray-500">
                    {p.nombre ?? "—"}{" "}
                    <span className="text-gray-400">· {p.region}</span>
                  </p>
                </div>
                <span className="hidden truncate text-xs text-gray-400 sm:block sm:max-w-[12rem]">
                  {p.puntaje_motivos}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">
            Aún no hay oportunidades nuevas con puntaje. Aparecerán cuando corra
            la ingesta automática.
          </p>
        )}
      </Card>

      <Card titulo="Próximos cierres (Compras Ágiles)">
        {proximos && proximos.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-400">
              <tr>
                <th className="py-2">Código</th>
                <th>Región</th>
                <th>Estado</th>
                <th className="text-right">Cierre</th>
              </tr>
            </thead>
            <tbody>
              {proximos.map((p) => (
                <tr key={p.codigo} className="border-t">
                  <td className="py-2 font-mono text-xs">{p.codigo}</td>
                  <td>{p.region}</td>
                  <td>
                    <EstadoBadge estado={p.estado as EstadoProceso} />
                  </td>
                  <td className="text-right tabular-nums">
                    {new Date(p.fecha_cierre as string).toLocaleString("es-CL", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-400">No hay cierres futuros con fecha.</p>
        )}
        <Link
          href="/compras-agiles"
          className="mt-4 inline-block text-sm text-brand hover:underline"
        >
          Ver todas →
        </Link>
      </Card>
    </div>
  );
}

function PuntajeChip({ score }: { score: number }) {
  const p = prioridad(score);
  const color =
    p === "alta"
      ? "bg-green-100 text-green-800"
      : p === "media"
      ? "bg-amber-100 text-amber-800"
      : "bg-gray-100 text-gray-500";
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold tabular-nums ${color}`}
      title={`Prioridad ${p}`}
    >
      {score}
    </span>
  );
}

function Kpi({ titulo, valor }: { titulo: string; valor: number | string }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <p className="text-xs uppercase text-gray-400">{titulo}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{valor}</p>
    </div>
  );
}

function Card({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">{titulo}</h2>
      {children}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: EstadoProceso }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_COLOR[estado]}`}
    >
      {ESTADO_LABEL[estado]}
    </span>
  );
}

function EstadoBars({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  const estados = Object.keys(counts).sort(
    (a, b) => counts[b] - counts[a]
  ) as EstadoProceso[];
  return (
    <div className="space-y-2">
      {estados.map((e) => (
        <div key={e} className="flex items-center gap-3">
          <span className="w-28 text-xs text-gray-600">{ESTADO_LABEL[e]}</span>
          <div className="h-2 flex-1 rounded bg-gray-100">
            <div
              className="h-2 rounded bg-brand"
              style={{ width: `${total ? (counts[e] / total) * 100 : 0}%` }}
            />
          </div>
          <span className="w-8 text-right text-xs tabular-nums text-gray-500">
            {counts[e]}
          </span>
        </div>
      ))}
    </div>
  );
}
