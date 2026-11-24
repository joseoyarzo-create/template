# Configuración de Supabase

Esta guía cubre: creación del proyecto, ejecución de las migraciones (tablas y
políticas RLS), alta de la empresa, asignación segura del primer administrador,
almacenamiento de imágenes y despliegues múltiples.

---

## 1. Crear el proyecto

1. Entra en [supabase.com](https://supabase.com) y crea un proyecto nuevo.
2. Guarda la **contraseña de base de datos** en un lugar seguro.
3. En *Project Settings → API* copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

> **Nunca** uses la clave `service_role` en el frontend. Otorga acceso total y
> evita por completo las políticas RLS. La `anon key` es pública por diseño: lo
> que protege los datos son las políticas RLS, no el secreto de la clave.

## 2. Ejecutar las migraciones

Abre *SQL Editor* y ejecuta los archivos **en este orden** (o usa `supabase db push`
con la CLI de Supabase):

| Archivo | Contenido |
| --- | --- |
| `supabase/migrations/0001_init_schema.sql` | Tablas, tipos, índices y la restricción anti-solapamiento de reservas. |
| `supabase/migrations/0002_rls.sql` | RLS en todas las tablas, políticas y permisos. |
| `supabase/migrations/0003_functions.sql` | Funciones RPC (catálogo, disponibilidad, reservas, estadísticas, invitaciones). |
| `supabase/migrations/0004_seed_example.sql` | *(Opcional)* Contenido de ejemplo. **No** crea reservas ni clientes ficticios. |

El esquema requiere la extensión **`btree_gist`** (la habilita `0001`), que
permite la restricción de exclusión que impide reservas cruzadas del mismo
profesional.

### Modelo de datos (resumen)

`businesses` → una fila por barbería
`business_members` → vincula `auth.users` con una empresa y un rol
(`owner` / `admin` / `staff`)

Todas las tablas de datos tienen `business_id` para aislar por empresa:
`service_categories`, `services`, `staff`, `staff_services`,
`staff_working_hours`, `schedule_blocks`, `customers`, `bookings`,
`gallery_images`, `admin_invites`.

## 3. Seguridad: RLS

Principios aplicados en `0002_rls.sql`:

1. **Catálogo público** (servicios, profesionales, galería, horarios, categorías)
   solo es visible si la empresa está publicada (`is_published = true`).
2. **Datos operativos** (reservas, clientes, bloqueos, invitaciones) solo son
   visibles/editables por **miembros de esa empresa**.
3. La **inserción pública de reservas** no se permite por tabla: se realiza por
   el RPC `create_public_booking` (SECURITY DEFINER), que resuelve la empresa por
   `slug` y valida la disponibilidad en el servidor.
4. Los permisos se validan **en la base de datos** (funciones
   `is_business_member` / `has_business_role`), nunca solo ocultando botones.
5. El navegador **nunca** decide el `business_id` de la reserva: envía el `slug`
   de la instalación y el servidor lo resuelve.

Las funciones auxiliares son `SECURITY DEFINER` para poder leer
`business_members` sin disparar RLS (evita recursión).

## 4. Crear la empresa

Cada despliegue usa una fila de `businesses`. Ejecuta en el *SQL Editor*,
ajustando los datos:

```sql
insert into public.businesses (
  slug, name, tagline, description, address, city, region,
  phone, whatsapp, email, instagram,
  primary_color, ink_color, timezone, is_published
) values (
  'mi-barberia',                       -- debe coincidir con VITE_BUSINESS_SLUG
  'Barbería Ejemplo',
  'Estilo clásico, precisión moderna',
  'Descripción de la barbería.',
  'Av. Providencia 1234',
  'Providencia',
  'Región Metropolitana',
  '+56 9 1234 5678',
  '56912345678',                       -- WhatsApp: solo dígitos con código país
  'contacto@mibarberia.cl',
  'mibarberia',
  '#C9A227',                           -- color principal (detalles dorados)
  '#0B0B0C',                           -- color oscuro base
  'America/Santiago',
  false                                -- ponlo en true al terminar de configurar
);
```

> El `slug` debe cumplir el patrón `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
> No hay política de `INSERT` para clientes: la empresa se crea desde el SQL
> Editor o con el rol de servicio.

Servicios, profesionales, horarios y galería se cargan preferentemente desde el
**panel** (`/admin`), o con `0004_seed_example.sql` como punto de partida.

## 5. Primer administrador

**No existe una cuenta con credenciales predeterminadas.** El primer
administrador se asigna mediante una **invitación de un solo uso**.

### Paso 1 — Crear la invitación (SQL Editor)

```sql
insert into public.admin_invites (business_id, token, role, email, expires_at)
select id,
       encode(gen_random_bytes(24), 'hex'),   -- token secreto
       'owner',                               -- primer admin como propietario
       'tu@correo.cl',
       now() + interval '72 hours'
from public.businesses
where slug = 'mi-barberia';
```

Copia el `token` generado:

```sql
select token, expires_at, used_at
from public.admin_invites
where business_id = (select id from public.businesses where slug = 'mi-barberia')
order by created_at desc;
```

### Paso 2 — Canjear la invitación (desde el panel)

1. Ve a `/admin/login` y abre la pestaña **“Canjear invitación”**.
2. Ingresa tu correo, una contraseña y el **token**.
3. La aplicación crea tu cuenta (Supabase Auth), inicia sesión y llama al RPC
   `redeem_admin_invite`, que te vincula a la empresa con el rol indicado.

> La invitación debe canjearse **con la sesión del usuario** (desde el panel),
> porque `redeem_admin_invite` usa `auth.uid()`. Ejecutarla en el SQL Editor no
> funcionará: allí no hay usuario autenticado (`NO_AUTENTICADO`).
>
> Si tu proyecto exige confirmación por correo, confirma la cuenta antes de
> canjear la invitación.

### Añadir más administradores

Ya dentro del panel, en **Configuración → Equipo y accesos**, los roles
`admin`/`owner` pueden generar nuevas invitaciones (código de un solo uso, 72 h)
y gestionar los roles del equipo. El propietario puede revocar accesos.

## 6. Almacenamiento de imágenes (opcional)

La plantilla admite URLs de imágenes para logotipo, portada, servicios,
profesionales y galería. Puedes:

- Usar un CDN propio o Unsplash (como el seed), o
- Subir las imágenes a **Supabase Storage**.

Para usar Storage, crea un bucket **público** llamado `public-assets`
(*Storage → New bucket*) y sube allí tus imágenes. Luego pega la URL pública en
los campos de imagen del panel.

> La constante del bucket está en `src/lib/supabase.ts`
> (`PUBLIC_ASSETS_BUCKET`). Ajusta las políticas del bucket según tu necesidad
> (lectura pública, escritura solo autenticada).

## 7. Zona horaria y reservas

- Todas las fechas se guardan en PostgreSQL como `timestamptz` (UTC).
- La empresa define su zona horaria (`businesses.timezone`, por defecto
  `America/Santiago`).
- La disponibilidad (`get_available_slots`) y la creación de reservas
  (`create_public_booking`) se calculan **en el servidor**, respetando:
  horario del profesional, duración del servicio, reservas existentes,
  bloqueos/feriados, anticipación mínima y rango máximo de días.
- La restricción `bookings_no_overlap` (índice GiST con `tstzrange`) impide a
  nivel de motor dos reservas solapadas del mismo profesional.
- Una reserva **solo** se considera confirmada cuando el RPC responde sin error
  (la fila ya está persistida).

## 8. Despliegues múltiples

Dos estrategias válidas:

1. **Un proyecto Supabase por empresa.** Máximo aislamiento. Cada despliegue en
   Cloudflare Pages usa su propia `VITE_SUPABASE_URL`/`_ANON_KEY` y su `slug`.
2. **Un proyecto Supabase compartido.** Varias filas en `businesses`; cada
   despliegue pone su `VITE_BUSINESS_SLUG`. Las políticas RLS aíslan los datos
   por `business_id`, y el catálogo público solo expone la empresa del `slug`
   solicitado.

En ambos casos **no** hay que recompilar la aplicación para cambiar de empresa:
basta con las variables de entorno de cada despliegue.

## 9. Lista de verificación

- [ ] Migraciones `0001`–`0003` ejecutadas (y `0004` opcional).
- [ ] Fila en `businesses` con el `slug` correcto.
- [ ] `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_BUSINESS_SLUG`
      definidas localmente y en Cloudflare Pages.
- [ ] Invitación creada y canjeada → existe una fila en `business_members` con
      rol `owner`.
- [ ] Servicios, profesionales y horarios cargados.
- [ ] `businesses.is_published = true` para publicar el sitio.
- [ ] Verificado que **no** hay ninguna clave `service_role` en el código ni en
      las variables del frontend.
