-- =====================================================================
-- Catálogo de vendedores / trabajadores (con color para la UI)
-- =====================================================================
CREATE TABLE vendedores (
  id      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre  TEXT NOT NULL UNIQUE,
  color   TEXT NOT NULL DEFAULT '#888780',  -- hex
  orden   INT  NOT NULL DEFAULT 0,
  activo  BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vend_select" ON vendedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "vend_insert" ON vendedores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vend_update" ON vendedores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "vend_delete" ON vendedores FOR DELETE TO authenticated USING (true);

INSERT INTO vendedores (nombre, color, orden) VALUES
  ('NICOLAS VERA',     '#46c84f', 1),  -- verde
  ('VANESA ORTIZ',     '#6b3fa0', 2),  -- morado
  ('CAMILA',           '#ff5fa2', 3),  -- rosado
  ('JUAN CARLOS VERA', '#b3001b', 4),  -- rojo
  ('LIBRE',            '#e0e0e0', 5),  -- gris (sin asignar)
  ('YENIFFER VELASCO', '#d6b8f5', 6),  -- lavanda
  ('VICENTE',          '#1a73e8', 7),  -- azul
  ('EDUARDO',          '#1b7a4d', 8)   -- verde oscuro
ON CONFLICT (nombre) DO NOTHING;
