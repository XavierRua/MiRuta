-- 0016 · Pausas de descanso, actividades autorizadas y extensión de la ventana de reporte
--
-- * Tiempos por empresa (permiso web.pausas.configurar): duración del desayuno y del almuerzo y cuántas veces por
--   jornada (1 por defecto); la pausa activa es una BOLSA de minutos del día (p. ej. 30) que el trabajador reparte
--   como quiera, con un máximo por pausa (p. ej. 10). Lo que no usa al terminar antes queda en la bolsa.
-- * Actividades autorizadas (capacitación, reunión, cita médica, diligencia…): solo existen cuando un perfil con el
--   permiso web.actividades.autorizar las habilita a un trabajador para una fecha, con tiempo libre o asignado.
--   El trabajador recibe una notificación con sonido.
-- * Durante una pausa o actividad no se acepta el reporte. La pausa NO corre el horario: la ventana en la que cae
--   se extiende exactamente por los minutos de pausa que quedaron dentro de ella. Si una pausa cubre toda la
--   ventana, esa hora no se pide ni cuenta en la eficiencia. Si vence la extensión sin reporte: "No reportó".
-- * Dos registros separados: reportes_actividad (con la nota de la extensión) y pausas (inicio, fin, duración y
--   quién autorizó), con la vista v_informe_pausas para los informes por trabajador y período.
-- Todo con now() del servidor y la fecha/hora de Colombia ('America/Bogota', UTC-5).

-- ---------- Configuración por empresa ----------

-- tipos_pausa (0014) ahora tiene dos clases:
--   'descanso'  → desayuno, almuerzo, pausa activa (el trabajador los inicia; cierre automático)
--   'actividad' → tipos de actividad autorizada (solo se usan con una autorización)
alter table tipos_pausa
  add column if not exists clave text,          -- desayuno, almuerzo, pausa_activa, capacitacion…
  add column if not exists clase text not null default 'descanso' check (clase in ('descanso', 'actividad')),
  -- Desayuno y almuerzo: cuántas veces por jornada (null = sin límite)
  add column if not exists veces_por_jornada smallint check (veces_por_jornada between 1 and 5),
  -- Pausa activa: minutos en total al día; `minutos` es el máximo de cada pausa
  add column if not exists bolsa_min smallint check (bolsa_min between 5 and 240);
alter table tipos_pausa alter column minutos drop not null;  -- las actividades no tienen duración fija
create unique index if not exists tipos_pausa_clave on tipos_pausa (empresa_id, clave) where clave is not null;

-- ---------- Actividades autorizadas ----------
create table actividades_autorizadas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  fecha date not null,
  tipo_id uuid not null references tipos_pausa(id),
  texto text not null,
  modo text not null check (modo in ('libre', 'asignado')),
  minutos smallint check (minutos between 1 and 600),
  nota text check (char_length(nota) <= 120),
  autorizada_por uuid not null references perfiles(id) default auth.uid(),
  creada_en timestamptz not null default now(),
  cancelada_por uuid references perfiles(id),
  cancelada_en timestamptz,
  check ((modo = 'asignado') = (minutos is not null))
);
create index actividades_trab_fecha on actividades_autorizadas (trabajador_id, fecha);

alter table actividades_autorizadas enable row level security;
create policy actividades_leer on actividades_autorizadas for select using (
  trabajador_id = auth.uid()
  or (empresa_id = mi_empresa() and (tiene_permiso('web.actividades.autorizar') or tiene_permiso('web.pausas.ver'))));
create policy actividades_crear on actividades_autorizadas for insert with check (
  empresa_id = mi_empresa() and tiene_permiso('web.actividades.autorizar')
  and fecha >= (now() at time zone 'America/Bogota')::date);   -- no se habilita para días pasados
create policy actividades_cancelar on actividades_autorizadas for update using (
  empresa_id = mi_empresa() and tiene_permiso('web.actividades.autorizar'));

-- Aviso con sonido al trabajador cuando le habilitan una actividad
create or replace function avisar_actividad_autorizada() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_quien text;
begin
  select concat_ws(' ', nombres, apellidos) || ' (' || rol || ')' into v_quien from perfiles where id = new.autorizada_por;
  insert into notificaciones_trabajador (empresa_id, trabajador_id, titulo, cuerpo, datos, tipo)
  values (new.empresa_id, new.trabajador_id, 'Te habilitaron una actividad',
    format('%s · %s · %s · autorizó %s', new.texto, to_char(new.fecha, 'DD/MM'),
      case when new.modo = 'asignado' then new.minutos || ' min' else 'tiempo libre' end, v_quien),
    jsonb_build_object('tipo', 'actividad', 'actividad_id', new.id), 'actividad');
  return new;
