-- =============================================================
-- MiRuta · Reportes de actividad cada hora
-- Requiere 0001_esquema_inicial.sql
-- =============================================================

-- Nuevos tipos de alerta
alter type tipo_alerta add value if not exists 'reporte_recibido';
alter type tipo_alerta add value if not exists 'reporte_no_enviado';

create type estado_reporte as enum ('a_tiempo', 'tarde', 'no_enviado');

-- Un registro por trabajador y por franja de una hora.
-- Los "no_enviado" los crea el servidor (función marcar_reportes_no_enviados).
create table reportes_actividad (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  jornada_id uuid references jornadas(id) on delete set null,
  franja_inicio timestamptz not null,
  franja_fin timestamptz not null,
  estado estado_reporte not null,
  enviado_en timestamptz,                    -- hora del celular al enviar
  recibido_en timestamptz default now(),     -- hora del servidor
  descripcion text check (char_length(descripcion) <= 500),
  ubicacion geography(Point, 4326),
  precision_m real,
  ubicacion_simulada boolean not null default false,
  selfie_url text,
  selfie_tomada_en timestamptz,
  selfie_ubicacion geography(Point, 4326),
  peso_total_kb integer,
  unique (trabajador_id, franja_inicio)
);
create index reportes_empresa_fecha on reportes_actividad (empresa_id, franja_inicio desc);
create index reportes_trabajador_fecha on reportes_actividad (trabajador_id, franja_inicio desc);

-- Fotos de la tarea (1 a 3 por reporte)
create table reporte_fotos (
  id uuid primary key default gen_random_uuid(),
  reporte_id uuid not null references reportes_actividad(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  url text not null,           -- ruta en el almacenamiento (Supabase Storage o Cloudflare R2)
  ancho integer,
  alto integer,
  peso_kb integer,
  tomada_en timestamptz,
  origen text not null default 'camara' check (origen in ('camara', 'galeria'))
);

-- ---------- Seguridad (RLS) ----------
alter table reportes_actividad enable row level security;
alter table reporte_fotos enable row level security;

create policy reportes_leer on reportes_actividad for select using (puede_ver_trabajador(trabajador_id));
create policy reportes_insertar on reportes_actividad for insert
  with check (trabajador_id = auth.uid() and empresa_id = mi_empresa() and estado <> 'no_enviado');

create policy fotos_leer on reporte_fotos for select
  using (exists (select 1 from reportes_actividad r where r.id = reporte_id and puede_ver_trabajador(r.trabajador_id)));
create policy fotos_insertar on reporte_fotos for insert
  with check (exists (select 1 from reportes_actividad r where r.id = reporte_id and r.trabajador_id = auth.uid()));

-- ---------- Alerta al administrador cuando llega un reporte ----------
-- La web escucha la tabla "alertas" con Supabase Realtime y muestra la notificación al instante.
create or replace function avisar_reporte_recibido() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.estado <> 'no_enviado' then
    insert into alertas (empresa_id, trabajador_id, tipo, mensaje, estado)
    values (
      new.empresa_id, new.trabajador_id, 'reporte_recibido',
      format('Envió su reporte de %s – %s%s',
        to_char(new.franja_inicio at time zone 'America/Bogota', 'HH24:MI'),
        to_char(new.franja_fin at time zone 'America/Bogota', 'HH24:MI'),
        case when new.estado = 'tarde' then ' (tarde)' else '' end),
      'vista'
    );
  end if;
  return new;
end $$;

create trigger trg_reporte_recibido after insert on reportes_actividad
  for each row execute function avisar_reporte_recibido();

-- ---------- Reportes no enviados a tiempo ----------
-- Revisa las franjas que ya vencieron (cierre + 15 min) de los trabajadores con jornada hoy
-- y crea el registro "no_enviado" y su alerta. Programar con pg_cron cada 5 minutos:
--   select cron.schedule('reportes-no-enviados', '*/5 * * * *', 'select marcar_reportes_no_enviados()');
create or replace function marcar_reportes_no_enviados(margen interval default '15 minutes') returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer := 0;
  f record;
begin
  for f in
    select j.empresa_id, j.trabajador_id, j.id as jornada_id,
           h as franja_inicio, h + interval '1 hour' as franja_fin
    from jornadas j
    cross join lateral generate_series(
      date_trunc('hour', j.inicio), coalesce(j.fin, now()) - interval '1 hour', interval '1 hour'
    ) as h
    where j.fecha = (now() at time zone 'America/Bogota')::date
      and h + interval '1 hour' + margen < now()
      and not exists (
        select 1 from reportes_actividad r where r.trabajador_id = j.trabajador_id and r.franja_inicio = h
      )
  loop
    insert into reportes_actividad (empresa_id, trabajador_id, jornada_id, franja_inicio, franja_fin, estado, recibido_en)
    values (f.empresa_id, f.trabajador_id, f.jornada_id, f.franja_inicio, f.franja_fin, 'no_enviado', null);

    insert into alertas (empresa_id, trabajador_id, tipo, mensaje)
    values (f.empresa_id, f.trabajador_id, 'reporte_no_enviado',
      format('No envió el reporte de actividad de %s – %s',
        to_char(f.franja_inicio at time zone 'America/Bogota', 'HH24:MI'),
        to_char(f.franja_fin at time zone 'America/Bogota', 'HH24:MI')));
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- Retención de fotos (para no llenar el almacenamiento gratuito) ----------
-- Devuelve las rutas de fotos con más de N días para que una tarea programada
-- (Edge Function) las borre del almacenamiento. El texto, la hora y el GPS del reporte se conservan.
create or replace function fotos_para_borrar(dias integer default 90)
returns table (url text) language sql stable security definer set search_path = public as $$
  select f.url from reporte_fotos f
  join reportes_actividad r on r.id = f.reporte_id
  where r.franja_inicio < now() - make_interval(days => dias)
  union all
  select selfie_url from reportes_actividad
  where selfie_url is not null and franja_inicio < now() - make_interval(days => dias)
$$;
