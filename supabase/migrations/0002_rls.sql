-- =============================================================================
--  0002_rls.sql
--  Seguridad a nivel de fila (RLS). TODA tabla expuesta tiene RLS habilitada.
--
--  Principios aplicados:
--   1. El catálogo público (servicios, barberos, galería) solo es visible si la
--      empresa está publicada (is_published = true).
--   2. Los datos operativos (reservas, clientes, bloqueos, invitaciones) solo
--      son visibles/editable por miembros de ESA empresa.
--   3. La inserción pública de reservas NO se permite por tabla: se hace a
--      través del RPC create_public_booking (SECURITY DEFINER), que resuelve la
--      empresa por slug y valida disponibilidad en el servidor.
--   4. Los permisos se validan en la base de datos, no ocultando botones.
-- =============================================================================

alter table public.businesses             enable row level security;
alter table public.business_members       enable row level security;
alter table public.admin_invites          enable row level security;
alter table public.service_categories      enable row level security;
alter table public.services               enable row level security;
alter table public.staff                  enable row level security;
alter table public.staff_services         enable row level security;
alter table public.staff_working_hours    enable row level security;
alter table public.schedule_blocks        enable row level security;
alter table public.customers              enable row level security;
alter table public.bookings               enable row level security;
alter table public.gallery_images         enable row level security;

-- -----------------------------------------------------------------------------
--  Funciones auxiliares de autorización
--  SECURITY DEFINER => leen business_members sin disparar RLS (evita recursión).
-- -----------------------------------------------------------------------------
create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = p_business_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_business_role(p_business_id uuid, p_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = p_business_id
      and m.user_id = auth.uid()
      and m.role = any (p_roles)
  );
$$;

create or replace function public.is_business_public(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select b.is_published from public.businesses b where b.id = p_business_id), false);
$$;

-- -----------------------------------------------------------------------------
--  Permisos de tabla (RLS hace el filtrado real)
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- -----------------------------------------------------------------------------
--  businesses
-- -----------------------------------------------------------------------------
drop policy if exists businesses_select_public on public.businesses;
create policy businesses_select_public on public.businesses
  for select to anon, authenticated
  using (is_published = true);

drop policy if exists businesses_select_member on public.businesses;
create policy businesses_select_member on public.businesses
  for select to authenticated
  using (public.is_business_member(id));

drop policy if exists businesses_update_admin on public.businesses;
create policy businesses_update_admin on public.businesses
  for update to authenticated
  using (public.has_business_role(id, array['owner','admin']::public.member_role[]))
  with check (public.has_business_role(id, array['owner','admin']::public.member_role[]));
-- Sin política de INSERT para clientes: la empresa se crea con el rol de
-- servicio / SQL Editor (ver docs/SUPABASE_SETUP.md).

-- -----------------------------------------------------------------------------
--  business_members
-- -----------------------------------------------------------------------------
drop policy if exists members_select on public.business_members;
create policy members_select on public.business_members
  for select to authenticated
  using (public.is_business_member(business_id));

drop policy if exists members_insert_owner on public.business_members;
create policy members_insert_owner on public.business_members
  for insert to authenticated
  with check (public.has_business_role(business_id, array['owner']::public.member_role[]));

drop policy if exists members_update_owner on public.business_members;
create policy members_update_owner on public.business_members
  for update to authenticated
  using (public.has_business_role(business_id, array['owner']::public.member_role[]))
  with check (public.has_business_role(business_id, array['owner']::public.member_role[]));

drop policy if exists members_delete_owner on public.business_members;
create policy members_delete_owner on public.business_members
  for delete to authenticated
  using (public.has_business_role(business_id, array['owner']::public.member_role[]));

-- -----------------------------------------------------------------------------
--  admin_invites  (nunca visible al público)
-- -----------------------------------------------------------------------------
drop policy if exists invites_select_admin on public.admin_invites;
create policy invites_select_admin on public.admin_invites
  for select to authenticated
  using (public.has_business_role(business_id, array['owner','admin']::public.member_role[]));

drop policy if exists invites_insert_admin on public.admin_invites;
create policy invites_insert_admin on public.admin_invites
  for insert to authenticated
  with check (public.has_business_role(business_id, array['owner','admin']::public.member_role[]));

drop policy if exists invites_update_admin on public.admin_invites;
create policy invites_update_admin on public.admin_invites
  for update to authenticated
  using (public.has_business_role(business_id, array['owner','admin']::public.member_role[]))
  with check (public.has_business_role(business_id, array['owner','admin']::public.member_role[]));

