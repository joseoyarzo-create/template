-- =============================================================================
--  0001_init_schema.sql
--  Esquema base multiempresa para la plantilla de barberías.
--
--  Modelo de aislamiento:
--    businesses  -> una fila por barbería (cada despliegue usa UNA por slug)
--    business_members -> vincula auth.users con una empresa y un rol
--    Todas las tablas de datos tienen business_id para aislar por empresa.
--
--  Ejecutar en: Supabase > SQL Editor (o supabase db push con la CLI).
-- =============================================================================

-- btree_gist permite la restricción de exclusión que impide reservas cruzadas.
create extension if not exists btree_gist with schema extensions;

-- -----------------------------------------------------------------------------
--  Tipos
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type public.member_role as enum ('owner', 'admin', 'staff');
  end if;
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type public.booking_status as enum
      ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
  end if;
  if not exists (select 1 from pg_type where typname = 'block_type') then
    create type public.block_type as enum ('holiday', 'vacation', 'block');
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
--  Utilidad: updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
--  businesses
-- -----------------------------------------------------------------------------
create table if not exists public.businesses (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique
                            check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name                    text not null,
  legal_name              text,
  tagline                 text,
  description             text,
  address                 text,
  city                    text,
  region                  text,
  phone                   text,
  whatsapp                text,               -- solo dígitos con código país, ej: 56912345678
  email                   text,
  instagram                text,
  logo_url                text,
  hero_image_url          text,
  primary_color           text not null default '#C9A227',
  ink_color               text not null default '#0B0B0C',
  currency                text not null default 'CLP',
  timezone                text not null default 'America/Santiago',
  map_url                 text,
  is_published            boolean not null default false,
  booking_lead_minutes    integer not null default 60   check (booking_lead_minutes >= 0),
  booking_max_advance_days integer not null default 60  check (booking_max_advance_days between 1 and 365),
  slot_interval_minutes   integer not null default 15   check (slot_interval_minutes between 5 and 60),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

drop trigger if exists trg_businesses_updated_at on public.businesses;
create trigger trg_businesses_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
--  business_members  (usuarios del panel administrativo)
-- -----------------------------------------------------------------------------
create table if not exists public.business_members (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          public.member_role not null default 'staff',
  display_name  text,
  created_at    timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists idx_business_members_user on public.business_members(user_id);

-- -----------------------------------------------------------------------------
--  admin_invites  (invitaciones de un solo uso para asignar administradores)
--  No existen credenciales por defecto: el primer admin se crea con una
--  invitación generada manualmente (ver docs/SUPABASE_SETUP.md).
-- -----------------------------------------------------------------------------
create table if not exists public.admin_invites (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  token         text not null unique,
  role          public.member_role not null default 'admin',
  email         text,
  expires_at    timestamptz,
  used_at       timestamptz,
  used_by       uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_admin_invites_business on public.admin_invites(business_id);

-- -----------------------------------------------------------------------------
--  service_categories
-- -----------------------------------------------------------------------------
create table if not exists public.service_categories (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  name          text not null,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (business_id, name)
);

create index if not exists idx_service_categories_business on public.service_categories(business_id);

-- -----------------------------------------------------------------------------
--  services  (precio en pesos chilenos, sin decimales -> integer)
-- -----------------------------------------------------------------------------
create table if not exists public.services (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  category_id       uuid references public.service_categories(id) on delete set null,
  name              text not null,
  description       text,
  duration_minutes  integer not null check (duration_minutes between 5 and 600),
  price             integer not null default 0 check (price >= 0),
  image_url         text,
  is_active         boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_services_business on public.services(business_id) where is_active;

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
--  staff  (barberos / profesionales)
-- -----------------------------------------------------------------------------
create table if not exists public.staff (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  full_name     text not null,
  title         text,
  bio           text,
  photo_url     text,
  email         text,
  phone         text,
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_staff_business on public.staff(business_id);

drop trigger if exists trg_staff_updated_at on public.staff;
create trigger trg_staff_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
--  staff_services  (qué servicios realiza cada profesional)
--  Si un profesional NO tiene filas aquí, se considera que realiza todos.
-- -----------------------------------------------------------------------------
create table if not exists public.staff_services (
  staff_id    uuid not null references public.staff(id) on delete cascade,
  service_id  uuid not null references public.services(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (staff_id, service_id)
);

-- -----------------------------------------------------------------------------
--  staff_working_hours  (horario semanal por profesional; 0 = domingo)
-- -----------------------------------------------------------------------------
create table if not exists public.staff_working_hours (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  staff_id      uuid not null references public.staff(id) on delete cascade,
  weekday       smallint not null check (weekday between 0 and 6),
  start_time    time not null,
  end_time      time not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  check (end_time > start_time)
);

create unique index if not exists uq_staff_working_hours_slot
  on public.staff_working_hours(staff_id, weekday, start_time);

-- -----------------------------------------------------------------------------
--  schedule_blocks  (feriados, vacaciones y bloqueos puntuales)
--  staff_id NULL  -> afecta a todo el negocio.
-- -----------------------------------------------------------------------------
create table if not exists public.schedule_blocks (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  staff_id      uuid references public.staff(id) on delete cascade,
  block_type    public.block_type not null default 'block',
  all_day       boolean not null default false,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  reason        text,
  created_at    timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists idx_schedule_blocks_business on public.schedule_blocks(business_id, starts_at);

-- -----------------------------------------------------------------------------
--  customers
-- -----------------------------------------------------------------------------
create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  full_name     text not null,
  phone         text not null,
  email         text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (business_id, phone)
);

create index if not exists idx_customers_business on public.customers(business_id);

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
--  bookings
--  Guarda snapshots de nombre/precio/duración para que el histórico no cambie
--  si luego se edita el servicio o el profesional.
-- -----------------------------------------------------------------------------
create table if not exists public.bookings (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid not null references public.businesses(id) on delete cascade,
  staff_id              uuid not null references public.staff(id) on delete restrict,
  service_id            uuid references public.services(id) on delete set null,
  customer_id           uuid references public.customers(id) on delete set null,
  reference_code        text not null unique,
  customer_name         text not null,
  customer_phone        text not null,
  customer_email        text,
  notes                 text,
  starts_at             timestamptz not null,
  ends_at               timestamptz not null,
  status                public.booking_status not null default 'confirmed',
  service_name_snapshot text not null,
  staff_name_snapshot   text not null,
  duration_minutes      integer not null check (duration_minutes > 0),
  price_snapshot        integer not null default 0 check (price_snapshot >= 0),
  source                text not null default 'web',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists idx_bookings_business_start on public.bookings(business_id, starts_at);
create index if not exists idx_bookings_staff_start on public.bookings(staff_id, starts_at);
create index if not exists idx_bookings_status on public.bookings(business_id, status);

-- Garantía a nivel de motor contra reservas cruzadas del mismo profesional.
-- Es la última línea de defensa: aunque dos navegadores reserven a la vez,
-- la segunda transacción falla con exclusion_violation (SQLSTATE 23P01).
alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('pending', 'confirmed'));

drop trigger if exists trg_bookings_updated_at on public.bookings;
create trigger trg_bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
--  gallery_images
-- -----------------------------------------------------------------------------
create table if not exists public.gallery_images (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  image_url   text not null,
  title       text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_gallery_business on public.gallery_images(business_id);
