-- =============================================================
-- MiRuta · Horas extras iniciadas por el trabajador después de su jornada
-- Inicio y fin con la hora del servidor; reportes cada hora con las mismas reglas.
-- Requiere 0001 a 0006.
-- =============================================================

alter type tipo_alerta add value if not exists 'horas_extra_inicio';
alter type tipo_alerta add value if not exists 'horas_extra_fin';

create table horas_extra (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  jornada_id uuid references jornadas(id) on delete set null,
  inicio timestamptz not null default now(),
  fin timestamptz,
  horas numeric(5,2) generated always as (round((extract(epoch from (fin - inicio)) / 3600)::numeric, 2)) stored,
  km numeric(8,2),
  reportes_esperados integer,
  reportes_enviados integer
);
create unique index una_sesion_activa on horas_extra (trabajador_id) where fin is null;
create index horas_extra_trabajador_fecha on horas_extra (trabajador_id, inicio desc);
alter table horas_extra enable row level security;
create policy horas_extra_leer on horas_extra for select using (puede_ver_trabajador(trabajador_id));
-- El trabajador no escribe directo: usa las funciones de abajo (toman la hora del servidor)

-- Los reportes de horas extras se enlazan a su sesión
alter table reportes_actividad add column if not exists horas_extra_id uuid references horas_extra(id) on delete cascade;

-- ---------- Fin de la jornada normal de hoy según el horario asignado ----------
-- Prioridad: horario del trabajador > de su grupo > de la empresa
create or replace function fin_horario_hoy(p_trabajador uuid) returns timestamptz
language sql stable security definer set search_path = public as $$
  with hoy as (select (now() at time zone 'America/Bogota')::date as d),
  asignado as (
    select ha.horario_id
    from horario_asignaciones ha
    join perfiles p on p.id = p_trabajador
    where ha.empresa_id = p.empresa_id
      and (ha.trabajador_id = p_trabajador or ha.grupo_id = p.grupo_id or (ha.trabajador_id is null and ha.grupo_id is null))
    order by (ha.trabajador_id is not null) desc, (ha.grupo_id is not null) desc
    limit 1
  )
  select max((hoy.d + hf.hora_fin) at time zone 'America/Bogota')
  from asignado a, hoy
  join horario_franjas hf on true
  where hf.horario_id = a.horario_id and hf.dia_semana = extract(isodow from hoy.d)
$$;

-- ---------- Iniciar: solo después de terminar la jornada normal ----------
create or replace function iniciar_horas_extra() returns horas_extra
language plpgsql security definer set search_path = public as $$
declare
  v_fin timestamptz := fin_horario_hoy(auth.uid());
  v_sesion horas_extra;
begin
  if v_fin is null then raise exception 'sin_jornada_hoy'; end if;
  if now() < v_fin then raise exception 'jornada_en_curso: disponible desde %', to_char(v_fin at time zone 'America/Bogota', 'HH24:MI'); end if;
  if exists (select 1 from horas_extra where trabajador_id = auth.uid() and fin is null) then raise exception 'ya_activa'; end if;

  insert into horas_extra (empresa_id, trabajador_id, jornada_id, inicio)
  select t.empresa_id, t.id,
         (select id from jornadas where trabajador_id = t.id and fecha = (now() at time zone 'America/Bogota')::date),
         now()
  from trabajadores t where t.id = auth.uid()
  returning * into v_sesion;

  insert into alertas (empresa_id, trabajador_id, tipo, mensaje, ocurrida_en)
  values (v_sesion.empresa_id, v_sesion.trabajador_id, 'horas_extra_inicio',
    format('Inició horas extras a las %s', to_char(now() at time zone 'America/Bogota', 'HH24:MI')), now());
  return v_sesion;
end $$;

-- ---------- Finalizar: calcula km y reportes del periodo ----------
create or replace function finalizar_horas_extra() returns horas_extra
language plpgsql security definer set search_path = public as $$
declare
  v_sesion horas_extra;
