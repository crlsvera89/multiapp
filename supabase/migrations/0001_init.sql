-- =====================================================================
-- MULTICOMERCIAL — Esquema inicial (Supabase / PostgreSQL)
-- Generado a partir del análisis real del Excel (hojas COMPRA AGIL y LICITACIONES).
-- Decisiones confirmadas:
--   * Dos tablas separadas: compras_agiles y licitaciones
--   * fecha_cierre (fecha real) y revisar_label (marca "REVISAR N") por separado
--   * Se incluye monto + moneda (vacíos por ahora, para KPIs a futuro)
-- =====================================================================

-- ---------- ENUMS ----------

-- Estados reales encontrados en el Excel (ambas hojas):
--   Nuevo, En curso, Realizada, No ejecutable, Cerrada, (vacío)
CREATE TYPE estado_proceso AS ENUM (
  'NUEVO',
  'EN_CURSO',
  'REALIZADA',
  'NO_EJECUTABLE',
  'CERRADA',
  'SIN_ESTADO'
);

-- Tipo de licitación, derivado del sufijo del código (L1, LE, LP, ...)
CREATE TYPE tipo_licitacion AS ENUM (
  'L1',   -- < 100 UTM
  'LE',   -- 100 - 1.000 UTM
  'LP',   -- 1.000 - 2.000 UTM
  'LQ',
  'LR',
  'OTRO'
);

-- ---------- FUNCIÓN updated_at ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- TABLA: compras_agiles  (procesos COT)
-- =====================================================================
CREATE TABLE compras_agiles (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo            TEXT NOT NULL,                 -- limpiado: sin espacios ni saltos de línea
  region            TEXT,                          -- BIO BIO, ÑUBLE, MAULE, METROPOLITANA, ARICA
  vendedor          TEXT,                          -- nullable (hay ~37 sin asignar)
  estado            estado_proceso NOT NULL DEFAULT 'NUEVO',
  estado_original   TEXT,                          -- valor crudo del Excel (auditoría)
  fecha_publicacion DATE,
  fecha_cierre      TIMESTAMPTZ,                   -- solo cuando la celda es una fecha real
  revisar_label     TEXT,                          -- "REVISAR 10", "REVISAR 11", etc.
  monto             NUMERIC(15,2),                 -- vacío por ahora
  moneda            TEXT DEFAULT 'CLP',
  subido_por        TEXT,                          -- quién lo subió (ej. CARLOS VERA, o 'CLAUDE (auto)')
  trabajado_por     TEXT,                          -- usuario que lo tomó para trabajar
  trabajado_en      TIMESTAMPTZ,                   -- cuándo lo tomó
  notas             TEXT,
  created_by        UUID REFERENCES auth.users(id),
  updated_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- = fecha de subida al sistema
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_compras_agiles_codigo UNIQUE (codigo)
);

CREATE INDEX idx_ca_estado  ON compras_agiles (estado);
CREATE INDEX idx_ca_region  ON compras_agiles (region);
CREATE INDEX idx_ca_cierre  ON compras_agiles (fecha_cierre);

CREATE TRIGGER trg_ca_updated_at
BEFORE UPDATE ON compras_agiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- TABLA: licitaciones
-- Misma base que compras_agiles + campos propios (anteriores, tipo_licitacion)
-- =====================================================================
CREATE TABLE licitaciones (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo            TEXT NOT NULL,
  tipo              tipo_licitacion DEFAULT 'OTRO',  -- derivado del código (LE/LP/L1...)
  region            TEXT,
  vendedor          TEXT,
  estado            estado_proceso NOT NULL DEFAULT 'NUEVO',
  estado_original   TEXT,
  fecha_publicacion DATE,
  fecha_cierre      TIMESTAMPTZ,
  revisar_label     TEXT,
  monto             NUMERIC(15,2),
  moneda            TEXT DEFAULT 'CLP',
  subido_por        TEXT,
  trabajado_por     TEXT,                           -- usuario que lo tomó para trabajar
  trabajado_en      TIMESTAMPTZ,                    -- cuándo lo tomó
  notas             TEXT,
  anteriores        TEXT,                           -- códigos históricos relacionados
  created_by        UUID REFERENCES auth.users(id),
  updated_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_licitaciones_codigo UNIQUE (codigo)
);

CREATE INDEX idx_lic_estado  ON licitaciones (estado);
CREATE INDEX idx_lic_region  ON licitaciones (region);
CREATE INDEX idx_lic_cierre  ON licitaciones (fecha_cierre);

CREATE TRIGGER trg_lic_updated_at
BEFORE UPDATE ON licitaciones
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- ROW LEVEL SECURITY
-- Equipo de confianza (2-5 personas): cualquier usuario autenticado
-- puede leer y escribir. Sin esto la tabla queda abierta con la anon key.
-- =====================================================================
ALTER TABLE compras_agiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE licitaciones   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ca_select" ON compras_agiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "ca_insert" ON compras_agiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ca_update" ON compras_agiles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ca_delete" ON compras_agiles FOR DELETE TO authenticated USING (true);

CREATE POLICY "lic_select" ON licitaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "lic_insert" ON licitaciones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lic_update" ON licitaciones FOR UPDATE TO authenticated USING (true);
CREATE POLICY "lic_delete" ON licitaciones FOR DELETE TO authenticated USING (true);
