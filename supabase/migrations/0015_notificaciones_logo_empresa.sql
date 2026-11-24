-- 0015 · Campana de notificaciones (con constancia de lectura) y logo de la empresa
--
-- * Todas las notificaciones del trabajador quedan en notificaciones_trabajador: las que envía el servidor
--   (visitas, documentos, GPS apagado…) y las que programa el propio celular (recordatorios de reportes,
--   pausas, excesos…), que la app registra al llegarle (clave_local).
-- * Al marcarla como leída en la campana se guarda leida_en: en la web queda quién la leyó y cuándo,
--   así el trabajador no puede decir que no la vio. Solo él puede marcar las suyas, una sola vez.
-- * Logo de la empresa: bucket público "logos"; lo sube el administrador (permiso web.empresa.logo).
--   La app lo muestra arriba en todas las pestañas; sin logo muestra el de MiRuta.

-- ---------- Notificaciones ----------
alter table notificaciones_trabajador
  add column if not exists tipo text,                 -- reporte, no_reporto, exceso, visita, geocerca, documento…
  add column if not exists origen text not null default 'servidor' check (origen in ('servidor', 'celular')),
  add column if not exists clave_local text,          -- id de la notificación programada en el celular
  add column if not exists entregada_en timestamptz,  -- cuando llegó a la bandeja del celular
  add column if not exists leida_en timestamptz;      -- cuando el trabajador la marcó como leída

create unique index if not exists notif_clave_local on notificaciones_trabajador (trabajador_id, clave_local)
  where clave_local is not null;
create index if not exists notif_trab_fecha on notificaciones_trabajador (trabajador_id, creada_en desc);

-- El celular registra las que él mismo programó (recordatorios, pausas, excesos) al llegar a la bandeja
create or replace function registrar_notificacion_local(
  p_clave text, p_tipo text, p_titulo text, p_cuerpo text, p_fecha timestamptz, p_datos jsonb default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  insert into notificaciones_trabajador
    (empresa_id, trabajador_id, titulo, cuerpo, datos, tipo, origen, clave_local, creada_en, enviada_en, entregada_en)
  values (mi_empresa(), auth.uid(), p_titulo, p_cuerpo, p_datos, p_tipo, 'celular', p_clave, p_fecha, p_fecha, now())
  on conflict (trabajador_id, clave_local) where clave_local is not null do nothing
  returning id into v_id;
  return v_id;
end $$;

-- Marcar como leídas (solo las propias, y la primera hora de lectura no se cambia nunca)
create or replace function marcar_notificaciones_leidas(p_ids bigint[] default null, p_claves text[] default null)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update notificaciones_trabajador
  set leida_en = now()
  where trabajador_id = auth.uid()
    and leida_en is null
    and (id = any(coalesce(p_ids, '{}')) or clave_local = any(coalesce(p_claves, '{}')));
  get diagnostics n = row_count;
  return n;
end $$;

-- Sin update directo desde la app: la hora de lectura la pone el servidor (now()), no el celular
revoke update on notificaciones_trabajador from authenticated;

-- La web ve las notificaciones de sus trabajadores (y si las leyeron) con el permiso web.notificaciones.ver
create policy notif_web_leer on notificaciones_trabajador for select using (
  empresa_id = mi_empresa() and tiene_permiso('web.notificaciones.ver'));

create or replace view v_lectura_notificaciones with (security_invoker = true) as
select n.empresa_id, n.trabajador_id, concat_ws(' ', p.nombres, p.apellidos) as trabajador,
       (n.creada_en at time zone 'America/Bogota')::date as fecha,
       n.creada_en as enviada, n.tipo, n.titulo, n.cuerpo, n.origen, n.entregada_en, n.leida_en,
       round(extract(epoch from (n.leida_en - n.creada_en)) / 60)::integer as minutos_para_leer
from notificaciones_trabajador n
join perfiles p on p.id = n.trabajador_id;

-- ---------- Logo de la empresa ----------
alter table empresas add column if not exists logo_url text;

-- Bucket público (el logo no es dato personal). Ruta: {empresa_id}/logo.png
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy logos_subir on storage.objects for insert with check (
  bucket_id = 'logos' and (storage.foldername(name))[1]::uuid = mi_empresa() and tiene_permiso('web.empresa.logo'));
create policy logos_cambiar on storage.objects for update using (
  bucket_id = 'logos' and (storage.foldername(name))[1]::uuid = mi_empresa() and tiene_permiso('web.empresa.logo'));
create policy logos_quitar on storage.objects for delete using (
  bucket_id = 'logos' and (storage.foldername(name))[1]::uuid = mi_empresa() and tiene_permiso('web.empresa.logo'));

-- Guardar o quitar la dirección del logo (null = la app usa el de MiRuta)
create or replace function guardar_logo_empresa(p_url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not tiene_permiso('web.empresa.logo') then raise exception 'sin_permiso'; end if;
  update empresas set logo_url = p_url where id = mi_empresa();
end $$;

-- ---------- Permisos ----------
insert into permisos_catalogo (clave, grupo, descripcion) values
  ('notificaciones.ver', 'Encabezado', 'Campana de notificaciones con la lista de avisos'),
  ('seguridad.cambiarPin', 'Menú → Seguridad', 'Cambiar su contraseña (PIN)'),
  ('web.notificaciones.ver', 'Web: novedades', 'Ver las notificaciones enviadas a los trabajadores y si las leyeron'),
  ('web.empresa.logo', 'Web: configuración', 'Subir o cambiar el logo de la empresa')
on conflict (clave) do nothing;

insert into permisos_rol (empresa_id, rol, permiso)
select e.id, 'trabajador', c from empresas e, unnest(array['notificaciones.ver', 'seguridad.cambiarPin']) c
on conflict do nothing;
insert into permisos_rol (empresa_id, rol, permiso)
select e.id, r::rol_usuario, 'web.notificaciones.ver' from empresas e, unnest(array['admin', 'supervisor', 'sst']) r
on conflict do nothing;
insert into permisos_rol (empresa_id, rol, permiso)
select e.id, 'admin', 'web.empresa.logo' from empresas e on conflict do nothing;