end $$;
create trigger trg_avisar_actividad after insert on actividades_autorizadas
  for each row execute function avisar_actividad_autorizada();

-- ---------- Registro de pausas y actividades (tabla pausas de 0014) ----------
alter table pausas
  add column if not exists clase text not null default 'descanso' check (clase in ('descanso', 'actividad')),
  add column if not exists modo text not null default 'asignado' check (modo in ('libre', 'asignado')),
  add column if not exists actividad_id uuid references actividades_autorizadas(id),
  add column if not exists autorizada_por uuid references perfiles(id);
alter table pausas alter column fin_previsto drop not null;   -- tiempo libre: sin fin previsto (cronómetro)
alter table pausas drop constraint if exists pausas_cerrada_por_check;
alter table pausas add constraint pausas_cerrada_por_check
  check (cerrada_por in ('automatico', 'trabajador', 'gps_apagado'));

-- Reglas al iniciar una pausa o actividad (la hora de inicio y el fin previsto los pone el servidor):
--   * una sola a la vez · desayuno y almuerzo: las veces por jornada · pausa activa: hasta agotar la bolsa del día
--   * actividad: debe estar habilitada para HOY, no cancelada y sin usar
create or replace function validar_pausa() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_hoy date := (now() at time zone 'America/Bogota')::date;
  v_tipo tipos_pausa;
  v_aut actividades_autorizadas;
  v_veces integer;
  v_usados numeric;
  v_restante numeric;
begin
  if exists (select 1 from pausas where trabajador_id = new.trabajador_id and fin is null) then
    raise exception 'pausa_en_curso: termina la pausa actual antes de iniciar otra';
  end if;
  new.inicio := now();
  new.fin := null;

  if new.clase = 'actividad' then
    select * into v_aut from actividades_autorizadas
    where id = new.actividad_id and trabajador_id = new.trabajador_id and fecha = v_hoy and cancelada_en is null;
    if not found then raise exception 'actividad_no_autorizada: no tienes esa actividad habilitada para hoy'; end if;
    if exists (select 1 from pausas where actividad_id = v_aut.id) then
      raise exception 'actividad_usada: esta actividad ya la usaste hoy';
    end if;
    new.texto := v_aut.texto;
    new.modo := v_aut.modo;
    new.autorizada_por := v_aut.autorizada_por;
    new.fin_previsto := case when v_aut.modo = 'asignado' then now() + make_interval(mins => v_aut.minutos) end;
  else
    select * into v_tipo from tipos_pausa
    where id = new.tipo_id and empresa_id = new.empresa_id and clase = 'descanso' and activo;
    if not found then raise exception 'pausa_invalida'; end if;
    select count(*), coalesce(sum(extract(epoch from (coalesce(p.fin, least(now(), p.fin_previsto)) - p.inicio)) / 60), 0)
      into v_veces, v_usados
    from pausas p
    where p.trabajador_id = new.trabajador_id and p.tipo_id = v_tipo.id
      and (p.inicio at time zone 'America/Bogota')::date = v_hoy;
    new.texto := v_tipo.texto;
    new.modo := 'asignado';
    if v_tipo.bolsa_min is not null then
      -- Pausa activa: dura lo que quede en la bolsa del día, sin pasar del máximo por pausa
      v_restante := floor(v_tipo.bolsa_min - v_usados);
      if v_restante < 1 then
        raise exception 'bolsa_agotada: ya usaste los % min de % de hoy', v_tipo.bolsa_min, lower(v_tipo.texto);
      end if;
      new.fin_previsto := now() + make_interval(mins => least(v_tipo.minutos, v_restante)::integer);
    else
      if v_tipo.veces_por_jornada is not null and v_veces >= v_tipo.veces_por_jornada then
        raise exception 'pausa_ya_tomada: ya tomaste tu % de hoy', lower(v_tipo.texto);
      end if;
      new.fin_previsto := now() + make_interval(mins => v_tipo.minutos);
    end if;
  end if;
  return new;
end $$;
create trigger trg_validar_pausa before insert on pausas for each row execute function validar_pausa();