begin
  select * into v_sesion from horas_extra where trabajador_id = auth.uid() and fin is null;
  if not found then raise exception 'sin_sesion_activa'; end if;

  perform marcar_no_reporto_extra(v_sesion.id, now());

  update horas_extra h set
    fin = now(),
    km = coalesce((
      select round((sum(st_distance(p.ubicacion, p.anterior)) / 1000)::numeric, 2)
      from (
        select ubicacion, lag(ubicacion) over (order by capturado_en) as anterior
        from puntos_gps
        where trabajador_id = h.trabajador_id and capturado_en between h.inicio and now()
          and coalesce(precision_m, 0) <= 50 and not es_simulada
      ) p where p.anterior is not null
    ), 0),
    reportes_esperados = (select count(*) from reportes_actividad where horas_extra_id = h.id),
    reportes_enviados = (select count(*) from reportes_actividad where horas_extra_id = h.id and estado = 'a_tiempo')
  where h.id = v_sesion.id
  returning * into v_sesion;

  insert into alertas (empresa_id, trabajador_id, tipo, mensaje, ocurrida_en)
  values (v_sesion.empresa_id, v_sesion.trabajador_id, 'horas_extra_fin',
    format('Finalizó horas extras a las %s · %s h · %s km',
      to_char(now() at time zone 'America/Bogota', 'HH24:MI'), v_sesion.horas, v_sesion.km), now());
  return v_sesion;
end $$;

-- ---------- "No reportó" en horas extras ----------
-- Franjas de una hora contadas desde el inicio de la sesión. Al finalizar, la hora que quedó a medias
-- no cuenta si no se reportó. Programar también con pg_cron cada minuto (junto con marcar_no_reporto).
create or replace function marcar_no_reporto_extra(p_sesion uuid default null, p_hasta timestamptz default now())
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer := 0;
  f record;
begin
  for f in
    select h.id as sesion_id, h.empresa_id, h.trabajador_id, g as franja_inicio, g + interval '1 hour' as franja_fin
    from horas_extra h
    cross join lateral generate_series(h.inicio, coalesce(h.fin, p_hasta) - interval '1 hour', interval '1 hour') g
    where (p_sesion is null or h.id = p_sesion)
      and (p_sesion is not null or h.fin is null)
      and g + interval '1 hour' <= p_hasta
      and not exists (select 1 from reportes_actividad r where r.horas_extra_id = h.id and r.franja_inicio = g)
  loop
    insert into reportes_actividad (empresa_id, trabajador_id, horas_extra_id, franja_inicio, franja_fin, estado, recibido_en)
    values (f.empresa_id, f.trabajador_id, f.sesion_id, f.franja_inicio, f.franja_fin, 'no_reporto', null);
    insert into alertas (empresa_id, trabajador_id, tipo, mensaje)
    values (f.empresa_id, f.trabajador_id, 'no_reporto',
      format('No reportó la hora extra %s – %s',
        to_char(f.franja_inicio at time zone 'America/Bogota', 'HH24:MI'),
        to_char(f.franja_fin at time zone 'America/Bogota', 'HH24:MI')));
    n := n + 1;
  end loop;
  return n;
end $$;
--   select cron.schedule('no-reporto-extra', '* * * * *', 'select marcar_no_reporto_extra()');

-- ---------- Validación de reportes: también para franjas de horas extras ----------
create or replace function validar_reporte_en_su_hora() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sesion horas_extra;
begin
  if new.estado = 'no_reporto' then
    return new;
  end if;
  if now() < new.franja_inicio or now() >= new.franja_fin then
    raise exception 'fuera_de_horario: la hora % – % ya cerró o aún no empieza',
      to_char(new.franja_inicio at time zone 'America/Bogota', 'HH24:MI'),
      to_char(new.franja_fin at time zone 'America/Bogota', 'HH24:MI');
  end if;
  if new.franja_fin - new.franja_inicio <> interval '1 hour' then
    raise exception 'franja_invalida';
  end if;
  if new.horas_extra_id is null then
    if date_trunc('hour', new.franja_inicio) <> new.franja_inicio then raise exception 'franja_invalida'; end if;
  else
    -- Franja de horas extras: tiene que estar alineada con el inicio de una sesión activa del mismo trabajador
    select * into v_sesion from horas_extra where id = new.horas_extra_id and trabajador_id = new.trabajador_id and fin is null;
    if not found then raise exception 'sesion_horas_extra_invalida'; end if;
    if extract(epoch from (new.franja_inicio - v_sesion.inicio))::bigint % 3600 <> 0 or new.franja_inicio < v_sesion.inicio then
      raise exception 'franja_invalida';
    end if;
  end if;
  new.estado := 'a_tiempo';
  new.enviado_en := now();
  new.recibido_en := now();
  return new;
end $$;

-- Para el total por periodo en la web: select trabajador_id, sum(horas), sum(km) from horas_extra
--   where inicio::date between :desde and :hasta group by trabajador_id
