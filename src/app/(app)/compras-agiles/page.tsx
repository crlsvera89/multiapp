import { createClient } from "@/lib/supabase/server";
import { ProcesoTable } from "@/components/ProcesoTable";

export const dynamic = "force-dynamic";

const REGIONES = ["BIO BIO", "ÑUBLE", "MAULE", "METROPOLITANA", "ARICA"];

export default async function ComprasAgilesPage({
  searchParams,
}: {
  searchParams: { estado?: string; region?: string };
}) {
  const supabase = createClient();
  let query = supabase
    .from("compras_agiles")
    .select("*")
    .order("fecha_cierre", { ascending: true, nullsFirst: false });

  if (searchParams.estado) query = query.eq("estado", searchParams.estado);
  if (searchParams.region) query = query.eq("region", searchParams.region);

  const { data } = await query;

  return (
    <ProcesoTable
      basePath="/compras-agiles"
      titulo="Compras Ágiles"
      filas={data ?? []}
      regiones={REGIONES}
      filtroEstado={searchParams.estado}
      filtroRegion={searchParams.region}
    />
  );
}
