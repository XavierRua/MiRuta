-- =============================================================
-- MiRuta · Al cerrar la jornada se guardan: eficiencia del día, velocidad promedio y velocidad máxima
-- Requiere 0001 a 0005.
-- =============================================================

alter table jornadas
  add column if not exists reportes_esperados integer,
  add column if not exists reportes_enviados integer,
  add column if not exists eficiencia_pct integer,
  add column if not exists cerrada_en timestamptz;

-- Cierra una jornada: km y velocidades (cerrar_jornada de 0005) + eficiencia de reportes
create or replace function cerrar_jornada_completa(p_jornada uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform marcar_no_reporto();     -- primero, las horas sin reporte quedan como "No reportó"
  perform cerrar_jornada(p_jornada);

  update jornadas j set
    reportes_esperados = r.esperados,
    reportes_enviados = r.enviados,
    eficiencia_pct = case when r.esperados > 0 then round(100.0 * r.enviados / r.esperados) end,
    cerrada_en = now()
  from (
    select count(*) as esperados, count(*) filter (where estado = 'a_tiempo') as enviados
    from reportes_actividad ra
    join jornadas jj on jj.id = p_jornada
    where ra.trabajador_id = jj.trabajador_id
      and (ra.franja_inicio at time zone 'America/Bogota')::date = jj.fecha
  ) r
  where j.id = p_jornada;
end $$;

-- Cierra todas las jornadas cuyo horario ya terminó. Programar con pg_cron cada 15 minutos:
--   select cron.schedule('cerrar-jornadas', '*/15 * * * *', 'select cerrar_jornadas_terminadas()');
create or replace function cerrar_jornadas_terminadas() returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer := 0;
  j record;
begin
  for j in select id from jornadas where cerrada_en is null and fin is not null and fin < now() loop
    perform cerrar_jornada_completa(j.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- La vista de indicadores usa los valores guardados cuando la jornada ya cerró
drop view if exists indicadores_diarios;
create view indicadores_diarios with (security_invoker = true) as
select
  j.empresa_id, j.trabajador_id, j.fecha, j.km, j.vel_promedio_kmh, j.vel_maxima_kmh,
  (select count(*) from excesos_velocidad e where e.jornada_id = j.id) as excesos,
  coalesce(j.reportes_esperados, count(r.id)) as reportes_esperados,
  coalesce(j.reportes_enviados, count(r.id) filter (where r.estado = 'a_tiempo')) as reportes_enviados,
  coalesce(j.eficiencia_pct, round(100.0 * count(r.id) filter (where r.estado = 'a_tiempo') / nullif(count(r.id), 0))) as eficiencia_pct,
  j.cerrada_en is not null as cerrada
from jornadas j
left join reportes_actividad r on r.trabajador_id = j.trabajador_id
  and (r.franja_inicio at time zone 'America/Bogota')::date = j.fecha
group by j.id;
