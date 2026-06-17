# Estado del proyecto — MULTICOMERCIAL (handoff)

Documento de traspaso para quien continúe el desarrollo. Resume qué es, qué está hecho, qué falta y los puntos de cuidado.

## Qué es
Aplicación web para gestionar **Compras Ágiles (COT)** y **Licitaciones** de Mercado Público (ChileCompra) de la empresa Ferretería Multicomercial Ltda. Reemplaza un Excel manual por un sistema web multiusuario, con carga automática de oportunidades desde la API de ChileCompra como objetivo principal.

## Stack
- **Next.js 14** (App Router, TypeScript) + **Tailwind CSS**
- **Supabase** (PostgreSQL, Auth con magic link, RLS)
- **Vercel** (hosting + Cron para la ingesta horaria)
- **Vitest** (tests unitarios)
- Sin shadcn/ui por ahora (se usó Tailwind plano para que el proyecto corra sin pasos extra; se puede migrar a shadcn).

## Estado de despliegue
**Aún NO está desplegado.** El código está completo para una primera versión, pero falta correr el despliegue (Supabase + Vercel). La guía paso a paso está en `GUIA_DESPLIEGUE.md`. El último avance del dueño quedó en la Parte 2 (correr los SQL en Supabase).

---

## LO QUE ESTÁ HECHO

### Base de datos (`supabase/migrations/`) — correr en orden 0001 → 0005
- `0001_init.sql` — tablas `compras_agiles` y `licitaciones` (separadas), enum `estado_proceso` (NUEVO, EN_CURSO, REALIZADA, NO_EJECUTABLE, CERRADA, SIN_ESTADO), enum `tipo_licitacion`, trigger de `updated_at`, índices, **RLS**, campos `subido_por`, `trabajado_por`, `trabajado_en`, `created_by`, `updated_by`, `monto`/`moneda`.
- `0002_seed.sql` — **311 filas reales** ya limpias (259 compras ágiles + 52 licitaciones).
- `0003_vendedores.sql` — catálogo `vendedores` con 8 trabajadores y sus colores.
- `0004_sync_y_auditoria.sql` — columnas `nombre`/`institucion`, tabla `sync_estado` (sync incremental) y tabla `auditoria` + trigger (historial de cambios por usuario).
- `0005_puntaje.sql` — columnas `puntaje`/`puntaje_motivos` para el puntaje de oportunidades.

### Aplicación (`src/`)
- **Auth**: login con magic link (`app/login`), callback (`app/auth/confirm`), logout (`app/auth/signout`), protección de rutas vía `middleware.ts` + `lib/supabase/middleware.ts`.
- **Clientes Supabase**: server / client / middleware (`lib/supabase/`).
- **Layout** con sidebar y logo de la empresa (`app/(app)/layout.tsx`).
- **Dashboard** (`app/(app)/page.tsx`): KPIs, barras por estado, próximos cierres.
- **Listas** de Compras Ágiles y Licitaciones con filtros por estado y región, y punto de color del vendedor (`components/ProcesoTable.tsx`).
- **Crear / editar / eliminar** procesos (`components/ProcesoForm.tsx`, `lib/actions.ts`, rutas `nuevo` y `[id]/editar`), incluyendo acción **"tomar"** que asigna `trabajado_por`.
- **Calendario** de cierres mensual navegable (`app/(app)/calendario`, `lib/calendar.ts`).
- **Importador de Excel** (`scripts/import-excel.ts`): limpia, normaliza y hace upsert; tiene modo `--dry`.
- **Ingesta automática real desde Mercado Público** (`lib/chilecompra.ts` + `app/api/cron/ingesta/route.ts` + `vercel.json`): cron horario. COT desde el buscador (`api.buscador.mercadopublico.cl`, sin ticket) y licitaciones desde la API oficial (con `MP_TICKET`). Parseo de fechas con `date-fns-tz` (America/Santiago). Inserta nuevas como NUEVO / `subido_por='CLAUDE (auto)'`; si ya existen actualiza solo metadatos sin pisar estado/notas/vendedor. Sync incremental con `sync_estado`. (Portado del sync probado de chilecompra2.)
- **Búsqueda por código** (`app/api/buscar-codigo/route.ts`): trae un proceso puntual desde MP (GET previsualiza, POST importa).
- **Puntaje de oportunidades — Etapa 1** (`lib/scoring.ts` + tests): asigna 0–100 con motivos, modelo derivado del historial (`construirModelo`), recalculable vía `app/api/recalcular-puntajes`. Se muestra en el Dashboard ("Oportunidades priorizadas").
- **Normalizador** (`lib/normalizer.ts`) con tests: mapea estados, limpia códigos, separa fecha real de marca "REVISAR N", corrige años 2029, deriva tipo de licitación.
- **Catálogo de vendedores** con colores (`lib/vendedores.ts`).
- **Auditoría**: trigger que registra cambios de campos por usuario (tabla `auditoria`).
- **Logo** convertido del `.psd` a PNG en `public/` (`logo.png`, `logo-marca.png`, `icon.png`/favicon).

