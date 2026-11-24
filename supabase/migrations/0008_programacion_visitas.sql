-- 0008 · Programación de visitas: rutas, obras y zonas que el administrador asigna a sus trabajadores.
-- Cada programación genera una "visita" por trabajador y por día (según su repetición).
-- El GPS marca llegada, salida y permanencia; si termina la jornada sin llegar, queda "no_cumplida".

alter type tipo_alerta add value if not exists 'visita_cumplida';
alter type tipo_alerta add value if not exists 'visita_no_cumplida';

create type tipo_programacion as enum ('ruta', 'obra', 'zona');
create type repeticion_programacion as enum ('no', 'diaria', 'lunes_viernes', 'semanal');
create type estado_programacion as enum ('activa', 'cancelada');
create type estado_visita as enum ('pendiente', 'en_curso', 'cumplida', 'no_cumplida', 'cancelada');

-- ---------- Programaciones ----------
create table programaciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  tipo tipo_programacion not null,
  titulo text not null,
  descripcion text,
  fecha_inicio date not null,                    -- primer día (o el único si no se repite)
  hora_estimada time not null,                   -- hora estimada de llegada (hora Colombia)
  repeticion repeticion_programacion not null default 'no',
  dias_semana smallint[] not null default '{}',  -- 0 = domingo … 6 = sábado (solo semanal)
  repetir_hasta date,
  radio_m integer not null default 100,          -- obra y puntos de ruta
  area geography(Polygon, 4326),                 -- zona
  geocerca_id uuid references geocercas(id) on delete set null, -- si se usó una geocerca existente
  estado estado_programacion not null default 'activa',
  creado_por uuid references perfiles(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (tipo <> 'zona' or area is not null)
);

