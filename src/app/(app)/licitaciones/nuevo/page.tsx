import { ProcesoForm } from "@/components/ProcesoForm";
import { guardarProceso } from "@/lib/actions";

export default function NuevaLicitacionPage() {
  const action = guardarProceso.bind(null, "licitaciones");
  return (
    <ProcesoForm action={action} basePath="/licitaciones" mostrarLicitacion />
  );
}
