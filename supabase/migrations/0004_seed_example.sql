-- =============================================================================
--  0004_seed_example.sql  (OPCIONAL)
--  Contenido de ejemplo para arrancar una empresa de demostración.
--
--  Este archivo NO crea reservas ni clientes ficticios: solo configuración
--  real (negocio, categorías, servicios, personal, horarios y galería) que
--  debes reemplazar por los datos de la barbería real.
--
--  Las imágenes son URLs de Unsplash usadas como marcador de posición.
--  Reemplázalas por fotografías propias alojadas en Supabase Storage
--  (bucket "public-assets") o en tu CDN.
--
--  Es idempotente: se puede ejecutar más de una vez sin duplicar filas.
-- =============================================================================

-- -----------------------------------------------------------------------------
--  Empresa
-- -----------------------------------------------------------------------------
insert into public.businesses (
  slug, name, tagline, description, address, city, region,
  phone, whatsapp, email, instagram,
  hero_image_url, primary_color, ink_color, timezone, is_published
)
values (
  'barberia-demo',
  'Barbería Don Córsico',
  'Estilo clásico, precisión moderna',
  'Barbería y peluquería en el corazón de Providencia. Cortes clásicos, afeitado tradicional a navaja y color profesional, con productos de primera línea y agenda por hora.',
  'Av. Providencia 1234, Local 5',
  'Providencia',
  'Región Metropolitana',
  '+56 2 2345 6789',
  '56912345678',
  'contacto@barberiadoncorsico.cl',
  'barberiadoncorsico',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1600&q=80',
  '#C9A227',
  '#0B0B0C',
  'America/Santiago',
  false
)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
--  Categorías
-- -----------------------------------------------------------------------------
insert into public.service_categories (business_id, name, sort_order)
select b.id, c.name, c.sort_order
from public.businesses b
cross join (values ('Cortes', 1), ('Barba', 2), ('Tratamientos', 3)) as c(name, sort_order)
where b.slug = 'barberia-demo'
  and not exists (
    select 1 from public.service_categories sc
    where sc.business_id = b.id and sc.name = c.name
  );

-- -----------------------------------------------------------------------------
--  Servicios (precio en CLP, duración en minutos)
-- -----------------------------------------------------------------------------
insert into public.services (business_id, category_id, name, description, duration_minutes, price, sort_order)
select
  b.id,
  (select sc.id from public.service_categories sc where sc.business_id = b.id and sc.name = s.category limit 1),
  s.name, s.description, s.duration_minutes, s.price, s.sort_order
from public.businesses b
cross join (values
  ('Cortes',       'Corte clásico',           'Corte a tijera y máquina, lavado y peinado final.',            30, 12000, 1),
  ('Cortes',       'Corte + barba',           'Corte completo más perfilado y arreglo de barba.',             45, 18000, 2),
  ('Cortes',       'Corte niño',              'Corte para menores de 12 años.',                               25,  9000, 3),
  ('Barba',        'Afeitado a navaja',       'Afeitado tradicional con toalla caliente y bálsamo.',           30, 10000, 4),
  ('Barba',        'Perfilado de barba',      'Definición de contornos y diseño de barba.',                    20,  8000, 5),
  ('Tratamientos', 'Coloración completa',     'Tinte profesional con diagnóstico previo.',                     60, 25000, 6),
  ('Tratamientos', 'Tratamiento capilar',     'Hidratación profunda y masaje capilar.',                        40, 15000, 7)
) as s(category, name, description, duration_minutes, price, sort_order)
where b.slug = 'barberia-demo'
  and not exists (
    select 1 from public.services sv
    where sv.business_id = b.id and sv.name = s.name
  );

-- -----------------------------------------------------------------------------
--  Personal
-- -----------------------------------------------------------------------------
insert into public.staff (business_id, full_name, title, bio, photo_url, is_active, sort_order)
select b.id, s.full_name, s.title, s.bio, s.photo_url, true, s.sort_order
from public.businesses b
cross join (values
  ('Matías Fuentes',  'Barbero principal',  '12 años de experiencia en cortes clásicos y fades.', 'https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?auto=format&fit=crop&w=600&q=80', 1),
  ('Javiera Rojas',   'Especialista en color', 'Colorimetría, rubios y tratamientos capilares.',  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80', 2),
  ('Cristóbal Núñez', 'Barbero y barba',    'Afeitado a navaja y diseño de barba.',                'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80', 3)
) as s(full_name, title, bio, photo_url, sort_order)
where b.slug = 'barberia-demo'
  and not exists (
    select 1 from public.staff st
    where st.business_id = b.id and st.full_name = s.full_name
  );

-- -----------------------------------------------------------------------------
--  Horario semanal: lunes a sábado 10:00–20:00 (0 = domingo)
-- -----------------------------------------------------------------------------
insert into public.staff_working_hours (business_id, staff_id, weekday, start_time, end_time)
select st.business_id, st.id, wd.weekday, time '10:00', time '20:00'
from public.staff st
join public.businesses b on b.id = st.business_id and b.slug = 'barberia-demo'
cross join (values (1),(2),(3),(4),(5),(6)) as wd(weekday)
on conflict (staff_id, weekday, start_time) do nothing;

-- -----------------------------------------------------------------------------
--  Galería
-- -----------------------------------------------------------------------------
insert into public.gallery_images (business_id, image_url, title, sort_order)
select b.id, g.image_url, g.title, g.sort_order
from public.businesses b
cross join (values
  ('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=900&q=80', 'Corte clásico', 1),
  ('https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=900&q=80', 'Barbería interior', 2),
  ('https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=80', 'Afeitado a navaja', 3),
  ('https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=80', 'Detalle de barba', 4),
  ('https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=900&q=80', 'Herramientas', 5),
  ('https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=900&q=80', 'Ambiente', 6)
) as g(image_url, title, sort_order)
where b.slug = 'barberia-demo'
  and not exists (
    select 1 from public.gallery_images gi
    where gi.business_id = b.id and gi.image_url = g.image_url
  );

-- =============================================================================
--  PRIMER ADMINISTRADOR
--  Reemplaza 'CAMBIA_ESTE_TOKEN_POR_UNO_ALEATORIO' por un valor secreto único
--  (por ejemplo el resultado de: select encode(gen_random_bytes(24),'hex')).
--
--  1) Crea la invitación (una sola vez):
--
--  insert into public.admin_invites (business_id, token, role, email, expires_at)
--  select id, 'CAMBIA_ESTE_TOKEN_POR_UNO_ALEATORIO', 'owner', 'tu@correo.cl',
--         now() + interval '72 hours'
--  from public.businesses where slug = 'barberia-demo';
--
--  2) Regístrate en el panel (/admin/login) con ese correo y contraseña.
--  3) Canjea la invitación:
--
--  select public.redeem_admin_invite('CAMBIA_ESTE_TOKEN_POR_UNO_ALEATORIO');
--
--  Detalle completo en docs/SUPABASE_SETUP.md
-- =============================================================================
