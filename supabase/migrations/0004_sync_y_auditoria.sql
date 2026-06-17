-- =====================================================================
-- 0004 — Soporte de ingesta automática + auditoría
-- Trae mejoras del proyecto chilecompra2 al base:
--   * Columnas nombre / institucion (la API trae nombre del proceso y organismo)
--   * Tabla sync_estado (marca de tiempo para sync incremental)
--   * Tabla auditoria + trigger (historial de cambios por usuario)
-- =====================================================================

-- ---------- Columnas nuevas en ambas tablas ----------
ALTER TABLE compras_agiles ADD COLUMN IF NOT EXISTS nombre      TEXT;
ALTER TABLE compras_agiles ADD COLUMN IF NOT EXISTS institucion TEXT;  -- organismo comprador

ALTER TABLE licitaciones   ADD COLUMN IF NOT EXISTS nombre      TEXT;
ALTER TABLE licitaciones   ADD COLUMN IF NOT EXISTS institucion TEXT;

-- ---------- sync_estado: marca de la última publicación sincronizada ----------
CREATE TABLE IF NOT EXISTS sync_estado (
  id                     INT PRIMARY KEY DEFAULT 1,          -- una sola fila (empresa única)
  ultima_publicacion_cot TIMESTAMPTZ,
  ultima_publicacion_lic TIMESTAMPTZ,
  actualizado_en         TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT sync_estado_single CHECK (id = 1)
);
INSERT INTO sync_estado (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE sync_estado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_select" ON sync_estado FOR SELECT TO authenticated USING (true);
CREATE POLICY "sync_update" ON sync_estado FOR UPDATE TO authenticated USING (true);

-- ---------- Auditoría: historial de cambios ----------
CREATE TABLE IF NOT EXISTS auditoria (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tabla          TEXT NOT NULL,                       -- 'compras_agiles' | 'licitaciones'
  registro_id    UUID NOT NULL,
  usuario_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  campo          TEXT NOT NULL,
  valor_anterior TEXT,
  valor_nuevo    TEXT,
  cambiado_en    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auditoria_reg ON auditoria (tabla, registro_id, cambiado_en DESC);

ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aud_select" ON auditoria FOR SELECT TO authenticated USING (true);

-- Trigger genérico: registra cambios en columnas relevantes
CREATE OR REPLACE FUNCTION registrar_auditoria()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  col      TEXT;
  old_val  TEXT;
  new_val  TEXT;
  uid      UUID;
BEGIN
  uid := auth.uid();
  FOREACH col IN ARRAY ARRAY[
    'estado','estado_original','vendedor','region','fecha_cierre','fecha_publicacion',
    'monto','trabajado_por','notas','revisar_label'
  ] LOOP
    EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', col, col)
      INTO old_val, new_val USING OLD, NEW;
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO auditoria(tabla, registro_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (TG_TABLE_NAME, NEW.id, uid, col, old_val, new_val);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ca_auditoria  AFTER UPDATE ON compras_agiles
FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

CREATE TRIGGER lic_auditoria AFTER UPDATE ON licitaciones
FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
