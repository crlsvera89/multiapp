# Guía para dejar MULTICOMERCIAL en línea

Pensada para hacerla sin saber programar. Sigue los pasos en orden. Al final tendrás un link tipo `https://multicomercial.vercel.app` que cualquiera del equipo puede usar desde su computador o celular.

Tiempo aproximado: 40–60 minutos la primera vez. Todo lo que se usa tiene plan gratis.

---

## Antes de empezar: crea 3 cuentas (gratis)
1. **GitHub** → https://github.com/signup (aquí se guarda el código)
2. **Supabase** → https://supabase.com (la base de datos y el login)
3. **Vercel** → https://vercel.com/signup → elige "Continue with GitHub" (aquí vive la web)

Usa el mismo correo para las tres si puedes, es más simple.

---

## PARTE 1 — Subir el código a GitHub

La forma más fácil sin terminal es con **GitHub Desktop** (programa con botones).

1. Descarga e instala GitHub Desktop: https://desktop.github.com
2. Ábrelo e inicia sesión con tu cuenta de GitHub.
3. Menú **File → New Repository** (o "Add → Create new repository"):
   - **Name:** `multicomercial`
   - **Local path:** elige una carpeta de tu computador.
   - Crea el repositorio.
4. Abre esa carpeta nueva en tu computador y **copia dentro TODOS los archivos del proyecto** (la carpeta `multicomercial` que te entregué: `src`, `supabase`, `public`, `package.json`, etc.). Que queden al mismo nivel, no dentro de otra subcarpeta.
5. Vuelve a GitHub Desktop: verás la lista de archivos. Abajo a la izquierda escribe un mensaje (ej. "primera versión") y pulsa **Commit to main**.
6. Arriba pulsa **Publish repository**. Deja desmarcado "Keep this code private" solo si quieres; puede quedar privado, da igual. Pulsa **Publish**.

Listo: tu código ya está en GitHub.

---

## PARTE 2 — Crear la base de datos en Supabase

1. Entra a https://supabase.com → **New project**.
   - **Name:** `multicomercial`
   - **Database Password:** inventa una y **guárdala** (la necesitarás si algo falla).
   - **Region:** elige "South America (São Paulo)" (la más cercana a Chile).
   - Crea el proyecto y espera ~2 minutos a que termine.
2. En el menú izquierdo entra a **SQL Editor → New query**.
3. Ahora carga el primer archivo. **Importante:** NO escribas ni pegues el nombre del archivo en Supabase. Hay que **abrir el archivo y copiar el texto que tiene adentro**:
   - En tu computador, dentro de la carpeta del proyecto, entra a la carpeta `supabase`, luego `migrations`, y abre `0001_init.sql` con un editor de texto (Bloc de notas / TextEdit, o el mismo GitHub Desktop muestra su contenido).
   - Dentro del archivo selecciona TODO (Ctrl+A en Windows, Cmd+A en Mac) y cópialo (Ctrl/Cmd+C). Verás muchas líneas que empiezan con `CREATE TABLE`, `CREATE TYPE`, etc. — eso es lo correcto.
   - Vuelve a Supabase, pega ese texto en el recuadro del SQL Editor (Ctrl/Cmd+V) y pulsa **Run** (abajo a la derecha). Debe decir "Success".

   > ⚠️ Si ves el error `syntax error at or near "supabase"`, es porque pegaste el **nombre** del archivo en vez de su **contenido**. Borra eso, abre el archivo de verdad y copia las líneas de adentro.
4. Repite exactamente lo mismo (abrir el archivo → copiar su contenido → pegar → Run), **en este orden**, uno por uno:
   - `0002_seed.sql`  → carga tus 311 procesos reales.
   - `0003_vendedores.sql`  → carga los trabajadores y sus colores.
   - `0004_sync_y_auditoria.sql`  → columnas para la ingesta automática, auditoría y sync incremental.
   - `0005_puntaje.sql`  → columnas para el puntaje de oportunidades.
5. Para comprobar: menú **Table Editor** → deberías ver las tablas `compras_agiles`, `licitaciones` y `vendedores` con datos.

