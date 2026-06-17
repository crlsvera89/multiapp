# Hoja de ruta — Automatización MULTICOMERCIAL

Documento de visión y arquitectura. Resume qué es factible, cómo se construye y qué tiene límites.

## Estado actual (Etapa 0 — listo)
- App web multiusuario con login. Cada usuario entra con su correo y su nombre queda registrado.
- Carga manual: crear / editar / eliminar procesos desde la web.
- Importación de Excel (`import:excel`) con limpieza y upsert.
- Tomar proceso: un usuario "toma" un proceso y queda registrado en `trabajado_por` + `trabajado_en`.
- Listas con filtros, dashboard y calendario de cierres.

## Etapa 1 — Carga automática desde Mercado Público (próximo objetivo)

**La forma correcta NO es "scrapear" el portal, es usar la API oficial de ChileCompra.**
- En mayo 2026 ChileCompra lanzó la **API de Compra Ágil (beta)** que permite: detectar nuevas Compras Ágiles en tiempo real, sincronización incremental, y filtrar por región, estado, palabras clave y fechas. Esto es exactamente lo que necesitas.
- Para Licitaciones / Trato Directo / Convenio Marco existe la API clásica (`api.mercadopublico.cl`).
- El buscador web usa render JS y no entrega datos por descarga directa — por eso se usa la API, no el scraping.

**Cómo correría la carga cada 1 hora (importante entender esto):**
- El trabajo recurrente debe correr en el **servidor de la app (Vercel Cron)**, NO como una tarea de Claude en este chat. Razón: es una app compartida por varios usuarios que tiene que funcionar sola, 24/7, aunque yo no esté en una conversación. Una tarea programada mía dependería de mi sesión; la app no debe depender de eso.
- Diseño: una ruta protegida `/api/cron/ingesta` que cada hora:
  1. Llama a la API de ChileCompra por cada **región** y **rubro**.
  2. Normaliza (mismo limpiador que ya tenemos: código, estado, fechas, REVISAR).
  3. Hace `upsert` por código → no duplica.
  4. Marca los registros automáticos con `subido_por = 'CLAUDE (auto)'` y guarda fecha de subida y fecha de cierre.
  5. Ordena/queda disponible por código, región y estado = Nuevo.

**"Que Claude aprenda a elegir oportunidades": (IMPLEMENTADO — v1)**
- Ya está construido un **puntaje de oportunidades** transparente (`src/lib/scoring.ts`): a cada oportunidad nueva le asigna un puntaje 0–100 con motivos explicables, según región y rubro (palabras clave).
- El modelo se **deriva del historial real**: `construirModelo()` calcula la afinidad de cada palabra/región comparando lo marcado "Realizada" vs "No ejecutable/Cerrada". Mientras más clasifique el equipo, más afinado queda (endpoint `POST /api/recalcular-puntajes`).
- Mientras haya poco historial negativo, usa un **modelo por defecto** derivado del Excel inicial.
- Se ve en el Dashboard ("Oportunidades priorizadas") y la ingesta lo calcula automáticamente.
- **Limitación honesta hoy:** el historial está ~98% en "Realizada", así que el modelo premia bien lo afín pero todavía tiene pocos ejemplos de qué descartar. Mejora a medida que marquen más "No ejecutable".
- Futuro: sumar monto y un puntaje con IA por encima de las reglas.

## Etapa 2 — Estudio post-cierre
- Cuando un proceso pasa su fecha de cierre, revisar la **adjudicación** vía API: ¿la ganó tu empresa u otra?
- Si la ganó otra: registrar quién y, cuando los datos lo permitan, **por qué se perdió** (precio vs. faltó documentación).
- Límite honesto: el "por qué" no siempre está en datos estructurados. El precio del ganador suele estar disponible; la causa exacta (documentos faltantes, observaciones) a veces vive en documentos del proceso y puede requerir lectura asistida + confirmación manual. Lo automatizamos donde se puede y dejamos lo demás como apoyo, no como verdad absoluta.

## Resumen de lo que yo puedo hacer vs. lo que corre solo
- **Yo construyo** todo el código (la app, la ruta de ingesta, el scoring) aquí o desde Claude Code.
- **Corre solo** en la infraestructura de ustedes (Vercel + Supabase) una vez desplegado. Ahí vive la automatización por hora y el acceso multiusuario.
- Antes de programar la Etapa 1 conviene **verificar la documentación vigente** de la API de Compra Ágil (endpoints, autenticación, si pide ticket/API key), porque está en beta y puede haber cambiado.
