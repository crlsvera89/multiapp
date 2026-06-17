import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProcesoForm } from "@/components/ProcesoForm";
import { guardarProceso, eliminarProceso } from "@/lib/actions";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function EditarCompraAgilPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("compras_agiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!data) notFound();

  const action = guardarProceso.bind(null, "compras_agiles");
  const del = eliminarProceso.bind(null, "compras_agiles", params.id);

  return (
    <div className="space-y-6">
      <ProcesoForm action={action} basePath="/compras-agiles" registro={data} />
      <DeleteButton action={del} />
    </div>
  );
}
