-- 0013 · A pie, en vehículo o quieto
-- La app detecta el modo con los pasos del podómetro y la velocidad del GPS (con un tiempo de confirmación
-- para evitar cambios falsos, p. ej. un semáforo) y lo envía con cada punto GPS. El servidor guarda:
--   * por jornada: km y minutos a pie, en vehículo y quieto;
--   * por cada periodo dentro de una geocerca de visita: minutos a pie / en vehículo / quieto y cómo entró y salió.

create type modo_desplazamiento as enum ('a_pie', 'vehiculo', 'quieto');

alter table puntos_gps
  add column if not exists modo modo_desplazamiento,
  add column if not exists pasos_min smallint;          -- cadencia del podómetro (pasos por minuto)

alter table jornadas
  add column if not exists km_pie numeric(8,2) not null default 0,
  add column if not exists min_pie integer not null default 0,
  add column if not exists km_vehiculo numeric(8,2) not null default 0,
  add column if not exists min_vehiculo integer not null default 0,
  add column if not exists min_quieto integer not null default 0;

alter table visita_periodos
  add column if not exists modo_entrada modo_desplazamiento,
  add column if not exists modo_salida modo_desplazamiento,
  add column if not exists min_pie numeric(7,1) not null default 0,
  add column if not exists min_vehiculo numeric(7,1) not null default 0,
  add column if not exists min_quieto numeric(7,1) not null default 0;

alter table visitas add column if not exists fuera_modo modo_desplazamiento;

-- Tipo de vehículo para el ícono del mapa (moto o carro): ya existe vehiculos.tipo (0001).

-- ---------- Tiempo dentro de cada geocerca por modo (con cada punto GPS) ----------
create or replace function sumar_tiempo_geocerca() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_prev timestamptz; v_min numeric;
begin
  if new.modo is null then return new; end if;
  select max(capturado_en) into v_prev from puntos_gps
  where trabajador_id = new.trabajador_id and capturado_en < new.capturado_en
    and capturado_en > new.capturado_en - interval '2 minutes';
  if v_prev is null then return new; end if;
  v_min := extract(epoch from new.capturado_en - v_prev) / 60;

  update visita_periodos vp set
    min_pie = vp.min_pie + case when new.modo = 'a_pie' then v_min else 0 end,
    min_vehiculo = vp.min_vehiculo + case when new.modo = 'vehiculo' then v_min else 0 end,
    min_quieto = vp.min_quieto + case when new.modo = 'quieto' then v_min else 0 end,
    modo_entrada = coalesce(vp.modo_entrada, new.modo)
  from visitas v
  where vp.visita_id = v.id and vp.salida is null and v.fuera_desde is null
    and vp.trabajador_id = new.trabajador_id;

  -- Cómo salió: el modo del punto en que salió (se confirma luego con la tolerancia, ver 0009)
  update visitas set fuera_modo = new.modo
  where trabajador_id = new.trabajador_id and fuera_desde = new.capturado_en;
  return new;
end $$;

-- Corre después de procesar_visitas_gps (los disparadores se ejecutan en orden alfabético)
create trigger trg_visitas_gps_tiempo_modo after insert on puntos_gps
  for each row execute function sumar_tiempo_geocerca();

-- Al confirmar una salida se copia cómo salió (a pie / en vehículo)
create or replace function copiar_modo_salida() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.salida is not null and old.salida is null then
    new.modo_salida := (select fuera_modo from visitas where id = new.visita_id);
  end if;
  return new;
end $$;
create trigger trg_modo_salida before update on visita_periodos
  for each row execute function copiar_modo_salida();

-- ---------- Resumen por jornada (al cerrar la jornada, junto a cerrar_jornada de 0005) ----------
create or replace function resumir_desplazamiento(p_jornada uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  with p as (
    select modo, ubicacion, capturado_en,
           lag(ubicacion) over w as ant, lag(capturado_en) over w as t_ant
    from puntos_gps where jornada_id = p_jornada and modo is not null
    window w as (order by capturado_en)
  ), tramos as (
    select modo,
           coalesce(st_distance(ubicacion, ant), 0) / 1000 as km,
           least(extract(epoch from capturado_en - t_ant), 120) / 60 as min
    from p where ant is not null
  )
  update jornadas set
    km_pie = coalesce((select sum(km) from tramos where modo = 'a_pie'), 0),
    min_pie = coalesce((select round(sum(min)) from tramos where modo = 'a_pie'), 0),
    km_vehiculo = coalesce((select sum(km) from tramos where modo = 'vehiculo'), 0),
    min_vehiculo = coalesce((select round(sum(min)) from tramos where modo = 'vehiculo'), 0),
    min_quieto = coalesce((select round(sum(min)) from tramos where modo = 'quieto'), 0)
  where id = p_jornada;
end $$;

-- ---------- Permiso independiente ----------
insert into permisos_catalogo (clave, grupo, descripcion) values
  ('desplazamiento.ver', 'Desplazamiento', 'Ver si se desplaza a pie, en vehículo o está quieto (mapa, km y tiempos)')
on conflict (clave) do nothing;
insert into permisos_rol (empresa_id, rol, permiso)
select e.id, r.rol::rol_usuario, 'desplazamiento.ver'
from empresas e cross join (values ('trabajador'), ('admin')) r(rol)
on conflict do nothing;
