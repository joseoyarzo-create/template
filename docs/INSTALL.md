# Guía de instalación y publicación

Plantilla comercial reutilizable para crear aplicaciones web independientes de
barberías y peluquerías en Chile. Cada despliegue corresponde a **una empresa**
con su propia identidad visual y sus datos aislados en Supabase.

El proyecto es una **SPA estática** (React + TypeScript + Vite) que consume
Supabase (PostgreSQL + Auth). No requiere servidor propio.

---

## 1. Requisitos

- Node.js **18.18 o superior** y npm.
- Una cuenta en [Supabase](https://supabase.com) (plan gratuito suficiente).
- Una cuenta en [Cloudflare](https://cloudflare.com) para publicar el frontend.

> La base de datos **no** se replica en local. Supabase es la única fuente de
> datos, tanto en desarrollo como en producción.

## 2. Instalación local

```bash
# 1) Instala dependencias
npm install

# 2) Copia la plantilla de variables de entorno y complétala
copy .env.example .env      # Windows (PowerShell)
# cp .env.example .env      # macOS / Linux

# 3) Levanta el servidor de desarrollo
npm run dev
```

Abre `http://localhost:5173`.

Si faltan variables de entorno, la aplicación **no** muestra datos falsos:
muestra un aviso (“Configuración pendiente”) indicando exactamente qué falta.

Antes de que la app funcione con datos reales debes crear el esquema en Supabase
(ver [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)).

## 3. Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Sí | URL del proyecto Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Sí | Clave **pública** (anon). Nunca la `service_role`. |
| `VITE_BUSINESS_SLUG` | Sí | Identificador público de la instalación; debe coincidir con `businesses.slug`. |
| `VITE_MIN_LEAD_MINUTES` | No | Anticipación mínima por defecto (min). |
| `VITE_MAX_ADVANCE_DAYS` | No | Días máximos hacia adelante por defecto. |
| `VITE_SHOW_ADMIN_LINK` | No | `false` oculta el enlace al panel en el sitio público. |
| `VITE_BUSINESS_NAME` / `_PHONE` / `_WHATSAPP` / `_ADDRESS` | No | Sobrescriben datos de contacto. |

En producción, define estas mismas variables en Cloudflare Pages.

## 4. Comandos

| Comando | Acción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Verifica tipos (`tsc -b`) y genera el sitio en `dist/`. |
| `npm run preview` | Sirve localmente la carpeta `dist/`. |
| `npm run typecheck` | Solo verificación de tipos (sin emitir). |

## 5. Personalización por empresa

Hay **dos** lugares para personalizar, y ningún otro:

1. **`.env`** — URL/clave de Supabase y el `VITE_BUSINESS_SLUG`.
2. **`src/config/business.config.ts`** — textos por defecto, colores iniciales,
   imágenes de respaldo e interruptores de funcionalidades
   (`gallery`, `team`, `adminStats`, `adminLink`).

Todo el **contenido** (nombre, colores definitivos, servicios, precios,
profesionales, horarios, galería, contacto y publicación) vive en Supabase y se
administra desde el **panel** (`/admin`), sin recompilar.

### Copiar para una nueva barbería

1. Duplica el proyecto y crea un despliegue nuevo en Cloudflare Pages.
2. Crea (o reutiliza) un proyecto Supabase:
   - **Un proyecto por empresa** → aislamiento total.
   - **Un proyecto compartido** → varias filas en `businesses`; cada despliegue
     apunta a su `slug`. El aislamiento lo garantizan las políticas RLS.
3. Ajusta `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_BUSINESS_SLUG`) y `business.config.ts`.
4. Publica. No hay que reconstruir la aplicación.

## 6. Publicación en Cloudflare Pages

1. Sube el repositorio a GitHub/GitLab.
2. En Cloudflare Pages crea un proyecto y conecta el repositorio.
3. Configura el build:
   - **Framework preset:** None / Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Variable de entorno:** `NODE_VERSION = 18` (o superior)
4. Define las variables de `VITE_*` en *Settings → Environment variables*.
5. Guarda y publica.

Detalles incluidos en el repositorio:

- `public/_redirects` → fallback SPA (`/*  /index.html  200`) para que React
  Router funcione al recargar rutas como `/reservar` o `/admin/calendario`.
- `wrangler.toml` → configuración opcional para `wrangler pages deploy`.

## 7. Estructura del proyecto

```
src/
  components/
    layout/   Cabeceras, pies, layouts público y de panel, guardas de ruta
    public/   Componentes del sitio público (tarjetas, horario)
    ui/       Sistema de diseño (Button, Card, Form, Modal, Badge, Feedback…)
  config/     business.config.ts (empresa) y env.ts (variables de entorno)
  context/    Proveedores: Auth, Business (catálogo público), Toast
  hooks/      useAsync, useDocumentMeta
  lib/        supabase.ts, datetime.ts, format.ts, errors.ts, theme.ts, utils.ts
  pages/
    public/   Inicio, servicios, galería, equipo, reserva, confirmación, contacto
    admin/    Login, resumen, calendario, reservas, servicios, personal,
              horarios, bloqueos, clientes, estadísticas, configuración
  services/   Acceso a datos por dominio (auth, bookings, availability, …)
  types/      Tipos del dominio equivalentes al esquema SQL
supabase/
  migrations/ 0001…0004 (esquema, RLS, funciones, seed de ejemplo)
```

Reglas de arquitectura:

- Las páginas **públicas** nunca consultan Supabase directamente: leen del
  contexto `useBusiness()`.
- Las páginas del **panel** usan `useAsync` + la capa `@/services`.
- La disponibilidad y la creación de reservas pasan **siempre** por funciones
  RPC del servidor; el navegador no calcula horas libres.

## 8. Puesta en marcha del primer administrador

No existen credenciales por defecto. El primer administrador se asigna con una
**invitación de un solo uso**. Pasos detallados en
[SUPABASE_SETUP.md](./SUPABASE_SETUP.md#5-primer-administrador).