### Documentación
- `README.md` — puesta en marcha local + estructura.
- `GUIA_DESPLIEGUE.md` — despliegue paso a paso (no técnico).
- `AUTOMATIZACION.md` — hoja de ruta de la automatización (Etapas 1 y 2).
- `ESTADO_DEL_PROYECTO.md` — este documento.

---

## LO QUE FALTA

### Pantallas pendientes (del plan de 12)
1. **Detalle con tabs** (info / historial / documentos / notas) — no construido. Hoy se edita directo desde el formulario.
2. **Reportes** — exportar a Excel y gráficos de resultados/montos — no construido.
3. **Admin / Configuración** — UI para gestionar usuarios y editar el catálogo de vendedores (la tabla existe, falta la pantalla) — no construido.
4. **PWA + notificaciones push** de próximos cierres — no construido.

### Inteligencia (las dos etapas que pidió el dueño)
5. **Etapa 1 — puntaje de oportunidades**: ✅ HECHO (v1). Modelo transparente derivado del historial en `lib/scoring.ts`, recalculable. Pendiente de robustecer: incorporar `monto` como señal y, a futuro, un puntaje con IA por encima de las reglas. Nota: el historial está ~98% en "Realizada", así que el modelo afina recién cuando el equipo marque más "No ejecutable".
6. **Etapa 2 — estudio post-cierre**: al cerrarse un proceso, revisar vía API si lo adjudicó la empresa u otra; si se perdió, investigar el motivo (precio vs. documentos). NO construido — es lo siguiente del roadmap.

### Pendientes técnicos / de despliegue
- **Desplegar** (Supabase + Vercel) siguiendo `GUIA_DESPLIEGUE.md`.
- **Ticket de la API** de ChileCompra (se pide en api.mercadopublico.cl) para activar la ingesta.
- **Endpoint de Compra Ágil (beta)**: el de licitaciones está confirmado y funcional; el de Compra Ágil se entrega con el ticket. El código está listo, falta pegar la URL en `CHILECOMPRA_COMPRA_AGIL_URL` y, si los nombres de campos difieren, ajustar el mapeo en `ingestaCompraAgil()` (≈5 líneas).
- **Email/SMTP** para los magic links en producción (el correo de prueba de Supabase tiene límite bajo; conectar SMTP propio o Resend).

---

## PUNTOS DE CUIDADO (importante)
- **La ingesta horaria debe correr en Vercel Cron, no en una sesión de Claude.** Es una app multiusuario que debe funcionar sola 24/7.
- **`SUPABASE_SERVICE_ROLE_KEY` es secreta y solo de servidor** (la usan el cron y el script de importación). Nunca exponerla en el cliente ni subirla al repo.
- **Datos del Excel original**: la columna "fecha cierre" venía mayormente con marcas "REVISAR N" en vez de fechas → se guardan en `revisar_label`; solo las fechas reales van a `fecha_cierre` (por eso el calendario muestra pocas). Se corrigieron 14 fechas año 2029 y se eliminaron 21 códigos duplicados al cargar el seed.
- **Deuda técnica menor**: el campo "vendedor" en el formulario es texto libre (podría ser un select del catálogo `vendedores`); las listas traen todos los registros sin paginación (con cientos de filas va bien, con miles habría que paginar); el manejo de zona horaria es básico (estandarizar `America/Santiago`).
- Los tests cubren la lógica de normalización y calendario (`npm test`). No hay tests end-to-end.

## Cómo correrlo en local (resumen)
1. `npm install`
2. Copiar `.env.example` a `.env.local` y completar con las claves de Supabase.
3. Correr los 3 SQL en Supabase (ver guía).
4. `npm run dev` → http://localhost:3000
5. Tests: `npm test`

## Sugerencia de orden para continuar
1. Desplegar (que esté en línea y usable por el equipo).
2. Conectar el ticket + endpoint de Compra Ágil y validar la ingesta real.
3. Reportes y detalle con tabs (valor inmediato para los usuarios).
4. Etapa 1 (scoring de oportunidades) y luego Etapa 2 (estudio post-cierre).
