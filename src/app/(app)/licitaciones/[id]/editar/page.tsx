import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProcesoForm } from "@/components/ProcesoForm";
import { guardarProceso, eliminarProceso } from "@/lib/actions";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function EditarLicitacionPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("licitaciones")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!data) notFound();

  const action = guardarProceso.bind(null, "licitaciones");
  const del = eliminarProceso.bind(null, "licitaciones", params.id);

  return (
    <div className="space-y-6">
      <ProcesoForm
        action={action}
        basePath="/licitaciones"
        registro={data}
        mostrarLicitacion
      />
      <DeleteButton action={del} />
    </div>
  );
}