### Copia tus claves (las usarás en la Parte 4)
Menú **Project Settings (engranaje) → API**:
- **Project URL** → es tu `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** → es tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** (pulsa "Reveal") → es tu `SUPABASE_SERVICE_ROLE_KEY` ⚠️ secreta, no la compartas

---

## PARTE 3 — Publicar la web en Vercel

1. Entra a https://vercel.com → **Add New… → Project**.
2. Verás tus repositorios de GitHub. Junto a `multicomercial` pulsa **Import**.
3. Vercel detecta que es Next.js solo. **No cambies nada todavía.**
4. Abre la sección **Environment Variables** y agrega estas (nombre → valor):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | tu Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu anon public |
   | `SUPABASE_SERVICE_ROLE_KEY` | tu service_role |
   | `NEXT_PUBLIC_SITE_URL` | lo completas después (ver Parte 5) — por ahora pon `https://multicomercial.vercel.app` |
   | `CRON_SECRET` | inventa un texto largo y aleatorio |

   (Las de ChileCompra se agregan más adelante, en la Parte 6.)
5. Pulsa **Deploy** y espera 1–2 minutos. Cuando termine te da tu link, algo como `https://multicomercial-xxxx.vercel.app`. **Cópialo.**

---

## PARTE 4 — Ajustar la URL real

1. Si tu link final no es exactamente `https://multicomercial.vercel.app`, vuelve a Vercel → tu proyecto → **Settings → Environment Variables** y corrige `NEXT_PUBLIC_SITE_URL` con el link real que te dio.
2. Después de cambiarla, ve a **Deployments → (los tres puntos del último) → Redeploy** para que tome el cambio.

---

## PARTE 5 — Activar el login por correo

Para que lleguen los enlaces de acceso:

1. En Supabase → **Authentication → URL Configuration**:
   - **Site URL:** pega tu link de Vercel (ej. `https://multicomercial.vercel.app`).
   - En **Redirect URLs** agrega: `https://TU-LINK.vercel.app/auth/confirm`
2. (Recomendado para que los correos lleguen bien) Supabase → **Authentication → Emails / SMTP**: el correo de prueba de Supabase tiene límite bajo. Para uso real conviene conectar un SMTP propio o Resend. Si recién parten, el de prueba alcanza para probar.
3. Prueba: abre tu link, escribe tu correo, te llega un enlace, haces clic y entras. 🎉

---

## PARTE 6 — Activar la carga automática

La carga automática trae dos fuentes:
- **Compras Ágiles (COT)** desde el buscador de Mercado Público → **no necesita ticket**.
- **Licitaciones (LE/LP/LR/L1)** desde la API oficial → **necesita un ticket**.

Pasos:
1. (Solo para licitaciones) Pide un **ticket** en https://api.mercadopublico.cl (te llega por correo).
2. En Vercel → Settings → Environment Variables agrega:
   - `MP_TICKET` = tu ticket (déjalo vacío si por ahora solo quieres Compras Ágiles)
   - `MP_BUSCADOR_API_KEY` = (opcional, solo si ChileCompra cambia la clave pública del buscador)
3. Redeploy. Desde ahí, **cada hora** Vercel trae oportunidades nuevas, les calcula su **puntaje**, las marca como subidas por "CLAUDE (auto)" en estado "Nuevo", y **no toca** lo que el equipo ya trabajó.
4. Para probar la ingesta a mano (reemplaza TU_CRON_SECRET y el link):
   `https://TU-LINK.vercel.app/api/cron/ingesta` con cabecera `Authorization: Bearer TU_CRON_SECRET`.
5. **Recalcular puntajes** (re-aprende del historial): `POST` a `https://TU-LINK.vercel.app/api/recalcular-puntajes` estando logueado. Conviene hacerlo cada tanto, sobre todo después de marcar varios procesos como "No ejecutable".

> Para traer una oportunidad puntual sin esperar al cron: `GET /api/buscar-codigo?codigo=XXXX` previsualiza y `POST /api/buscar-codigo` con `{ "codigo": "XXXX" }` la importa.

---

## Si algo falla
- **La web carga pero no entra / error de Supabase:** revisa que las 3 variables de Supabase estén bien pegadas (sin espacios) y haz Redeploy.
- **El correo de acceso no llega:** revisa spam; confirma Site URL y Redirect URL en Supabase (Parte 5).
- **"Failed to compile" en Vercel:** normalmente es una variable faltante; revisa la lista de la Parte 3.
- **No ves datos:** confirma que corriste los 5 SQL en orden (Parte 2): 0001 → 0002 → 0003 → 0004 → 0005.

## Para actualizar la web más adelante
Cada vez que cambies algo: copias los archivos nuevos a la carpeta, en GitHub Desktop haces **Commit** y **Push**, y Vercel republica solo. No hay que repetir toda la guía.

---

¿Te trabaste en algún paso? Dime el número del paso y lo que ves en pantalla, y te ayudo a destrabarlo.