-- El trabajador solo puede cerrar su pausa en curso; la hora de fin la pone el servidor
create or replace function cerrar_mi_pausa() returns pausas
language plpgsql security definer set search_path = public as $$
declare p pausas;
begin
  update pausas set fin = case when fin_previsto is not null then least(now(), fin_previsto) else now() end,
                    cerrada_por = 'trabajador'
  where trabajador_id = auth.uid() and fin is null
  returning * into p;
  return p;
end $$;
drop policy if exists pausas_cerrar on pausas;   -- (0014) ya no se cierra con update directo

-- Cierre automático al cumplirse el tiempo (descansos y actividades con tiempo asignado).
-- pg_cron cada minuto: select cron.schedule('cerrar-pausas', '* * * * *', 'select cerrar_pausas_vencidas()');
create or replace function cerrar_pausas_vencidas() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update pausas set fin = fin_previsto, cerrada_por = 'automatico'
  where fin is null and fin_previsto is not null and fin_previsto <= now();
  get diagnostics n = row_count;
  return n;
end $$;

-- Si un perfil autorizado apaga el GPS (0014), la pausa en curso se cierra en ese momento
create or replace function cerrar_pausa_por_apagado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update pausas set fin = new.apagado_en, cerrada_por = 'gps_apagado'
  where trabajador_id = new.trabajador_id and fin is null;
  return new;
end $$;
create trigger trg_pausa_apagado after insert on apagados_gps for each row execute function cerrar_pausa_por_apagado();

-- ---------- Extensión de la ventana de reporte ----------
-- Minutos de pausa (terminadas, en curso hasta su fin previsto o, con tiempo libre, hasta ahora) que caen
-- dentro de la ventana [p_inicio, p_fin)
create or replace function extension_pausas(p_trabajador uuid, p_inicio timestamptz, p_fin timestamptz)
returns interval language sql stable security definer set search_path = public as $$
  select coalesce(sum(least(p_fin, coalesce(pa.fin, pa.fin_previsto, now())) - greatest(p_inicio, pa.inicio)),
                  interval '0')
  from pausas pa
  where pa.trabajador_id = p_trabajador
    and pa.inicio < p_fin and coalesce(pa.fin, pa.fin_previsto, now()) > p_inicio
$$;

-- ¿Toda la ventana estuvo en pausa? (no se pide ni cuenta en la eficiencia)
create or replace function ventana_en_pausa(p_trabajador uuid, p_inicio timestamptz, p_fin timestamptz)
returns boolean language sql stable as $$
  select extension_pausas(p_trabajador, p_inicio, p_fin) >= (p_fin - p_inicio)
$$;

-- "Extendido +15 min por desayuno y +5 min por pausa activa"
create or replace function texto_extension(p_trabajador uuid, p_inicio timestamptz, p_fin timestamptz)
returns text language sql stable security definer set search_path = public as $$
  select 'Extendido ' || string_agg(
           '+' || round(extract(epoch from (least(p_fin, coalesce(pa.fin, pa.fin_previsto, now())) - greatest(p_inicio, pa.inicio))) / 60)
           || ' min por ' || lower(pa.texto), ' y ' order by pa.inicio)
  from pausas pa
  where pa.trabajador_id = p_trabajador
    and pa.inicio < p_fin and coalesce(pa.fin, pa.fin_previsto, now()) > p_inicio
$$;

alter table reportes_actividad
  add column if not exists extension_min smallint not null default 0,
  add column if not exists extension_texto text;
alter type estado_reporte add value if not exists 'en_pausa';

-- Validación del reporte (reemplaza la de 0010): igual que antes, pero
--   * con una pausa en curso no se acepta el reporte
--   * el cierre de la ventana se corre por los minutos de pausa que cayeron dentro de ella
--   * si toda la ventana estuvo en pausa, no se pide
create or replace function validar_reporte_en_su_hora() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sesion horas_extra;
  v_dia date := (new.franja_inicio at time zone 'America/Bogota')::date;
  v_horario record;
  v_cierre timestamptz;
  v_ext interval;
