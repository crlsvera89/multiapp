import Link from "next/link";
import {
  ESTADOS,
  ESTADO_LABEL,
  ESTADO_COLOR,
  type EstadoProceso,
  type ProcesoBase,
} from "@/lib/types";
import { colorVendedor } from "@/lib/vendedores";

interface Props {
  basePath: string;
  titulo: string;
  filas: (ProcesoBase & { tipo?: string })[];
  regiones: string[];
  filtroEstado?: string;
  filtroRegion?: string;
  mostrarTipo?: boolean;
}

export function ProcesoTable({
  basePath,
  titulo,
  filas,
  regiones,
  filtroEstado,
  filtroRegion,
  mostrarTipo,
}: Props) {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{titulo}</h1>
          <p className="text-sm text-gray-500">{filas.length} procesos</p>
        </div>
        <Link
          href={`${basePath}/nuevo`}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + Nuevo
        </Link>
      </header>

      {/* Filtros (GET, sin JS) */}
      <form className="flex flex-wrap items-end gap-3" action={basePath}>
        <div>
          <label className="block text-xs text-gray-500">Estado</label>
          <select
            name="estado"
            defaultValue={filtroEstado ?? ""}
            className="mt-1 rounded-lg border px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABEL[e]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500">Región</label>
          <select
            name="region"
            defaultValue={filtroRegion ?? ""}
            className="mt-1 rounded-lg border px-3 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            {regiones.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <button className="rounded-lg bg-brand px-4 py-1.5 text-sm text-white hover:bg-brand-dark">
          Filtrar
        </button>
        <Link
          href={basePath}
          className="px-2 py-1.5 text-sm text-gray-500 hover:underline"
        >
          Limpiar
        </Link>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-3">Código</th>
              {mostrarTipo && <th className="px-4 py-3">Tipo</th>}
              <th className="px-4 py-3">Región</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Cierre</th>
              <th className="px-4 py-3">Notas</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link
                    href={`${basePath}/${f.id}/editar`}
                    className="font-mono text-xs text-brand hover:underline"
                  >
                    {f.codigo}
                  </Link>
                  {f.nombre && (
                    <p className="max-w-[14rem] truncate text-xs text-gray-400">
                      {f.nombre}
                    </p>
                  )}
                </td>
                {mostrarTipo && (
                  <td className="px-4 py-2 text-xs">{f.tipo}</td>
                )}
                <td className="px-4 py-2">{f.region ?? "—"}</td>
                <td className="px-4 py-2">
                  {f.vendedor ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: colorVendedor(f.vendedor) }}
                      />
                      {f.vendedor}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      ESTADO_COLOR[f.estado as EstadoProceso]
                    }`}
                  >
                    {ESTADO_LABEL[f.estado as EstadoProceso]}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs tabular-nums text-gray-600">
                  {f.fecha_cierre
                    ? new Date(f.fecha_cierre).toLocaleString("es-CL", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : f.revisar_label ?? "—"}
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-gray-500">
                  {f.notas ?? "—"}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td
                  colSpan={mostrarTipo ? 7 : 6}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  No hay procesos con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