-- Puntos: 1 para obra, varios en orden para ruta
create table programacion_puntos (
  id uuid primary key default gen_random_uuid(),
  programacion_id uuid not null references programaciones(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  orden smallint not null,
  nombre text not null,
  direccion text,
  ubicacion geography(Point, 4326) not null,
  unique (programacion_id, orden)
);

-- Trabajadores asignados (uno o varios); reasignar = cambiar estas filas
create table programacion_trabajadores (
  programacion_id uuid not null references programaciones(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  primary key (programacion_id, trabajador_id)
);

-- ---------- Visitas (una por día y trabajador) ----------
create table visitas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  programacion_id uuid not null references programaciones(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  fecha date not null,
  hora_estimada time not null,
  estado estado_visita not null default 'pendiente',
  llegada timestamptz,               -- hora del punto GPS que confirmó la llegada
  salida timestamptz,
  permanencia_min integer generated always as (
    case when llegada is not null and salida is not null
      then (extract(epoch from salida - llegada) / 60)::integer end
  ) stored,
  puntos_total smallint,             -- rutas
  puntos_visitados smallint not null default 0,
  fuera_lecturas smallint not null default 0,   -- histéresis de salida
  unique (programacion_id, trabajador_id, fecha)
);
create index visitas_trab_fecha on visitas (trabajador_id, fecha desc);
create index visitas_empresa_fecha on visitas (empresa_id, fecha desc);

-- Llegada y salida de cada punto de una ruta
create table visita_puntos (
  visita_id uuid not null references visitas(id) on delete cascade,
  punto_id uuid not null references programacion_puntos(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  llegada timestamptz,
  salida timestamptz,
  primary key (visita_id, punto_id)
);

-- Notificaciones para el celular del trabajador. Una Edge Function ("enviar-push")
-- escucha esta tabla y las envía con Expo Push (gratis) al token guardado en trabajadores.
alter table trabajadores add column if not exists expo_push_token text;
create table notificaciones_trabajador (
  id bigint generated always as identity primary key,
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  titulo text not null,
  cuerpo text not null,
  datos jsonb,
  creada_en timestamptz not null default now(),
  enviada_en timestamptz
);

-- ---------- Seguridad (RLS) ----------
alter table programaciones enable row level security;
alter table programacion_puntos enable row level security;
alter table programacion_trabajadores enable row level security;
alter table visitas enable row level security;
alter table visita_puntos enable row level security;
alter table notificaciones_trabajador enable row level security;

-- El administrador de la empresa crea, edita, cancela y reasigna
do $$
declare t text;
begin
  foreach t in array array['programaciones', 'programacion_puntos', 'programacion_trabajadores'] loop
    execute format($p$create policy %I on %I for all
      using (mi_rol() = 'superadmin' or (empresa_id = mi_empresa() and mi_rol() = 'admin'))
      with check (mi_rol() = 'superadmin' or (empresa_id = mi_empresa() and mi_rol() = 'admin'))$p$, t || '_admin', t);
  end loop;
end $$;

-- El trabajador ve solo lo que le asignaron; supervisor/admin ven según puede_ver_trabajador
create policy prog_trab_leer on programacion_trabajadores for select using (puede_ver_trabajador(trabajador_id));
create policy programaciones_leer on programaciones for select using (
  exists (select 1 from programacion_trabajadores pt where pt.programacion_id = programaciones.id and puede_ver_trabajador(pt.trabajador_id)));
create policy prog_puntos_leer on programacion_puntos for select using (
  exists (select 1 from programacion_trabajadores pt where pt.programacion_id = programacion_puntos.programacion_id
          and puede_ver_trabajador(pt.trabajador_id)));
create policy visitas_leer on visitas for select using (puede_ver_trabajador(trabajador_id));
create policy visita_puntos_leer on visita_puntos for select using (
  exists (select 1 from visitas v where v.id = visita_id and puede_ver_trabajador(v.trabajador_id)));
create policy notif_leer on notificaciones_trabajador for select using (trabajador_id = auth.uid());
-- Llegada/salida solo las escribe el servidor (trigger con los puntos GPS): el celular no puede marcar "cumplida".

-- ---------- ¿La programación tiene visita ese día? ----------
create or replace function ocurre_en(p programaciones, d date) returns boolean
language sql immutable as $$
  select p.estado = 'activa'
     and d >= p.fecha_inicio
     and (p.repetir_hasta is null or d <= p.repetir_hasta)
     and case p.repeticion
           when 'no' then d = p.fecha_inicio
           when 'diaria' then extract(dow from d) <> 0
           when 'lunes_viernes' then extract(dow from d) between 1 and 5
           when 'semanal' then extract(dow from d)::smallint = any (p.dias_semana)
         end
$$;

-- Crea las visitas del día (pg_cron a las 00:05 y también al guardar una programación):
--   select cron.schedule('generar-visitas', '5 0 * * *', $$select generar_visitas((now() at time zone 'America/Bogota')::date)$$);
create or replace function generar_visitas(d date) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into visitas (empresa_id, programacion_id, trabajador_id, fecha, hora_estimada, puntos_total)
  select p.empresa_id, p.id, pt.trabajador_id, d, p.hora_estimada,
         case when p.tipo = 'ruta' then (select count(*) from programacion_puntos x where x.programacion_id = p.id) end
  from programaciones p
  join programacion_trabajadores pt on pt.programacion_id = p.id
  where ocurre_en(p, d)
  on conflict (programacion_id, trabajador_id, fecha) do update
    set hora_estimada = excluded.hora_estimada, puntos_total = excluded.puntos_total,
        estado = case when visitas.estado = 'cancelada' then 'pendiente' else visitas.estado end;
  get diagnostics n = row_count;

  -- Si se canceló, se quitó un trabajador o cambió la repetición: la visita pendiente de hoy se cancela
  update visitas v set estado = 'cancelada'
  where v.fecha = d and v.estado = 'pendiente'
    and not exists (
      select 1 from programaciones p join programacion_trabajadores pt on pt.programacion_id = p.id
      where p.id = v.programacion_id and pt.trabajador_id = v.trabajador_id and ocurre_en(p, d));
  return n;
end $$;

-- ---------- Aviso con sonido al trabajador cuando le asignan o cambian una visita ----------
create or replace function avisar_programacion() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_prog programaciones;
  v_titulo text;
  -- (los cambios en programacion_puntos se guardan junto con la programación, que dispara el aviso)
begin
  if tg_table_name = 'programacion_trabajadores' then
    select * into v_prog from programaciones where id = coalesce(new.programacion_id, old.programacion_id);
    v_titulo := case when tg_op = 'INSERT' then 'Nueva visita asignada' else 'Te quitaron una visita' end;
    insert into notificaciones_trabajador (empresa_id, trabajador_id, titulo, cuerpo, datos)
    values (v_prog.empresa_id, coalesce(new.trabajador_id, old.trabajador_id), v_titulo,
            format('%s · llegada estimada %s', v_prog.titulo, to_char(v_prog.hora_estimada, 'HH24:MI')),
            jsonb_build_object('tipo', 'visita', 'programacion_id', v_prog.id));
  else
    v_titulo := case when new.estado = 'cancelada' and old.estado = 'activa' then 'Visita cancelada' else 'Cambió una visita' end;
    insert into notificaciones_trabajador (empresa_id, trabajador_id, titulo, cuerpo, datos)
    select new.empresa_id, pt.trabajador_id, v_titulo,
           format('%s · %s', new.titulo, to_char(new.hora_estimada, 'HH24:MI')),
           jsonb_build_object('tipo', 'visita', 'programacion_id', new.id)
    from programacion_trabajadores pt where pt.programacion_id = new.id;
  end if;
  perform generar_visitas((now() at time zone 'America/Bogota')::date);
  return coalesce(new, old);
end $$;

create or replace function marcar_actualizado() returns trigger language plpgsql as $$
begin new.actualizado_en := now(); return new; end $$;

create trigger trg_programacion_actualizado before update on programaciones
  for each row execute function marcar_actualizado();
create trigger trg_programacion_cambio after update on programaciones
  for each row when (old.* is distinct from new.*) execute function avisar_programacion();
create trigger trg_programacion_asignacion after insert or delete on programacion_trabajadores
  for each row execute function avisar_programacion();

-- ---------- Llegada y salida con cada punto GPS ----------
-- Obra: a menos de radio_m del punto. Zona: dentro del área. Ruta: puntos en orden.
-- Para salir hay que alejarse radio + 30 m durante 2 lecturas (evita "temblores" del GPS).
create or replace function procesar_visitas_gps() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v record;
  v_dentro boolean;
  v_lejos boolean;
  v_punto record;
  v_fecha date := (new.capturado_en at time zone 'America/Bogota')::date;
begin
  if coalesce(new.precision_m, 0) > 50 or new.es_simulada then return new; end if;

  for v in
    select vi.*, p.tipo, p.radio_m, p.area, p.titulo
    from visitas vi join programaciones p on p.id = vi.programacion_id
    where vi.trabajador_id = new.trabajador_id and vi.fecha = v_fecha
      and vi.estado in ('pendiente', 'en_curso', 'cumplida') and vi.salida is null
  loop
    if v.tipo = 'ruta' then
      -- siguiente punto sin visitar
      select pp.* into v_punto from programacion_puntos pp
      where pp.programacion_id = v.programacion_id and pp.orden = v.puntos_visitados + 1;
      if found and st_dwithin(new.ubicacion, v_punto.ubicacion, v.radio_m) then
        insert into visita_puntos (visita_id, punto_id, empresa_id, llegada)
        values (v.id, v_punto.id, v.empresa_id, new.capturado_en) on conflict do nothing;
        update visitas set puntos_visitados = puntos_visitados + 1,
               llegada = coalesce(llegada, new.capturado_en),
               estado = case when puntos_visitados + 1 >= puntos_total then 'cumplida' else 'en_curso' end
        where id = v.id;
      end if;
      -- salida del último punto alcanzado
      update visita_puntos vp set salida = new.capturado_en
      from programacion_puntos pp
      where vp.visita_id = v.id and vp.punto_id = pp.id and vp.salida is null and vp.llegada is not null
        and not st_dwithin(new.ubicacion, pp.ubicacion, v.radio_m + 30);
      update visitas set salida = new.capturado_en
      where id = v.id and estado = 'cumplida'
        and not exists (select 1 from visita_puntos where visita_id = v.id and salida is null);
    else
      if v.tipo = 'zona' then
        v_dentro := st_covers(v.area, new.ubicacion);
        v_lejos := not st_dwithin(v.area, new.ubicacion, 30);
      else
        select pp.* into v_punto from programacion_puntos pp where pp.programacion_id = v.programacion_id order by orden limit 1;
        v_dentro := st_dwithin(new.ubicacion, v_punto.ubicacion, v.radio_m);
        v_lejos := not st_dwithin(new.ubicacion, v_punto.ubicacion, v.radio_m + 30);
      end if;

      if v_dentro then
        update visitas set llegada = coalesce(llegada, new.capturado_en), estado = 'cumplida', fuera_lecturas = 0
        where id = v.id;
        if v.llegada is null then
          insert into alertas (empresa_id, trabajador_id, tipo, mensaje, estado, ocurrida_en)
          values (v.empresa_id, v.trabajador_id, 'visita_cumplida',
                  format('Llegó a %s a las %s (estimada %s)', v.titulo,
                         to_char(new.capturado_en at time zone 'America/Bogota', 'HH24:MI'),
                         to_char(v.hora_estimada, 'HH24:MI')),
                  'vista', new.capturado_en);
        end if;
      elsif v.llegada is not null and v_lejos then
        update visitas set fuera_lecturas = fuera_lecturas + 1,
               salida = case when fuera_lecturas + 1 >= 2 then new.capturado_en end
        where id = v.id;
      end if;
    end if;
  end loop;
  return new;
end $$;

create trigger trg_visitas_gps after insert on puntos_gps
  for each row execute function procesar_visitas_gps();

-- ---------- Fin del día: visitas sin llegada = no cumplidas ----------
-- Se llama al cerrar la jornada (pg_cron cada 15 min, junto a cerrar_jornadas_terminadas):
--   select cron.schedule('visitas-no-cumplidas', '*/15 * * * *', 'select marcar_visitas_no_cumplidas()');
create or replace function marcar_visitas_no_cumplidas() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with vencidas as (
    update visitas v set estado = 'no_cumplida'
    where v.estado in ('pendiente', 'en_curso')
      and (v.fecha < (now() at time zone 'America/Bogota')::date
           or exists (select 1 from jornadas j where j.trabajador_id = v.trabajador_id and j.fecha = v.fecha and j.fin is not null))
    returning v.*
  )
  insert into alertas (empresa_id, trabajador_id, tipo, mensaje)
  select x.empresa_id, x.trabajador_id, 'visita_no_cumplida',
         format('No cumplió la visita "%s" del %s', p.titulo, to_char(x.fecha, 'DD/MM'))
  from vencidas x join programaciones p on p.id = x.programacion_id;
  get diagnostics n = row_count;

  -- Salida de quien sigue "en el lugar" al cerrar la jornada
  update visitas v set salida = j.fin
  from jornadas j
  where j.trabajador_id = v.trabajador_id and j.fecha = v.fecha and j.fin is not null
    and v.llegada is not null and v.salida is null;
  return n;
end $$;

-- ---------- Cumplimiento para la web y el historial ----------
create or replace view v_cumplimiento_visitas with (security_invoker = true) as
select v.empresa_id, v.trabajador_id, v.fecha,
       count(*) filter (where v.estado <> 'cancelada') as programadas,
       count(*) filter (where v.estado = 'cumplida') as cumplidas,
       count(*) filter (where v.estado = 'no_cumplida') as no_cumplidas,
       round(avg(v.permanencia_min)) as permanencia_promedio_min
from visitas v
group by v.empresa_id, v.trabajador_id, v.fecha;
