-- 0010 · Cierre de los reportes de actividad al terminar la jornada (validado en el servidor).
-- Antes, validar_reporte_en_su_hora solo revisaba que el reporte llegara dentro de SU hora, pero no
-- que esa hora perteneciera al horario del trabajador: se podía enviar el de 7:00 p. m. aunque la
-- jornada hubiera terminado. Ahora:
--   * Una franja normal tiene que estar dentro del horario que configuró el administrador ese día.
--   * La última franja (p. ej. 4:00 – 5:00 p. m.) se puede enviar hasta el fin del horario + una hora
--     de más (margen_cierre_reporte_min, por defecto 60 → hasta las 6:00 p. m.).
--   * Después del cierre se rechaza cualquier reporte normal ("jornada_finalizada").
--   * Las horas extras siguen igual: se reporta mientras la sesión esté activa (fin is null).
-- Todo con now() del servidor y la fecha/hora de Colombia ('America/Bogota', UTC-5).

alter table configuracion_empresa
  add column if not exists margen_cierre_reporte_min integer not null default 60
  check (margen_cierre_reporte_min between 0 and 120);

-- ---------- Horario de un día según lo que configuró el administrador ----------
-- Prioridad: horario del trabajador > de su grupo > de la empresa. Sin horario ese día: no devuelve filas.
create or replace function horario_del_dia(p_trabajador uuid, p_fecha date)
returns table (inicio timestamptz, fin timestamptz)
language sql stable security definer set search_path = public as $$
  with asignado as (
    select ha.horario_id
    from horario_asignaciones ha
    join perfiles p on p.id = p_trabajador
    where ha.empresa_id = p.empresa_id
      and (ha.trabajador_id = p_trabajador or ha.grupo_id = p.grupo_id or (ha.trabajador_id is null and ha.grupo_id is null))
    order by (ha.trabajador_id is not null) desc, (ha.grupo_id is not null) desc
    limit 1
  )
  select min((p_fecha + hf.hora_inicio) at time zone 'America/Bogota'),
         max((p_fecha + hf.hora_fin) at time zone 'America/Bogota')
  from asignado a
  join horario_franjas hf on hf.horario_id = a.horario_id
  where hf.dia_semana = extract(isodow from p_fecha)
  having count(*) > 0
$$;

create or replace function margen_cierre_reporte(p_empresa uuid) returns interval
language sql stable security definer set search_path = public as $$
  select make_interval(mins => coalesce(
    (select margen_cierre_reporte_min from configuracion_empresa where empresa_id = p_empresa), 60))
$$;

-- ---------- Validación de cada reporte (reemplaza la de 0007) ----------
create or replace function validar_reporte_en_su_hora() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sesion horas_extra;
  v_dia date := (new.franja_inicio at time zone 'America/Bogota')::date;
  v_horario record;
  v_cierre timestamptz;
begin
  if new.estado = 'no_reporto' then
    return new;
  end if;
  if new.franja_fin - new.franja_inicio <> interval '1 hour' then
    raise exception 'franja_invalida';
  end if;

  if new.horas_extra_id is null then
    -- Franja normal: tiene que ser una hora exacta dentro del horario del administrador
    if date_trunc('hour', new.franja_inicio) <> new.franja_inicio then raise exception 'franja_invalida'; end if;
    select * into v_horario from horario_del_dia(new.trabajador_id, v_dia);
    if not found then
      raise exception 'jornada_finalizada: hoy no tienes jornada programada';
    end if;
    if new.franja_inicio < v_horario.inicio or new.franja_fin > v_horario.fin then
      raise exception 'jornada_finalizada: la hora % – % está fuera de tu horario',
        to_char(new.franja_inicio at time zone 'America/Bogota', 'HH24:MI'),
        to_char(new.franja_fin at time zone 'America/Bogota', 'HH24:MI');
    end if;
    -- La última hora tiene la hora de más; las demás cierran al terminar su hora
    v_cierre := case when new.franja_fin = v_horario.fin
                     then v_horario.fin + margen_cierre_reporte(new.empresa_id)
                     else new.franja_fin end;
    if now() >= v_horario.fin + margen_cierre_reporte(new.empresa_id) then
      raise exception 'jornada_finalizada: no se pueden enviar más reportes (cerró a las %)',
        to_char((v_horario.fin + margen_cierre_reporte(new.empresa_id)) at time zone 'America/Bogota', 'HH24:MI');
    end if;
  else
    -- Franja de horas extras: alineada con el inicio de una sesión ACTIVA del mismo trabajador
    select * into v_sesion from horas_extra where id = new.horas_extra_id and trabajador_id = new.trabajador_id and fin is null;
    if not found then raise exception 'sesion_horas_extra_invalida: las horas extras ya terminaron'; end if;
    if extract(epoch from (new.franja_inicio - v_sesion.inicio))::bigint % 3600 <> 0 or new.franja_inicio < v_sesion.inicio then
      raise exception 'franja_invalida';
    end if;
    v_cierre := new.franja_fin;
  end if;

  if now() < new.franja_inicio or now() >= v_cierre then
    raise exception 'fuera_de_horario: la hora % – % ya cerró o aún no empieza',
      to_char(new.franja_inicio at time zone 'America/Bogota', 'HH24:MI'),
      to_char(new.franja_fin at time zone 'America/Bogota', 'HH24:MI');
  end if;

  new.estado := 'a_tiempo';
  new.enviado_en := now();
  new.recibido_en := now();
  return new;
end $$;

-- ---------- "No reportó" según el horario (reemplaza la de 0004) ----------
-- Recorre las horas del horario del administrador (no las de la jornada GPS) y marca las que cerraron.
-- La última hora se marca recién al cierre (fin + hora de más). pg_cron cada minuto (ya programado en 0004).
create or replace function marcar_no_reporto() returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer := 0;
  f record;
  v_hoy date := (now() at time zone 'America/Bogota')::date;
begin
  for f in
    select j.empresa_id, j.trabajador_id, j.id as jornada_id, h as franja_inicio, h + interval '1 hour' as franja_fin
    from jornadas j
    cross join lateral horario_del_dia(j.trabajador_id, v_hoy) hd
    cross join lateral generate_series(hd.inicio, hd.fin - interval '1 hour', interval '1 hour') as h
    where j.fecha = v_hoy
      and now() >= case when h + interval '1 hour' = hd.fin
                        then hd.fin + margen_cierre_reporte(j.empresa_id)
                        else h + interval '1 hour' end
      and not exists (
        select 1 from reportes_actividad r where r.trabajador_id = j.trabajador_id and r.franja_inicio = h
      )
  loop
    insert into reportes_actividad (empresa_id, trabajador_id, jornada_id, franja_inicio, franja_fin, estado, recibido_en)
    values (f.empresa_id, f.trabajador_id, f.jornada_id, f.franja_inicio, f.franja_fin, 'no_reporto', null);

    insert into alertas (empresa_id, trabajador_id, tipo, mensaje)
    values (f.empresa_id, f.trabajador_id, 'no_reporto',
      format('No reportó la hora %s – %s',
        to_char(f.franja_inicio at time zone 'America/Bogota', 'HH24:MI'),
        to_char(f.franja_fin at time zone 'America/Bogota', 'HH24:MI')));
    n := n + 1;
  end loop;
  return n;
end $$;

-- fin_horario_hoy (0007, usada al iniciar horas extras) ahora se apoya en la misma función
create or replace function fin_horario_hoy(p_trabajador uuid) returns timestamptz
language sql stable security definer set search_path = public as $$
  select fin from horario_del_dia(p_trabajador, (now() at time zone 'America/Bogota')::date)
$$;
