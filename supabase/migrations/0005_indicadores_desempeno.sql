-- =============================================================
-- MiRuta · Indicadores de desempeño: km, velocidades, excesos y eficiencia
-- Requiere 0001 a 0004.
-- =============================================================

-- ---------- Configuración por empresa (la edita el administrador) ----------
create table configuracion_empresa (
  empresa_id uuid primary key references empresas(id) on delete cascade,
  limite_velocidad_kmh integer not null default 60 check (limite_velocidad_kmh between 20 and 120),
  eficiencia_verde integer not null default 90 check (eficiencia_verde between 1 and 100),
  eficiencia_naranja integer not null default 70,
  actualizado_en timestamptz not null default now(),
  check (eficiencia_naranja > 0 and eficiencia_naranja < eficiencia_verde)
);
alter table configuracion_empresa enable row level security;
create policy config_leer on configuracion_empresa for select using (mi_rol() = 'superadmin' or empresa_id = mi_empresa());
create policy config_admin on configuracion_empresa for all
  using (mi_rol() = 'superadmin' or (empresa_id = mi_empresa() and mi_rol() = 'admin'))
  with check (mi_rol() = 'superadmin' or (empresa_id = mi_empresa() and mi_rol() = 'admin'));

create or replace function limite_velocidad(p_empresa uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce((select limite_velocidad_kmh from configuracion_empresa where empresa_id = p_empresa), 60)
$$;

-- ---------- Resumen de cada jornada ----------
alter table jornadas
  add column if not exists horas_movimiento numeric(6,2),
  add column if not exists vel_promedio_kmh numeric(5,1),
  add column if not exists vel_maxima_kmh numeric(5,1);

-- ---------- Registro de excesos de velocidad ----------
-- Un registro por episodio: si sigue por encima del límite dentro de 5 minutos, se actualiza la velocidad máxima.
create table excesos_velocidad (
  id bigint generated always as identity primary key,
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  jornada_id uuid references jornadas(id) on delete set null,
  ocurrido_en timestamptz not null,
  ultimo_punto_en timestamptz not null,
  ubicacion geography(Point, 4326) not null,
  velocidad_kmh numeric(5,1) not null,
  limite_kmh integer not null
);
create index excesos_trabajador_fecha on excesos_velocidad (trabajador_id, ocurrido_en desc);
alter table excesos_velocidad enable row level security;
create policy excesos_leer on excesos_velocidad for select using (puede_ver_trabajador(trabajador_id));

create or replace function detectar_exceso_velocidad() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_limite integer := limite_velocidad(new.empresa_id);
  v_ultimo excesos_velocidad;
begin
  if new.velocidad_kmh is null or new.velocidad_kmh <= v_limite or coalesce(new.precision_m, 0) > 50 then
    return new;
  end if;

  select * into v_ultimo from excesos_velocidad
  where trabajador_id = new.trabajador_id and ultimo_punto_en > new.capturado_en - interval '5 minutes'
  order by ocurrido_en desc limit 1;

  if found then
    -- mismo episodio: guarda la velocidad más alta y su ubicación
    update excesos_velocidad
      set ultimo_punto_en = new.capturado_en,
          velocidad_kmh = greatest(velocidad_kmh, new.velocidad_kmh),
          ubicacion = case when new.velocidad_kmh > velocidad_kmh then new.ubicacion else ubicacion end
    where id = v_ultimo.id;
    return new;
  end if;

  insert into excesos_velocidad (empresa_id, trabajador_id, jornada_id, ocurrido_en, ultimo_punto_en, ubicacion, velocidad_kmh, limite_kmh)
  values (new.empresa_id, new.trabajador_id, new.jornada_id, new.capturado_en, new.capturado_en, new.ubicacion, new.velocidad_kmh, v_limite);

  insert into alertas (empresa_id, trabajador_id, tipo, mensaje, ocurrida_en)
  values (new.empresa_id, new.trabajador_id, 'exceso_velocidad',
    format('%s km/h (límite %s km/h) a las %s · %s, %s',
      round(new.velocidad_kmh), v_limite,
      to_char(new.capturado_en at time zone 'America/Bogota', 'HH24:MI'),
      round(st_y(new.ubicacion::geometry)::numeric, 5), round(st_x(new.ubicacion::geometry)::numeric, 5)),
    new.capturado_en);
  return new;
end $$;

create trigger trg_exceso_velocidad after insert on puntos_gps
  for each row execute function detectar_exceso_velocidad();

-- ---------- Cerrar jornada: km, horas en movimiento y velocidades ----------
-- Se llama al terminar el horario (pg_cron) o cuando el celular apaga el rastreo.
create or replace function cerrar_jornada(p_jornada uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  with p as (
    select capturado_en, ubicacion, velocidad_kmh,
           lag(ubicacion) over (order by capturado_en) as anterior,
           lag(capturado_en) over (order by capturado_en) as t_anterior
    from puntos_gps
    where jornada_id = p_jornada and coalesce(precision_m, 0) <= 50 and not es_simulada
  ),
  tramos as (
    select st_distance(anterior, ubicacion) / 1000.0 as km,
           extract(epoch from capturado_en - t_anterior) / 3600.0 as horas,
           velocidad_kmh
    from p where anterior is not null
  ),
  r as (
    select coalesce(sum(km) filter (where km / nullif(horas, 0) < 150), 0) as km,          -- descarta saltos imposibles
           coalesce(sum(horas) filter (where km / nullif(horas, 0) >= 3 and km / nullif(horas, 0) < 150), 0) as horas_mov,
           max(velocidad_kmh) as vel_max
    from tramos
  )
  update jornadas j set
    km = round(r.km::numeric, 2),
    horas_movimiento = round(r.horas_mov::numeric, 2),
    vel_promedio_kmh = case when r.horas_mov > 0 then round((r.km / r.horas_mov)::numeric, 1) end,
    vel_maxima_kmh = round(r.vel_max::numeric, 1)
  from r where j.id = p_jornada;
end $$;

-- ---------- Indicadores por trabajador y día (para el historial y el comparativo) ----------
create or replace view indicadores_diarios with (security_invoker = true) as
select
  j.empresa_id, j.trabajador_id, j.fecha, j.km, j.vel_promedio_kmh, j.vel_maxima_kmh,
  (select count(*) from excesos_velocidad e where e.jornada_id = j.id) as excesos,
  count(r.id) as reportes_esperados,
  count(r.id) filter (where r.estado = 'a_tiempo') as reportes_enviados,
  round(100.0 * count(r.id) filter (where r.estado = 'a_tiempo') / nullif(count(r.id), 0)) as eficiencia_pct,
  case
    when count(r.id) = 0 then null
    when 100.0 * count(r.id) filter (where r.estado = 'a_tiempo') / count(r.id) >= coalesce(c.eficiencia_verde, 90) then 'verde'
    when 100.0 * count(r.id) filter (where r.estado = 'a_tiempo') / count(r.id) >= coalesce(c.eficiencia_naranja, 70) then 'naranja'
    else 'rojo'
  end as nivel
from jornadas j
left join reportes_actividad r on r.trabajador_id = j.trabajador_id
  and (r.franja_inicio at time zone 'America/Bogota')::date = j.fecha
left join configuracion_empresa c on c.empresa_id = j.empresa_id
group by j.id, c.eficiencia_verde, c.eficiencia_naranja;