begin
  if new.estado in ('no_reporto', 'en_pausa') then
    return new;
  end if;
  if new.franja_fin - new.franja_inicio <> interval '1 hour' then
    raise exception 'franja_invalida';
  end if;
  if exists (select 1 from pausas where trabajador_id = new.trabajador_id and fin is null
             and coalesce(fin_previsto, now() + interval '1 second') > now()) then
    raise exception 'en_pausa: podrás enviar el reporte cuando termine la pausa';
  end if;

  if new.horas_extra_id is null then
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
  else
    select * into v_sesion from horas_extra where id = new.horas_extra_id and trabajador_id = new.trabajador_id and fin is null;
    if not found then raise exception 'sesion_horas_extra_invalida: las horas extras ya terminaron'; end if;
    if extract(epoch from (new.franja_inicio - v_sesion.inicio))::bigint % 3600 <> 0 or new.franja_inicio < v_sesion.inicio then
      raise exception 'franja_invalida';
    end if;
    v_cierre := new.franja_fin;
  end if;

  if ventana_en_pausa(new.trabajador_id, new.franja_inicio, new.franja_fin) then
    raise exception 'en_pausa: toda esta hora estuviste en pausa, no necesita reporte';
  end if;
  v_ext := extension_pausas(new.trabajador_id, new.franja_inicio, new.franja_fin);
  v_cierre := v_cierre + v_ext;   -- la pausa extiende la ventana en la que cae

  if now() < new.franja_inicio or now() >= v_cierre then
    raise exception 'fuera_de_horario: la hora % – % ya cerró (podía enviarse hasta las %)',
      to_char(new.franja_inicio at time zone 'America/Bogota', 'HH24:MI'),
      to_char(new.franja_fin at time zone 'America/Bogota', 'HH24:MI'),
      to_char(v_cierre at time zone 'America/Bogota', 'HH24:MI');
  end if;

  new.estado := 'a_tiempo';
  new.enviado_en := now();
  new.recibido_en := now();
  new.extension_min := round(extract(epoch from v_ext) / 60);
  new.extension_texto := case when v_ext > interval '0'
                              then texto_extension(new.trabajador_id, new.franja_inicio, new.franja_fin) end;
  return new;
end $$;

-- "No reportó" (reemplaza la de 0014): cada ventana se marca al vencer su cierre extendido;
-- las ventanas cubiertas por una pausa quedan "en_pausa" (no cuentan en la eficiencia: cerrar_jornada_completa
-- solo cuenta 'a_tiempo' y 'no_reporto' desde esta versión, ver abajo)
create or replace function marcar_no_reporto() returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer := 0;
  f record;
  v_hoy date := (now() at time zone 'America/Bogota')::date;
begin
  for f in
    select j.empresa_id, j.trabajador_id, j.id as jornada_id, h as franja_inicio, h + interval '1 hour' as franja_fin,
           (case when h + interval '1 hour' = hd.fin then hd.fin + margen_cierre_reporte(j.empresa_id)
                 else h + interval '1 hour' end)
             + extension_pausas(j.trabajador_id, h, h + interval '1 hour') as cierre
    from jornadas j
    cross join lateral horario_del_dia(j.trabajador_id, v_hoy) hd
    cross join lateral generate_series(hd.inicio, hd.fin - interval '1 hour', interval '1 hour') as h
    where j.fecha = v_hoy
      and not franja_no_aplica(j.trabajador_id, h)   -- 0014: horas excluidas o GPS apagado
      and not exists (select 1 from reportes_actividad r where r.trabajador_id = j.trabajador_id and r.franja_inicio = h)
      -- no hay pausa en curso que todavía pueda extender esta ventana
      and not exists (select 1 from pausas p where p.trabajador_id = j.trabajador_id and p.fin is null
                        and p.inicio < h + interval '1 hour')
  loop
    if ventana_en_pausa(f.trabajador_id, f.franja_inicio, f.franja_fin) then
      if now() >= f.franja_fin then
        insert into reportes_actividad (empresa_id, trabajador_id, jornada_id, franja_inicio, franja_fin, estado, recibido_en)
        values (f.empresa_id, f.trabajador_id, f.jornada_id, f.franja_inicio, f.franja_fin, 'en_pausa', null);
      end if;
      continue;
    end if;
    if now() < f.cierre then continue; end if;
    insert into reportes_actividad (empresa_id, trabajador_id, jornada_id, franja_inicio, franja_fin, estado, recibido_en,
                                    extension_min, extension_texto)
    values (f.empresa_id, f.trabajador_id, f.jornada_id, f.franja_inicio, f.franja_fin, 'no_reporto', null,
            round(extract(epoch from extension_pausas(f.trabajador_id, f.franja_inicio, f.franja_fin)) / 60),
            texto_extension(f.trabajador_id, f.franja_inicio, f.franja_fin));
    insert into alertas (empresa_id, trabajador_id, tipo, mensaje)
    values (f.empresa_id, f.trabajador_id, 'no_reporto',
      format('No reportó la hora %s – %s',
        to_char(f.franja_inicio at time zone 'America/Bogota', 'HH24:MI'),
        to_char(f.franja_fin at time zone 'America/Bogota', 'HH24:MI')));
    n := n + 1;
  end loop;
  return n;
