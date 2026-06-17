-- =====================================================================
-- 0005 — Puntaje de oportunidades (Etapa 1 — inteligencia)
-- Guarda el puntaje calculado y los motivos, para ordenar/filtrar.
-- El cálculo lo hace la app (lib/scoring.ts) en la ingesta y al recalcular.
-- =====================================================================
ALTER TABLE compras_agiles ADD COLUMN IF NOT EXISTS puntaje         INT;
ALTER TABLE compras_agiles ADD COLUMN IF NOT EXISTS puntaje_motivos TEXT;

ALTER TABLE licitaciones   ADD COLUMN IF NOT EXISTS puntaje         INT;
ALTER TABLE licitaciones   ADD COLUMN IF NOT EXISTS puntaje_motivos TEXT;

CREATE INDEX IF NOT EXISTS idx_ca_puntaje  ON compras_agiles (puntaje DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_lic_puntaje ON licitaciones   (puntaje DESC NULLS LAST);
