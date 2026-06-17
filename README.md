# MULTICOMERCIAL — Gestión ChileCompra

Aplicación web para gestionar **Compras Ágiles (COT)** y **Licitaciones** de Mercado Público.
Stack: Next.js 14 (App Router, TypeScript), Tailwind CSS, Supabase (PostgreSQL + Auth), Vercel.

## Puesta en marcha (paso a paso)

### 1. Crear el proyecto en Supabase
1. Entra a [supabase.com](https://supabase.com) → New project.
2. En **SQL Editor**, pega y ejecuta, en orden:
   - `supabase/migrations/0001_init.sql` → crea las tablas, enums, índices, trigger y RLS.
   - `supabase/migrations/0002_seed.sql` → carga tus 311 filas reales ya limpias.
3. En **Settings → API** copia el `Project URL`, el `anon key` y el `service_role key`.

### 2. Configurar variables de entorno
```bash
cp .env.example .env.local
```
Completa `.env.local` con los valores del paso anterior.
⚠️ El `SUPABASE_SERVICE_ROLE_KEY` solo se usa en el script de importación. Nunca lo expongas en el cliente ni lo subas al repo.

### 3. Instalar y correr
```bash
npm install
npm run dev
```
Abre http://localhost:3000 → te pedirá iniciar sesión.

### 4. Login (magic link)
En Supabase → **Authentication → Providers → Email**, deja habilitado "Email". El primer acceso: escribe tu correo en la pantalla de login, te llega un enlace, haces clic y entras.
(Para que el correo llegue de verdad en producción, configura un SMTP propio o Resend en Supabase.)

### 5. Reimportar el Excel cuando se actualice
```bash
npm run import:excel -- ./ruta/a/planilla.xlsx --dry   # vista previa, no escribe
npm run import:excel -- ./ruta/a/planilla.xlsx          # hace el upsert real
```
El script aplica la misma limpieza que el seed y hace `upsert` por código (no duplica).

### 6. Tests
```bash
npm test
```
Cubre el normalizador de estados, fechas, marcas REVISAR y tipo de licitación.

## Estructura
```
supabase/migrations/   0001_init.sql (schema)  ·  0002_seed.sql (datos reales)
src/lib/               types.ts · normalizer.ts · supabase/ (clientes server/client/middleware)
src/components/        ProcesoTable.tsx
src/app/               login · auth (magic link) · (app): dashboard, compras-agiles, licitaciones
scripts/               import-excel.ts
```

## Notas de datos (de tu Excel real)
- Estados reales: Nuevo, En curso, Realizada, No ejecutable, Cerrada.
- La columna "fecha cierre" trae mayormente marcas **"REVISAR N"** en vez de fechas; se guardan en `revisar_label`. Solo las fechas reales van a `fecha_cierre`.
- Se corrigieron 14 fechas con año 2029 (typos → 2026) y se eliminaron 21 códigos duplicados.
- El campo `monto` quedó listo pero vacío (tu planilla aún no lo tiene).

## Ingesta automática desde Mercado Público (Vercel Cron)
Programada en `src/app/api/cron/ingesta/route.ts`, agendada cada hora en `vercel.json`.
Trae datos de DOS fuentes reales (portado del sync probado de chilecompra2):
- **Compras Ágiles (COT)** desde el buscador (`api.buscador.mercadopublico.cl`) → tabla `compras_agiles`. No requiere ticket.
- **Licitaciones (LE/LP/LR/L1)** desde la API oficial (`api.mercadopublico.cl`, con ticket) → tabla `licitaciones`.

Comportamiento:
- Inserta oportunidades **nuevas** con estado `NUEVO` y `subido_por = 'CLAUDE (auto)'`.
- Si el proceso **ya existe**, actualiza solo metadatos (nombre, fechas, monto, organismo) y **nunca pisa** estado, notas, vendedor ni `trabajado_por`.
- Sincronización **incremental** vía tabla `sync_estado` (marca de última publicación por tipo).
- Fechas parseadas respetando `America/Santiago` (date-fns-tz).

Para activarla:
1. Pide un **ticket** en [api.mercadopublico.cl](https://api.mercadopublico.cl/) (solo para licitaciones; COT no lo necesita).
2. En Vercel → Environment Variables: `MP_TICKET`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (y opcional `MP_BUSCADOR_API_KEY`).
3. Probar manual: `curl -H "Authorization: Bearer TU_CRON_SECRET" http://localhost:3000/api/cron/ingesta`

### Buscar un proceso por código
`GET /api/buscar-codigo?codigo=3567-229-COT26` previsualiza; `POST` con `{ "codigo": "..." }` lo importa.
Sirve para traer una oportunidad puntual desde Mercado Público sin esperar al cron.

## Próximos pasos sugeridos
Formulario nuevo/editar · Detalle con tabs · Calendario de cierres · Reportes (export Excel) · PWA + notificaciones push · Deploy en Vercel · evaluar la nueva **API de Compra Ágil** de ChileCompra (beta, mayo 2026) para sincronizar datos automáticamente.
