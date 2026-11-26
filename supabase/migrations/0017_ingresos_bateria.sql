-- 0017 · Registro de ingresos a la app y batería
--
-- * Cada ingreso con PIN, cada PIN incorrecto, el bloqueo y el aviso de batería baja quedan registrados con la hora
--   oficial, la batería (%), si estaba cargando y la ubicación. Sirve para el control de llegada y como respaldo
--   ante reclamos ("se me descargó el celular").
-- * Llegada tarde: el PRIMER ingreso del día más de N minutos (tolerancia, por defecto 10) después del inicio del
--   horario. Crea una alerta.
-- * Batería: también en cada reporte de actividad, en el estado de salud, en el preoperacional y al iniciar la jornada.
-- * Batería baja: durante el horario, por debajo del nivel configurado (por defecto 20 %) y sin cargar: aviso al
--   trabajador (en el celular) y alerta.
-- * Quién recibe cada alerta lo decide el permiso (web.alertas.llegadaTarde, web.alertas.bateriaBaja), no el
--   nombre del perfil.
-- Todo con la hora del servidor y la fecha/hora de Colombia ('America/Bogota', UTC-5).

alter type tipo_alerta add value if not exists 'llegada_tarde';
alter type tipo_alerta add value if not exists 'bateria_baja';   -- (si ya existía en 0001, no pasa nada)

alter table configuracion_empresa
  add column if not exists tolerancia_llegada_min smallint not null default 10 check (tolerancia_llegada_min between 0 and 60),
  add column if not exists bateria_baja_pct smallint not null default 20 check (bateria_baja_pct between 5 and 50);

-- ---------- Ingresos ----------
create table ingresos_app (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  tipo text not null check (tipo in ('ingreso', 'pin_incorrecto', 'bloqueo', 'bateria_baja')),
  -- Hora oficial del evento: el celular la calcula con la hora del servidor (el PIN se verifica en el celular, así
  -- que puede llegar después si no había señal). Nunca puede ser posterior a la llegada al servidor.
  ocurrido_en timestamptz not null,
  recibido_en timestamptz not null default now(),
  bateria_pct smallint check (bateria_pct between 0 and 100),
  cargando boolean,
  ahorro_energia boolean,
  ubicacion geography(Point, 4326),
  precision_m real,
  ubicacion_simulada boolean not null default false,
  primero_del_dia boolean not null default false,
  minutos_tarde integer   -- solo en el primer ingreso del día, si pasó la tolerancia
);
create index ingresos_trab_fecha on ingresos_app (trabajador_id, ocurrido_en desc);

alter table ingresos_app enable row level security;
create policy ingresos_crear on ingresos_app for insert with check (
  trabajador_id = auth.uid() and empresa_id = mi_empresa() and celular_valido());
create policy ingresos_leer on ingresos_app for select using (
  trabajador_id = auth.uid() or (empresa_id = mi_empresa() and tiene_permiso('web.ingresos.ver')));
-- Sin update ni delete: el registro no se modifica

-- Primer ingreso del día y llegada tarde los calcula el servidor (no se confía en el celular)
create or replace function procesar_ingreso() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_dia date;
  v_horario record;
  v_tol smallint;
  v_nombre text;
begin
  if new.ocurrido_en > now() then new.ocurrido_en := now(); end if;
  new.minutos_tarde := null;
  new.primero_del_dia := false;
  v_dia := (new.ocurrido_en at time zone 'America/Bogota')::date;
  select concat_ws(' ', nombres, apellidos) into v_nombre from perfiles where id = new.trabajador_id;

  if new.tipo = 'ingreso' and not exists (
      select 1 from ingresos_app where trabajador_id = new.trabajador_id and tipo = 'ingreso'
        and (ocurrido_en at time zone 'America/Bogota')::date = v_dia and ocurrido_en < new.ocurrido_en) then
    new.primero_del_dia := true;
    select * into v_horario from horario_del_dia(new.trabajador_id, v_dia);
    if found then
      select coalesce(tolerancia_llegada_min, 10) into v_tol from configuracion_empresa where empresa_id = new.empresa_id;
      if new.ocurrido_en > v_horario.inicio + make_interval(mins => coalesce(v_tol, 10)) then
        new.minutos_tarde := floor(extract(epoch from (new.ocurrido_en - v_horario.inicio)) / 60);
        insert into alertas (empresa_id, trabajador_id, tipo, mensaje, ocurrida_en)
        values (new.empresa_id, new.trabajador_id, 'llegada_tarde',
          format('%s ingresó a la app a las %s (%s después del inicio de su horario)%s', v_nombre,
            to_char(new.ocurrido_en at time zone 'America/Bogota', 'HH24:MI'),
            case when new.minutos_tarde >= 60
                 then (new.minutos_tarde / 60) || ' h' ||
                      case when new.minutos_tarde % 60 > 0 then ' ' || (new.minutos_tarde % 60) || ' min' else '' end
                 else new.minutos_tarde || ' min' end,
            case when new.bateria_pct is not null then format(' · batería %s %%', new.bateria_pct) else '' end),
          new.ocurrido_en);
      end if;
    end if;
  elsif new.tipo = 'bateria_baja' then
    insert into alertas (empresa_id, trabajador_id, tipo, mensaje, ocurrida_en)
    values (new.empresa_id, new.trabajador_id, 'bateria_baja',
      format('El celular de %s quedó con %s %% de batería y no está cargando. Se le avisó para que lo cargue.',
        v_nombre, coalesce(new.bateria_pct::text, '?')),
      new.ocurrido_en);
  end if;
  return new;
