// Tipos compartidos del dominio MULTICOMERCIAL

export type EstadoProceso =
  | "NUEVO"
  | "EN_CURSO"
  | "REALIZADA"
  | "NO_EJECUTABLE"
  | "CERRADA"
  | "SIN_ESTADO";

export type TipoLicitacion = "L1" | "LE" | "LP" | "LQ" | "LR" | "OTRO";

export interface ProcesoBase {
  id: string;
  codigo: string;
  nombre: string | null;
  institucion: string | null;
  region: string | null;
  vendedor: string | null;
  estado: EstadoProceso;
  estado_original: string | null;
  fecha_publicacion: string | null;
  fecha_cierre: string | null;
  revisar_label: string | null;
  monto: number | null;
  moneda: string | null;
  subido_por: string | null;
  notas: string | null;
  puntaje: number | null;
  puntaje_motivos: string | null;
  created_at: string;
  updated_at: string;
}

export type CompraAgil = ProcesoBase;

export interface Licitacion extends ProcesoBase {
  tipo: TipoLicitacion;
  anteriores: string | null;
}

export const ESTADOS: EstadoProceso[] = [
  "NUEVO",
  "EN_CURSO",
  "REALIZADA",
  "NO_EJECUTABLE",
  "CERRADA",
  "SIN_ESTADO",
];

export const ESTADO_LABEL: Record<EstadoProceso, string> = {
  NUEVO: "Nuevo",
  EN_CURSO: "En curso",
  REALIZADA: "Realizada",
  NO_EJECUTABLE: "No ejecutable",
  CERRADA: "Cerrada",
  SIN_ESTADO: "Sin estado",
};

export const ESTADO_COLOR: Record<EstadoProceso, string> = {
  NUEVO: "bg-blue-100 text-blue-800",
  EN_CURSO: "bg-amber-100 text-amber-800",
  REALIZADA: "bg-green-100 text-green-800",
  NO_EJECUTABLE: "bg-gray-200 text-gray-700",
  CERRADA: "bg-red-100 text-red-800",
  SIN_ESTADO: "bg-gray-100 text-gray-500",
};
