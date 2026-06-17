"use client";

import Link from "next/link";
import { ESTADOS, ESTADO_LABEL, type ProcesoBase } from "@/lib/types";

const REGIONES = ["BIO BIO", "ÑUBLE", "MAULE", "METROPOLITANA", "ARICA"];

interface Props {
  action: (form: FormData) => void; // server action ya enlazada a la tabla
  basePath: string;
  registro?: (ProcesoBase & { anteriores?: string | null }) | null;
  mostrarLicitacion?: boolean;
}

function isoADatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function ProcesoForm({
  action,
  basePath,
  registro,
  mostrarLicitacion,
}: Props) {
  const r = registro;
  const editando = Boolean(r?.id);

  return (
    <form action={action} className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold text-gray-900">
        {editando ? "Editar proceso" : "Nuevo proceso"}
      </h1>

      {r?.id && <input type="hidden" name="id" value={r.id} />}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Código *">
          <input
            name="codigo"
            required
            defaultValue={r?.codigo ?? ""}
            className="input"
            placeholder="3567-229-COT26"
          />
        </Field>
        <Field label="Estado">
          <select name="estado" defaultValue={r?.estado ?? "NUEVO"} className="input">
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABEL[e]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Región">
          <select name="region" defaultValue={r?.region ?? ""} className="input">
            <option value="">—</option>
            {REGIONES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vendedor">
          <input name="vendedor" defaultValue={r?.vendedor ?? ""} className="input" />
        </Field>
        <Field label="Fecha publicación">
          <input
            type="date"
            name="fecha_publicacion"
            defaultValue={r?.fecha_publicacion?.slice(0, 10) ?? ""}
            className="input"
          />
        </Field>
        <Field label="Fecha cierre">
          <input
            type="datetime-local"
            name="fecha_cierre"
            defaultValue={isoADatetimeLocal(r?.fecha_cierre)}
            className="input"
          />
        </Field>
        <Field label="Marca REVISAR (si no hay fecha)">
          <input
            name="revisar_label"
            defaultValue={r?.revisar_label ?? ""}
            className="input"
            placeholder="REVISAR 11"
          />
        </Field>
        <Field label="Monto (CLP)">
          <input
            type="number"
            step="1"
            name="monto"
            defaultValue={r?.monto ?? ""}
            className="input"
          />
        </Field>
      </div>

      {mostrarLicitacion && (
        <Field label="Códigos anteriores (licitaciones relacionadas)">
          <input name="anteriores" defaultValue={r?.anteriores ?? ""} className="input" />
        </Field>
      )}

      <Field label="Notas">
        <textarea
          name="notas"
          rows={3}
          defaultValue={r?.notas ?? ""}
          className="input"
        />
      </Field>

      <div className="flex gap-3 pt-2">
        <button className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark">
          {editando ? "Guardar cambios" : "Crear proceso"}
        </button>
        <Link
          href={basePath}
          className="rounded-lg border px-5 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancelar
        </Link>
      </div>

      <style>{`.input{margin-top:.25rem;width:100%;border:1px solid #e5e7eb;border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:#1f6feb}`}</style>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      {children}
    </label>
  );
}