drop policy if exists invites_delete_admin on public.admin_invites;
create policy invites_delete_admin on public.admin_invites
  for delete to authenticated
  using (public.has_business_role(business_id, array['owner','admin']::public.member_role[]));

-- -----------------------------------------------------------------------------
--  Catálogo público: service_categories, services, staff, gallery_images,
--  staff_services, staff_working_hours
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['service_categories','services','staff','gallery_images','staff_working_hours']
  loop
    execute format('drop policy if exists %1$s_select_public on public.%1$s', t);
    execute format($f$
      create policy %1$s_select_public on public.%1$s
        for select to anon, authenticated
        using (public.is_business_public(business_id) or public.is_business_member(business_id))
    $f$, t);

    execute format('drop policy if exists %1$s_write_admin on public.%1$s', t);
    execute format($f$
      create policy %1$s_write_admin on public.%1$s
        for all to authenticated
        using (public.has_business_role(business_id, array['owner','admin']::public.member_role[]))
        with check (public.has_business_role(business_id, array['owner','admin']::public.member_role[]))
    $f$, t);
  end loop;
end;
$$;

-- staff_services no tiene business_id: se resuelve vía staff.
drop policy if exists staff_services_select_public on public.staff_services;
create policy staff_services_select_public on public.staff_services
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.staff s
      where s.id = staff_services.staff_id
        and (public.is_business_public(s.business_id) or public.is_business_member(s.business_id))
    )
  );

drop policy if exists staff_services_write_admin on public.staff_services;
create policy staff_services_write_admin on public.staff_services
  for all to authenticated
  using (
    exists (
      select 1 from public.staff s
      where s.id = staff_services.staff_id
        and public.has_business_role(s.business_id, array['owner','admin']::public.member_role[])
    )
  )
  with check (
    exists (
      select 1 from public.staff s
      where s.id = staff_services.staff_id
        and public.has_business_role(s.business_id, array['owner','admin']::public.member_role[])
    )
  );

-- -----------------------------------------------------------------------------
--  schedule_blocks  (solo miembros)
-- -----------------------------------------------------------------------------
-- Solo miembros: los motivos de un bloqueo (vacaciones, licencias) son
-- información interna. La disponibilidad pública se calcula con el RPC.
drop policy if exists blocks_select_member on public.schedule_blocks;
create policy blocks_select_member on public.schedule_blocks
  for select to authenticated
  using (public.is_business_member(business_id));

drop policy if exists blocks_write_admin on public.schedule_blocks;
create policy blocks_write_admin on public.schedule_blocks
  for all to authenticated
  using (public.has_business_role(business_id, array['owner','admin']::public.member_role[]))
  with check (public.has_business_role(business_id, array['owner','admin']::public.member_role[]));

-- -----------------------------------------------------------------------------
--  customers  (solo miembros; el público se crea vía RPC)
-- -----------------------------------------------------------------------------
drop policy if exists customers_select_member on public.customers;
create policy customers_select_member on public.customers
  for select to authenticated
  using (public.is_business_member(business_id));

drop policy if exists customers_write_staff on public.customers;
create policy customers_write_staff on public.customers
  for all to authenticated
  using (public.has_business_role(business_id, array['owner','admin','staff']::public.member_role[]))
  with check (public.has_business_role(business_id, array['owner','admin','staff']::public.member_role[]));

-- -----------------------------------------------------------------------------
--  bookings
--  Sin política INSERT para anon: la reserva pública pasa por el RPC.
-- -----------------------------------------------------------------------------
drop policy if exists bookings_select_member on public.bookings;
create policy bookings_select_member on public.bookings
  for select to authenticated
  using (public.is_business_member(business_id));

drop policy if exists bookings_insert_staff on public.bookings;
create policy bookings_insert_staff on public.bookings
  for insert to authenticated
  with check (public.has_business_role(business_id, array['owner','admin','staff']::public.member_role[]));

drop policy if exists bookings_update_staff on public.bookings;
create policy bookings_update_staff on public.bookings
  for update to authenticated
  using (public.has_business_role(business_id, array['owner','admin','staff']::public.member_role[]))
  with check (public.has_business_role(business_id, array['owner','admin','staff']::public.member_role[]));

drop policy if exists bookings_delete_admin on public.bookings;
create policy bookings_delete_admin on public.bookings
  for delete to authenticated
  using (public.has_business_role(business_id, array['owner','admin']::public.member_role[]));