end $$;

-- Eficiencia del día sin las horas "en pausa" (reemplaza el cálculo de 0006)
create or replace function cerrar_jornada_completa(p_jornada uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform cerrar_pausas_vencidas();
  perform marcar_no_reporto();
  perform cerrar_jornada(p_jornada);

  update jornadas j set
    reportes_esperados = r.esperados,
    reportes_enviados = r.enviados,
    eficiencia_pct = case when r.esperados > 0 then round(100.0 * r.enviados / r.esperados) end,
    cerrada_en = now()
  from (
    select count(*) filter (where estado <> 'en_pausa') as esperados,
           count(*) filter (where estado = 'a_tiempo') as enviados
    from reportes_actividad ra
    join jornadas jj on jj.id = p_jornada
    where ra.trabajador_id = jj.trabajador_id
      and (ra.franja_inicio at time zone 'America/Bogota')::date = jj.fecha
  ) r
  where j.id = p_jornada;
end $$;

-- ---------- Informe de pausas y actividades (por trabajador y período, para Excel/PDF en la web) ----------
create or replace view v_informe_pausas with (security_invoker = true) as
select p.empresa_id, p.trabajador_id, concat_ws(' ', pe.nombres, pe.apellidos) as trabajador,
       (p.inicio at time zone 'America/Bogota')::date as fecha,
       p.clase, p.texto as tipo, p.modo,
       p.inicio, p.fin,
       round(extract(epoch from (coalesce(p.fin, now()) - p.inicio)) / 60)::integer as minutos,
       case when p.clase = 'descanso' then t.minutos
            when p.modo = 'asignado' then a.minutos end as minutos_configurados,
       p.cerrada_por,
       concat_ws(' ', au.nombres, au.apellidos) as autorizada_por
from pausas p
join perfiles pe on pe.id = p.trabajador_id
left join tipos_pausa t on t.id = p.tipo_id
left join actividades_autorizadas a on a.id = p.actividad_id
left join perfiles au on au.id = p.autorizada_por;

-- Resumen del período: tiempo de descanso y quién excede el almuerzo (total del día > tiempo configurado)
--   select * from resumen_pausas('2026-11-01', '2026-11-30');
create or replace function resumen_pausas(p_desde date, p_hasta date)
returns table (trabajador_id uuid, trabajador text, descanso_min bigint, almuerzo_promedio_min numeric,
               dias_almuerzo_excedido bigint, minutos_excedidos bigint, pausas_activas bigint, actividades_min bigint)
language sql stable as $$
  with dia as (
    select trabajador_id, trabajador, fecha, clase, tipo, sum(minutos) as minutos, max(minutos_configurados) as conf,
           count(*) as veces
    from v_informe_pausas
    where fecha between p_desde and p_hasta
    group by trabajador_id, trabajador, fecha, clase, tipo
  )
  select trabajador_id, trabajador,
         sum(minutos) filter (where clase = 'descanso'),
         round(avg(minutos) filter (where tipo ilike 'almuerzo')),
         count(*) filter (where tipo ilike 'almuerzo' and minutos > conf),
         coalesce(sum(minutos - conf) filter (where tipo ilike 'almuerzo' and minutos > conf), 0),
         coalesce(sum(veces) filter (where tipo ilike 'pausa activa'), 0),
         coalesce(sum(minutos) filter (where clase = 'actividad'), 0)
  from dia
  group by trabajador_id, trabajador
$$;

-- ---------- Permisos ----------
insert into permisos_catalogo (clave, grupo, descripcion) values
  ('actividades.usar', 'Pausas', 'Iniciar las actividades autorizadas que le habiliten'),
  ('web.actividades.autorizar', 'Web: pausas', 'Habilitar actividades autorizadas a un trabajador para una fecha')
on conflict (clave) do nothing;
update permisos_catalogo set descripcion = 'Configurar los tiempos de las pausas (desayuno, almuerzo y bolsa de pausa activa)'
where clave = 'web.pausas.configurar';

insert into permisos_rol (empresa_id, rol, permiso)
select e.id, 'trabajador', 'actividades.usar' from empresas e on conflict do nothing;
insert into permisos_rol (empresa_id, rol, permiso)
select e.id, r::rol_usuario, 'web.actividades.autorizar' from empresas e, unnest(array['admin', 'supervisor', 'sst']) r
on conflict do nothing;
