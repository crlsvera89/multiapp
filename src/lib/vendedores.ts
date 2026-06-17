/**
 * Catálogo de vendedores/trabajadores con su color.
 * Espejo de la tabla `vendedores` para usar en la UI sin consultar la base.
 * (La fuente de verdad es la tabla; esto es el respaldo visual por defecto.)
 */
export const VENDEDORES: { nombre: string; color: string }[] = [
  { nombre: "NICOLAS VERA", color: "#46c84f" },
  { nombre: "VANESA ORTIZ", color: "#6b3fa0" },
  { nombre: "CAMILA", color: "#ff5fa2" },
  { nombre: "JUAN CARLOS VERA", color: "#b3001b" },
  { nombre: "LIBRE", color: "#e0e0e0" },
  { nombre: "YENIFFER VELASCO", color: "#d6b8f5" },
  { nombre: "VICENTE", color: "#1a73e8" },
  { nombre: "EDUARDO", color: "#1b7a4d" },
];

const MAPA = new Map(VENDEDORES.map((v) => [v.nombre.toUpperCase(), v.color]));

/** Color del vendedor (gris neutro si no está en el catálogo). */
export function colorVendedor(nombre: string | null | undefined): string {
  if (!nombre) return "#c7c7c7";
  return MAPA.get(nombre.trim().toUpperCase()) ?? "#c7c7c7";
}
