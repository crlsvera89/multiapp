export interface DiaCalendario {
  fecha: Date;
  dia: number;
  delMes: boolean; // pertenece al mes mostrado
  iso: string; // YYYY-MM-DD (clave para agrupar)
}

export const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function isoLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Construye una grilla mensual (semana parte el lunes) con días de relleno
 * de los meses adyacentes para completar filas de 7.
 */
export function construirGrillaMes(year: number, month: number): DiaCalendario[] {
  const primero = new Date(year, month, 1);
  // getDay(): 0=Dom..6=Sáb. Queremos lunes=0.
  const offset = (primero.getDay() + 6) % 7;
  const inicio = new Date(year, month, 1 - offset);

  const dias: DiaCalendario[] = [];
  for (let i = 0; i < 42; i++) {
    const f = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    dias.push({
      fecha: f,
      dia: f.getDate(),
      delMes: f.getMonth() === month,
      iso: isoLocal(f),
    });
  }
  // Recorta la última semana si quedó completamente fuera del mes.
  while (dias.length > 35 && dias.slice(35).every((d) => !d.delMes)) {
    dias.length = 35;
  }
  return dias;
}

/** Rango [desde, hasta) que cubre toda la grilla, para consultar la base. */
export function rangoGrilla(year: number, month: number): {
  desde: string;
  hasta: string;
} {
  const grilla = construirGrillaMes(year, month);
  const desde = grilla[0].fecha;
  const ultimo = grilla[grilla.length - 1].fecha;
  const hasta = new Date(
    ultimo.getFullYear(),
    ultimo.getMonth(),
    ultimo.getDate() + 1
  );
  return { desde: desde.toISOString(), hasta: hasta.toISOString() };
}

/** Normaliza year/month, con desbordes de mes (mes -1 o 12). */
export function normalizarMes(year: number, month: number): {
  year: number;
  month: number;
} {
  const d = new Date(year, month, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}
