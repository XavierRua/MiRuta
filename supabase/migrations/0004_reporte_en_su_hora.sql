-- =============================================================
-- MiRuta · Reporte solo dentro de su hora (hora del servidor) y estado "No reportó"
-- Requiere 0001, 0002 y 0003.
-- =============================================================

-- "no_enviado" pasa a llamarse "no_reporto" (las filas existentes se actualizan solas)
alter type estado_reporte rename value 'no_enviado' to 'no_reporto';
alter type tipo_alerta rename value 'reporte_no_enviado' to 'no_reporto';
-- "tarde" ya no se usa: un reporte fuera de su hora se rechaza.

-- ---------- Validación con la hora del SERVIDOR ----------
-- Se ignora la hora que mande el celular: la base de datos usa now().
-- El reporte de 9:00 solo se acepta entre 9:00:00 y 9:59:59 (hora de Colombia).
create or replace function validar_reporte_en_su_hora() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'no_reporto' then
    return new; -- lo crea el propio servidor
  end if;
  if now() < new.franja_inicio or now() >= new.franja_fin then
    raise exception 'fuera_de_horario: la hora % – % ya cerró o aún no empieza',
      to_char(new.franja_inicio at time zone 'America/Bogota', 'HH24:MI'),
      to_char(new.franja_fin at time zone 'America/Bogota', 'HH24:MI');
  end if;
  if new.franja_fin - new.franja_inicio <> interval '1 hour' or date_trunc('hour', new.franja_inicio) <> new.franja_inicio then
    raise exception 'franja_invalida';
  end if;
  new.estado := 'a_tiempo';
  new.enviado_en := now();   -- se guarda la hora del servidor, no la del celular
  new.recibido_en := now();
  return new;
end $$;

create trigger trg_validar_reporte before insert on reportes_actividad
  for each row execute function validar_reporte_en_su_hora();

-- Nadie puede editar un reporte después de enviado (evita cambiar la hora a mano)
create policy reportes_sin_edicion on reportes_actividad as restrictive for update using (false);

-- ---------- Alerta al recibir (texto actualizado) ----------
create or replace function avisar_reporte_recibido() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'a_tiempo' then
    insert into alertas (empresa_id, trabajador_id, tipo, mensaje, estado)
    values (new.empresa_id, new.trabajador_id, 'reporte_recibido',
      format('Envió su reporte de %s – %s',
        to_char(new.franja_inicio at time zone 'America/Bogota', 'HH24:MI'),
        to_char(new.franja_fin at time zone 'America/Bogota', 'HH24:MI')),
      'vista');
  end if;
  return new;
end $$;

-- ---------- "No reportó": apenas cierra cada hora ----------
-- Reemplaza marcar_reportes_no_enviados. Programar con pg_cron cada minuto:
--   select cron.unschedule('reportes-no-enviados');
--   select cron.schedule('no-reporto', '* * * * *', 'select marcar_no_reporto()');
drop function if exists marcar_reportes_no_enviados(interval);
create or replace function marcar_no_reporto() returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer := 0;
  f record;
begin
  for f in
    select j.empresa_id, j.trabajador_id, j.id as jornada_id, h as franja_inicio, h + interval '1 hour' as franja_fin
    from jornadas j
    cross join lateral generate_series(
      date_trunc('hour', j.inicio), coalesce(j.fin, now()) - interval '1 hour', interval '1 hour'
    ) as h
    where j.fecha = (now() at time zone 'America/Bogota')::date
      and h + interval '1 hour' <= now()           -- la hora ya cerró (sin margen)
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

-- Hora oficial para la app (alternativa al encabezado HTTP "Date")
create or replace function hora_servidor() returns timestamptz language sql stable as $$ select now() $$;
