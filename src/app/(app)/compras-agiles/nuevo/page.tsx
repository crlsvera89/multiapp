import { ProcesoForm } from "@/components/ProcesoForm";
import { guardarProceso } from "@/lib/actions";

export default function NuevaCompraAgilPage() {
  const action = guardarProceso.bind(null, "compras_agiles");
  return <ProcesoForm action={action} basePath="/compras-agiles" />;
}
