-- =============================================================================
--  0003_functions.sql
--  Funciones RPC. Son la superficie pública de escritura y de cálculo de
--  disponibilidad. Todas validan la empresa y los permisos EN EL SERVIDOR.
--
--  Nota de seguridad: el navegador nunca decide el business_id de la reserva;
--  envía el slug de la instalación y el servidor lo resuelve.
-- =============================================================================

-- -----------------------------------------------------------------------------
--  Código de referencia legible, sin caracteres ambiguos (0/O, 1/I).
-- -----------------------------------------------------------------------------
create or replace function public.generate_booking_reference()
returns text
language sql
volatile
as $$
  select 'BK-' || (
    select string_agg(
      substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1),
      ''
    )
    from generate_series(1, 6)
  );
$$;

-- -----------------------------------------------------------------------------
--  Datos públicos del negocio por slug
-- -----------------------------------------------------------------------------
create or replace function public.get_public_business(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(b)
  from public.businesses b
  where b.slug = p_slug and b.is_published = true;
$$;

-- -----------------------------------------------------------------------------
--  Catálogo público completo (negocio + categorías + servicios + personal +
--  galería + horarios) en UNA sola llamada, siempre acotado al slug.
-- -----------------------------------------------------------------------------
create or replace function public.get_public_catalog(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_biz public.businesses%rowtype;
begin
  select * into v_biz from public.businesses where slug = p_slug and is_published = true;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'business', to_jsonb(v_biz),
    'categories', coalesce((
      select jsonb_agg(c order by c.sort_order, c.name)
      from public.service_categories c where c.business_id = v_biz.id
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(s order by s.sort_order, s.name)
      from public.services s where s.business_id = v_biz.id and s.is_active = true
    ), '[]'::jsonb),
    'staff', coalesce((
      select jsonb_agg(st order by st.sort_order, st.full_name)
      from public.staff st where st.business_id = v_biz.id and st.is_active = true
    ), '[]'::jsonb),
    'gallery', coalesce((
      select jsonb_agg(g order by g.sort_order, g.created_at)
      from public.gallery_images g where g.business_id = v_biz.id and g.is_active = true
    ), '[]'::jsonb),
    'staffServices', coalesce((
      select jsonb_agg(jsonb_build_object('staff_id', ss.staff_id, 'service_id', ss.service_id))
      from public.staff_services ss
      join public.staff s2 on s2.id = ss.staff_id
      where s2.business_id = v_biz.id
    ), '[]'::jsonb),
    'workingHours', coalesce((
      select jsonb_agg(wh order by wh.weekday, wh.start_time)
      from public.staff_working_hours wh
      where wh.business_id = v_biz.id and wh.is_active = true
    ), '[]'::jsonb)
  );
end;
$$;

-- -----------------------------------------------------------------------------
--  Disponibilidad real de un día
--  Respeta: horario semanal del profesional, duración del servicio, reservas
--  existentes, bloqueos/feriados, anticipación mínima y zona horaria.
-- -----------------------------------------------------------------------------
create or replace function public.get_available_slots(
  p_slug text,
  p_staff_id uuid,
  p_service_id uuid,
  p_date date
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_biz     public.businesses%rowtype;
  v_service public.services%rowtype;
  v_staff   public.staff%rowtype;
  v_duration integer;
  v_step    interval;
  v_dow     smallint;
  v_today   date;
begin
  select * into v_biz from public.businesses where slug = p_slug and is_published = true;
  if not found then return; end if;

  select * into v_service from public.services
    where id = p_service_id and business_id = v_biz.id and is_active = true;
  if not found then return; end if;

  select * into v_staff from public.staff
    where id = p_staff_id and business_id = v_biz.id and is_active = true;
  if not found then return; end if;

  -- Si el profesional tiene servicios asignados, debe estar asignado este.
  if exists (select 1 from public.staff_services ss where ss.staff_id = v_staff.id)
     and not exists (
       select 1 from public.staff_services ss
       where ss.staff_id = v_staff.id and ss.service_id = v_service.id
     ) then
    return;
  end if;

  v_today := (now() at time zone v_biz.timezone)::date;
  if p_date < v_today then return; end if;
  if p_date > v_today + v_biz.booking_max_advance_days then return; end if;

  v_duration := v_service.duration_minutes;
  v_step     := make_interval(mins => v_biz.slot_interval_minutes);
  v_dow      := extract(dow from p_date)::smallint;

  return query
  select s.slot_start,
         s.slot_start + make_interval(mins => v_duration) as slot_end
  from (
    select (p_date + c.slot_time) at time zone v_biz.timezone as slot_start
    from (
      select gs::time as slot_time
      from public.staff_working_hours wh
      cross join lateral generate_series(
        (p_date + wh.start_time)::timestamp,
        (p_date + wh.end_time)::timestamp - make_interval(mins => v_duration),
        v_step
      ) as gs
      where wh.staff_id = v_staff.id
        and wh.weekday = v_dow
        and wh.is_active = true
    ) c
  ) s
  where s.slot_start >= now() + make_interval(mins => v_biz.booking_lead_minutes)
    and not exists (
      select 1 from public.bookings bk
      where bk.staff_id = v_staff.id
        and bk.status in ('pending','confirmed')
        and tstzrange(bk.starts_at, bk.ends_at, '[)')
            && tstzrange(s.slot_start, s.slot_start + make_interval(mins => v_duration), '[)')
    )
    and not exists (
      select 1 from public.schedule_blocks sb
      where sb.business_id = v_biz.id
        and (sb.staff_id is null or sb.staff_id = v_staff.id)
        and tstzrange(sb.starts_at, sb.ends_at, '[)')
            && tstzrange(s.slot_start, s.slot_start + make_interval(mins => v_duration), '[)')
    )
  order by s.slot_start;
end;
$$;

-- -----------------------------------------------------------------------------
--  Días con disponibilidad (para pintar el calendario del wizard de reserva)
-- -----------------------------------------------------------------------------
create or replace function public.get_available_days(
  p_slug text,
  p_staff_id uuid,
  p_service_id uuid,
  p_from date,
  p_days integer default 30
)
returns table (day date, total integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  i integer;
  d date;
begin
  for i in 0 .. (greatest(p_days, 1) - 1) loop
    d := p_from + i;
    day := d;
    select count(*) into total
      from public.get_available_slots(p_slug, p_staff_id, p_service_id, d);
    return next;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
--  Crear reserva pública (única vía de escritura para visitantes)
--  Devuelve los datos de la reserva creada. Ante cualquier problema lanza una
--  excepción con un código legible en el mensaje (P0001) que el frontend traduce.
-- -----------------------------------------------------------------------------
create or replace function public.create_public_booking(
  p_slug text,
  p_staff_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_biz        public.businesses%rowtype;
  v_service    public.services%rowtype;
  v_staff      public.staff%rowtype;
  v_duration   integer;
  v_end        timestamptz;
  v_customer   uuid;
  v_ref        text;
  v_id         uuid;
  v_attempt    integer := 0;
  v_dow        smallint;
  v_phone      text;
begin
  if p_customer_name is null or length(btrim(p_customer_name)) < 3 then
    raise exception 'NOMBRE_INVALIDO' using errcode = 'P0001';
  end if;

  v_phone := btrim(coalesce(p_customer_phone, ''));
  if length(regexp_replace(v_phone, '\D', '', 'g')) < 8 then
    raise exception 'TELEFONO_INVALIDO' using errcode = 'P0001';
  end if;

  select * into v_biz from public.businesses where slug = p_slug and is_published = true;
  if not found then
    raise exception 'NEGOCIO_NO_DISPONIBLE' using errcode = 'P0001';
  end if;

  select * into v_service from public.services
    where id = p_service_id and business_id = v_biz.id and is_active = true;
  if not found then
    raise exception 'SERVICIO_NO_DISPONIBLE' using errcode = 'P0001';
  end if;

  select * into v_staff from public.staff
    where id = p_staff_id and business_id = v_biz.id and is_active = true;
  if not found then
    raise exception 'BARBERO_NO_DISPONIBLE' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.staff_services ss where ss.staff_id = v_staff.id)
     and not exists (
       select 1 from public.staff_services ss
       where ss.staff_id = v_staff.id and ss.service_id = v_service.id
     ) then
    raise exception 'SERVICIO_NO_ASIGNADO' using errcode = 'P0001';
  end if;

  if p_starts_at is null then
    raise exception 'HORARIO_INVALIDO' using errcode = 'P0001';
  end if;

  v_duration := v_service.duration_minutes;
  v_end := p_starts_at + make_interval(mins => v_duration);

  if p_starts_at < now() + make_interval(mins => v_biz.booking_lead_minutes) then
    raise exception 'FUERA_DE_PLAZO' using errcode = 'P0001';
  end if;

  if p_starts_at > now() + make_interval(days => v_biz.booking_max_advance_days) then
    raise exception 'FUERA_DE_RANGO' using errcode = 'P0001';
  end if;

  -- Debe caer dentro del horario declarado del profesional.
  v_dow := extract(dow from (p_starts_at at time zone v_biz.timezone))::smallint;
  if not exists (
    select 1 from public.staff_working_hours wh
    where wh.staff_id = v_staff.id
      and wh.weekday = v_dow
      and wh.is_active = true
      and (p_starts_at at time zone v_biz.timezone)::time >= wh.start_time
      and (v_end at time zone v_biz.timezone)::time <= wh.end_time
  ) then
    raise exception 'FUERA_DE_HORARIO' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.schedule_blocks sb
    where sb.business_id = v_biz.id
      and (sb.staff_id is null or sb.staff_id = v_staff.id)
      and tstzrange(sb.starts_at, sb.ends_at, '[)') && tstzrange(p_starts_at, v_end, '[)')
  ) then
    raise exception 'HORARIO_BLOQUEADO' using errcode = 'P0001';
  end if;

  -- Cliente (uno por teléfono dentro de la empresa)
  insert into public.customers (business_id, full_name, phone, email)
  values (
    v_biz.id,
    btrim(p_customer_name),
    v_phone,
    nullif(btrim(coalesce(p_customer_email, '')), '')
  )
  on conflict (business_id, phone) do update
    set full_name  = excluded.full_name,
        email      = coalesce(excluded.email, public.customers.email),
        updated_at = now()
  returning id into v_customer;

  loop
    v_attempt := v_attempt + 1;
    v_ref := public.generate_booking_reference();

    begin
      insert into public.bookings (
        business_id, staff_id, service_id, customer_id, reference_code,
        customer_name, customer_phone, customer_email, notes,
        starts_at, ends_at, status,
        service_name_snapshot, staff_name_snapshot,
        duration_minutes, price_snapshot, source
      ) values (
        v_biz.id, v_staff.id, v_service.id, v_customer, v_ref,
        btrim(p_customer_name), v_phone, nullif(btrim(coalesce(p_customer_email, '')), ''),
        nullif(btrim(coalesce(p_notes, '')), ''),
        p_starts_at, v_end, 'confirmed',
        v_service.name, v_staff.full_name,
        v_duration, v_service.price, 'web'
      )
      returning id into v_id;

      exit;
    exception
      when exclusion_violation then
        raise exception 'HORARIO_NO_DISPONIBLE' using errcode = 'P0001',
          hint = 'Otro cliente tomó este horario. Elige otro.';
      when unique_violation then
        -- Colisión improbable del código de referencia: reintentar.
        if v_attempt >= 5 then raise; end if;
    end;
  end loop;

  return jsonb_build_object(
    'id', v_id,
    'reference_code', v_ref,
    'starts_at', p_starts_at,
    'ends_at', v_end,
    'status', 'confirmed',
    'service_name', v_service.name,
    'staff_name', v_staff.full_name,
    'duration_minutes', v_duration,
    'price', v_service.price,
    'customer_name', btrim(p_customer_name),
    'customer_phone', v_phone,
    'customer_email', nullif(btrim(coalesce(p_customer_email, '')), ''),
    'business_name', v_biz.name,
    'business_slug', v_biz.slug,
    'business_timezone', v_biz.timezone,
    'business_address', v_biz.address,
    'business_phone', v_biz.phone,
    'business_whatsapp', v_biz.whatsapp
  );
end;
$$;

-- -----------------------------------------------------------------------------
--  Consultar una reserva por referencia + teléfono (para el cliente)
-- -----------------------------------------------------------------------------
create or replace function public.get_booking_by_reference(
  p_slug text,
  p_reference text,
  p_phone text
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(bk)
  from public.bookings bk
  join public.businesses b on b.id = bk.business_id
  where b.slug = p_slug
    and upper(bk.reference_code) = upper(btrim(coalesce(p_reference, '')))
    and right(regexp_replace(bk.customer_phone, '\D', '', 'g'), 8)
        = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 8)
  limit 1;
$$;

-- -----------------------------------------------------------------------------
--  Cancelar una reserva desde el sitio público (misma validación de identidad)
-- -----------------------------------------------------------------------------
create or replace function public.cancel_public_booking(
  p_slug text,
  p_reference text,
  p_phone text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_row public.bookings%rowtype;
begin
  select bk.* into v_row
  from public.bookings bk
  join public.businesses b on b.id = bk.business_id
  where b.slug = p_slug
    and upper(bk.reference_code) = upper(btrim(coalesce(p_reference, '')))
    and right(regexp_replace(bk.customer_phone, '\D', '', 'g'), 8)
        = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 8)
  limit 1;

  if not found then
    raise exception 'RESERVA_NO_ENCONTRADA' using errcode = 'P0001';
  end if;

  if v_row.status not in ('pending','confirmed') then
    raise exception 'RESERVA_NO_CANCELABLE' using errcode = 'P0001';
  end if;

  if v_row.starts_at <= now() then
    raise exception 'RESERVA_YA_PASADA' using errcode = 'P0001';
  end if;

  update public.bookings set status = 'cancelled' where id = v_row.id;

  return jsonb_build_object('id', v_row.id, 'status', 'cancelled');
end;
$$;

-- -----------------------------------------------------------------------------
--  Membresías del usuario autenticado (el panel las usa para saber su empresa)
-- -----------------------------------------------------------------------------
create or replace function public.get_my_memberships()
returns table (
  business_id uuid,
  business_slug text,
  business_name text,
  role public.member_role,
  is_published boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.slug, b.name, m.role, b.is_published
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  where m.user_id = auth.uid()
  order by b.name;
$$;

-- -----------------------------------------------------------------------------
--  Canjear invitación de administrador (un solo uso)
--  Reemplaza cualquier "usuario admin por defecto": no hay credenciales fijas.
-- -----------------------------------------------------------------------------
create or replace function public.redeem_admin_invite(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_invite public.admin_invites%rowtype;
  v_uid    uuid := auth.uid();
  v_slug   text;
begin
  if v_uid is null then
    raise exception 'NO_AUTENTICADO' using errcode = 'P0001';
  end if;

  select * into v_invite
  from public.admin_invites
  where token = btrim(coalesce(p_token, ''))
  for update;

  if not found then
    raise exception 'INVITACION_INVALIDA' using errcode = 'P0001';
  end if;

  if v_invite.used_at is not null then
    raise exception 'INVITACION_USADA' using errcode = 'P0001';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'INVITACION_EXPIRADA' using errcode = 'P0001';
  end if;

  insert into public.business_members (business_id, user_id, role)
  values (v_invite.business_id, v_uid, v_invite.role)
  on conflict (business_id, user_id) do update set role = excluded.role;

  update public.admin_invites
    set used_at = now(), used_by = v_uid
    where id = v_invite.id;

  select slug into v_slug from public.businesses where id = v_invite.business_id;

  return jsonb_build_object(
    'business_id', v_invite.business_id,
    'business_slug', v_slug,
    'role', v_invite.role
  );
end;
$$;

-- -----------------------------------------------------------------------------
--  Estadísticas del panel (verifica pertenencia en el servidor)
-- -----------------------------------------------------------------------------
create or replace function public.get_dashboard_stats(p_business_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz    text;
  v_today date;
  v_month_start timestamp;
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'SIN_PERMISO' using errcode = 'P0001';
  end if;

  select timezone into v_tz from public.businesses where id = p_business_id;
  v_tz := coalesce(v_tz, 'America/Santiago');
  v_today := (now() at time zone v_tz)::date;
  v_month_start := date_trunc('month', (now() at time zone v_tz));

  return jsonb_build_object(
    'today_count', (
      select count(*) from public.bookings
      where business_id = p_business_id
        and status in ('pending','confirmed')
        and (starts_at at time zone v_tz)::date = v_today
    ),
    'upcoming_count', (
      select count(*) from public.bookings
      where business_id = p_business_id
        and status in ('pending','confirmed')
        and starts_at >= now()
    ),
    'week_count', (
      select count(*) from public.bookings
      where business_id = p_business_id
        and status in ('pending','confirmed')
        and (starts_at at time zone v_tz)::date between v_today and v_today + 6
    ),
    'month_revenue', (
      select coalesce(sum(price_snapshot), 0) from public.bookings
      where business_id = p_business_id
        and status in ('confirmed','completed')
        and (starts_at at time zone v_tz) >= v_month_start
    ),
    'month_bookings', (
      select count(*) from public.bookings
      where business_id = p_business_id
        and status in ('confirmed','completed')
        and (starts_at at time zone v_tz) >= v_month_start
    ),
    'total_customers', (
      select count(*) from public.customers where business_id = p_business_id
    ),
    'active_services', (
      select count(*) from public.services
      where business_id = p_business_id and is_active = true
    ),
    'active_staff', (
      select count(*) from public.staff
      where business_id = p_business_id and is_active = true
    ),
    'today', v_today
  );
end;
$$;

create or replace function public.get_revenue_series(p_business_id uuid, p_days integer default 14)
returns table (day date, bookings integer, revenue integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz    text;
  v_today date;
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'SIN_PERMISO' using errcode = 'P0001';
  end if;

  select timezone into v_tz from public.businesses where id = p_business_id;
  v_tz := coalesce(v_tz, 'America/Santiago');
  v_today := (now() at time zone v_tz)::date;

  return query
  select d.day,
         coalesce(agg.cnt, 0)::integer,
         coalesce(agg.rev, 0)::integer
  from generate_series(v_today - (greatest(p_days,1) - 1), v_today, interval '1 day') as d(day)
  left join lateral (
    select count(*) as cnt, sum(bk.price_snapshot) as rev
    from public.bookings bk
    where bk.business_id = p_business_id
      and bk.status in ('confirmed','completed')
      and (bk.starts_at at time zone v_tz)::date = d.day::date
  ) agg on true
  order by d.day;
end;
$$;