end $$;
create trigger trg_procesar_ingreso before insert on ingresos_app for each row execute function procesar_ingreso();

-- ---------- Batería en los demás registros ----------
alter table reportes_actividad
  add column if not exists bateria_pct smallint check (bateria_pct between 0 and 100),
  add column if not exists cargando boolean;
alter table reportes_salud add column if not exists bateria_pct smallint check (bateria_pct between 0 and 100);
alter table preoperacionales add column if not exists bateria_pct smallint check (bateria_pct between 0 and 100);
-- Batería al iniciar la jornada (cuando arranca el GPS por horario)
alter table jornadas
  add column if not exists bateria_inicio_pct smallint check (bateria_inicio_pct between 0 and 100),
  add column if not exists bateria_inicio_en timestamptz;

-- ---------- Resumen por día (historial del trabajador y web) ----------
create or replace view v_ingresos_dia with (security_invoker = true) as
select i.empresa_id, i.trabajador_id, concat_ws(' ', p.nombres, p.apellidos) as trabajador,
       (i.ocurrido_en at time zone 'America/Bogota')::date as fecha,
       min(i.ocurrido_en) filter (where i.tipo = 'ingreso') as primer_ingreso,
       max(i.ocurrido_en) filter (where i.tipo = 'ingreso') as ultimo_ingreso,
       count(*) filter (where i.tipo = 'ingreso') as ingresos,
       count(*) filter (where i.tipo = 'pin_incorrecto') as pin_incorrectos,
       max(i.minutos_tarde) as minutos_tarde,
       (array_agg(i.bateria_pct order by i.ocurrido_en) filter (where i.primero_del_dia))[1] as bateria_primer_ingreso,
       min(i.ocurrido_en) filter (where i.tipo = 'bateria_baja') as aviso_bateria_baja
from ingresos_app i
join perfiles p on p.id = i.trabajador_id
group by i.empresa_id, i.trabajador_id, p.nombres, p.apellidos, (i.ocurrido_en at time zone 'America/Bogota')::date;

-- ---------- Alertas según permiso ----------
-- Los perfiles con el permiso correspondiente ven estas alertas (además de lo que ya ven por su rol)
create policy alertas_por_permiso on alertas for select using (
  empresa_id = mi_empresa() and (
    (tipo = 'llegada_tarde' and tiene_permiso('web.alertas.llegadaTarde'))
    or (tipo = 'bateria_baja' and tiene_permiso('web.alertas.bateriaBaja'))));

-- ---------- Permisos ----------
insert into permisos_catalogo (clave, grupo, descripcion) values
  ('historial.ingresos', 'Historial', 'Ver sus ingresos a la app y la batería de cada día'),
  ('web.ingresos.ver', 'Web: novedades', 'Ver los ingresos a la app y la batería de los trabajadores'),
  ('web.alertas.llegadaTarde', 'Web: alertas', 'Recibir la alerta de llegada tarde'),
  ('web.alertas.bateriaBaja', 'Web: alertas', 'Recibir la alerta de batería baja')
on conflict (clave) do nothing;

insert into permisos_rol (empresa_id, rol, permiso)
select e.id, 'trabajador', 'historial.ingresos' from empresas e on conflict do nothing;
insert into permisos_rol (empresa_id, rol, permiso)
select e.id, r::rol_usuario, c from empresas e,
  unnest(array['admin', 'supervisor', 'sst']) r,
  unnest(array['web.ingresos.ver', 'web.alertas.llegadaTarde', 'web.alertas.bateriaBaja']) c
on conflict do nothing;
