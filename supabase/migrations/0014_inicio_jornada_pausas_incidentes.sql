-- 0014 · Inicio de jornada obligatorio, pausas, incidentes, apagado manual del GPS, horas excluidas y ausentismo
--
-- * Al abrir la app: reporte de estado de salud y preoperacional del vehículo (con pico y placa). Hasta
--   diligenciarlos no ve tareas ni visitas, pero el GPS se activa igual a la hora de inicio del horario.
-- * Si a los N minutos del inicio no los ha diligenciado: alerta al administrador, supervisor y SST.
-- * Salud "no apto", preoperacional con fallas e incidentes: alerta con sonido a administrador, supervisor y SST.
-- * Pausas con duración configurada (se cierran solas) y recordatorios de pausa activa.
-- * Apagado manual del GPS (administrador, supervisor, SST) con comentario obligatorio: cierra la jornada.
-- * Horas de reporte excluidas (capacitaciones): no se piden ni cuentan para la eficiencia.
-- * Vista de ausentismo por trabajador y período.
-- "Supervisor" = Jefe de servicio técnico (rol jefe_servicio cuando se definan los perfiles de la web).

alter type tipo_alerta add value if not exists 'salud_no_apto';
alter type tipo_alerta add value if not exists 'salud_alerta';
alter type tipo_alerta add value if not exists 'formularios_pendientes';
alter type tipo_alerta add value if not exists 'preoperacional_falla';
alter type tipo_alerta add value if not exists 'pico_placa';
alter type tipo_alerta add value if not exists 'incidente';
alter type tipo_alerta add value if not exists 'gps_apagado_manual';

-- ---------- Configuración por empresa (la edita el administrador en la web) ----------
create table preguntas_salud (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  orden smallint not null,
  texto text not null,
  tipo text not null check (tipo in ('si_no', 'opciones', 'texto')),
  opciones text[],
  alerta_si text,                     -- respuesta que genera alerta (p. ej. 'No' en "¿Estás en condiciones…?")
  es_apto boolean not null default false, -- la pregunta fija "¿Estás en condiciones de trabajar?"
  activa boolean not null default true
);

create table items_preoperacional (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  orden smallint not null,
  texto text not null,
  aplica text[] not null default '{moto,carro,camion}',
  automatico text,                    -- 'documentos': se revisa con los documentos del perfil
  activo boolean not null default true
);

create table tipos_pausa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  orden smallint not null default 0,
  texto text not null,
  icono text not null default 'pause',  -- nombre del ícono de la app (Ionicons)
  grupo text not null default 'principal' check (grupo in ('principal', 'otras')),  -- 'otras' = dentro de la tarjeta Otras
  unidad text not null default 'min' check (unidad in ('min', 'h')),  -- cómo se muestra en la web
  minutos smallint not null check (minutos between 1 and 600),  -- hasta 10 h (p. ej. cita médica 5 h = 300)
  es_pausa_activa boolean not null default false,
  activo boolean not null default true
);

alter table configuracion_empresa
  add column if not exists pausa_activa_cada_min integer not null default 120,
  add column if not exists limite_formularios_min integer not null default 30,
  add column if not exists salud_salida_antes_min integer not null default 30;

-- Pico y placa: días de la semana (0 = domingo). El propio lo configura el trabajador en Mi perfil;
-- los de la empresa, el administrador.
alter table vehiculos add column if not exists pico_placa smallint[] not null default '{}';

-- ---------- Registros del trabajador ----------
create table reportes_salud (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  jornada_id uuid references jornadas(id) on delete set null,
  momento text not null check (momento in ('inicio', 'fin')),
  respuestas jsonb not null,          -- { pregunta_id: respuesta }
  no_apto boolean not null default false,
  alerta boolean not null default false,
  enviado_en timestamptz not null default now()
);
create index reportes_salud_trab on reportes_salud (trabajador_id, enviado_en desc);

create table preoperacionales (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  jornada_id uuid references jornadas(id) on delete set null,
  uso text not null check (uso in ('propio', 'empresa', 'ninguno')),
  vehiculo_id uuid references vehiculos(id),
  items jsonb not null default '[]',   -- [{ item_id, texto, estado: bien|mal|na, observacion }]
  fallas text[] not null default '{}',
  enviado_en timestamptz not null default now()
);
create index preoperacionales_trab on preoperacionales (trabajador_id, enviado_en desc);

create table pausas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  tipo_id uuid references tipos_pausa(id),
  texto text not null,
  inicio timestamptz not null default now(),
  fin_previsto timestamptz not null,
  fin timestamptz,
  cerrada_por text check (cerrada_por in ('automatico', 'trabajador'))
);
create index pausas_trab on pausas (trabajador_id, inicio desc);

create table incidentes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  descripcion text not null check (length(descripcion) >= 10),
  fotos text[] not null default '{}',  -- rutas en el bucket privado (mismo tamaño que las fotos de reportes)
  puede_continuar boolean not null,
  ubicacion geography(Point, 4326),
  ocurrido_en timestamptz not null default now(),
  atendido_por uuid references perfiles(id),
  atendido_en timestamptz,
  nota_atencion text
);
create index incidentes_trab on incidentes (trabajador_id, ocurrido_en desc);

create table apagados_gps (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  jornada_id uuid references jornadas(id) on delete set null,
  apagado_por uuid not null references perfiles(id) default auth.uid(),
  apagado_en timestamptz not null default now(),
  motivo text not null check (length(trim(motivo)) >= 15),  -- comentario obligatorio
  origen text check (origen in ('salud', 'incidente', 'otro'))
);
create index apagados_trab on apagados_gps (trabajador_id, apagado_en desc);

create table franjas_excluidas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  desde timestamptz not null,
  hasta timestamptz not null check (hasta > desde),
  motivo text not null,
  creado_por uuid not null references perfiles(id) default auth.uid(),
  creado_en timestamptz not null default now()
);
create index franjas_excluidas_trab on franjas_excluidas (trabajador_id, desde);

-- ---------- Seguridad (RLS) ----------
-- Configuración: la leen todos los de la empresa; la cambia el administrador.
do $$
declare t text;
begin
  foreach t in array array['preguntas_salud', 'items_preoperacional'] loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy %I on %I for select using (mi_rol() = 'superadmin' or empresa_id = mi_empresa())$p$, t || '_leer', t);
    execute format($p$create policy %I on %I for all using (mi_rol() = 'superadmin' or (empresa_id = mi_empresa() and mi_rol() = 'admin')) with check (mi_rol() = 'superadmin' or (empresa_id = mi_empresa() and mi_rol() = 'admin'))$p$, t || '_admin', t);
  end loop;
  -- Registros: el trabajador crea los suyos; los demás los ven según su permiso (tiene_permiso, abajo)
  foreach t in array array['reportes_salud', 'preoperacionales', 'pausas', 'incidentes'] loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy %I on %I for insert with check (trabajador_id = auth.uid() and empresa_id = mi_empresa())$p$, t || '_crear', t);
  end loop;
end $$;

-- ¿El rol del usuario actual tiene encendido este permiso en su empresa? (tabla permisos_rol, 0012)
create or replace function tiene_permiso(p_clave text) returns boolean
language sql stable security definer set search_path = public as $$
  select mi_rol() = 'superadmin' or exists (
    select 1 from permisos_rol where empresa_id = mi_empresa() and rol = mi_rol() and permiso = p_clave and activo)
$$;

-- Pausas: las configura el administrador y los perfiles con el permiso web.pausas.configurar (por defecto SST)
alter table tipos_pausa enable row level security;
create policy tipos_pausa_leer on tipos_pausa for select using (mi_rol() = 'superadmin' or empresa_id = mi_empresa());
create policy tipos_pausa_configurar on tipos_pausa for all
  using (empresa_id = mi_empresa() and tiene_permiso('web.pausas.configurar'))
  with check (empresa_id = mi_empresa() and tiene_permiso('web.pausas.configurar'));

-- Cada cuánto se recuerda la pausa activa (columna de configuracion_empresa, que solo edita el administrador)
create or replace function guardar_pausa_activa_cada(p_minutos integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not tiene_permiso('web.pausas.configurar') then raise exception 'sin_permiso'; end if;
  if p_minutos not between 30 and 480 then raise exception 'valor_invalido'; end if;
  update configuracion_empresa set pausa_activa_cada_min = p_minutos, actualizado_en = now()
  where empresa_id = mi_empresa();
end $$;

-- Ver: el propio trabajador siempre; los demás perfiles de la empresa con el permiso correspondiente.
-- Las respuestas de salud son datos sensibles (Ley 1581): solo con "web.salud.verRespuestas".
create policy reportes_salud_leer on reportes_salud for select using (
  trabajador_id = auth.uid() or (empresa_id = mi_empresa() and tiene_permiso('web.salud.verRespuestas')));
create policy preoperacionales_leer on preoperacionales for select using (
  trabajador_id = auth.uid() or (empresa_id = mi_empresa() and tiene_permiso('web.preoperacional.ver')));
create policy pausas_leer on pausas for select using (
  trabajador_id = auth.uid() or (empresa_id = mi_empresa() and tiene_permiso('web.pausas.ver')));
create policy pausas_cerrar on pausas for update using (trabajador_id = auth.uid() and fin is null);
create policy incidentes_leer on incidentes for select using (
  trabajador_id = auth.uid() or (empresa_id = mi_empresa() and tiene_permiso('web.incidentes.ver')));
create policy incidentes_atender on incidentes for update using (empresa_id = mi_empresa() and tiene_permiso('web.incidentes.ver'));

alter table apagados_gps enable row level security;
create policy apagados_leer on apagados_gps for select using (
  trabajador_id = auth.uid() or (empresa_id = mi_empresa() and tiene_permiso('web.ausentismo.ver')));
-- Sin insert directo: se apaga con la función apagar_gps (valida permiso y comentario)

alter table franjas_excluidas enable row level security;
create policy excluidas_leer on franjas_excluidas for select using (trabajador_id = auth.uid() or empresa_id = mi_empresa());
create policy excluidas_gestionar on franjas_excluidas for all
  using (empresa_id = mi_empresa() and tiene_permiso('web.reportes.excluirHoras'))
  with check (empresa_id = mi_empresa() and tiene_permiso('web.reportes.excluirHoras'));

-- ---------- Alertas con sonido (administrador, supervisor y SST) ----------
create or replace function alertar_jornada() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_nombre text;
begin
  select concat_ws(' ', nombres, apellidos) into v_nombre from perfiles where id = new.trabajador_id;
  if tg_table_name = 'reportes_salud' and (new.no_apto or new.alerta) then
    insert into alertas (empresa_id, trabajador_id, tipo, mensaje)
    values (new.empresa_id, new.trabajador_id,
      case when new.no_apto then 'salud_no_apto'::tipo_alerta else 'salud_alerta' end,
      case when new.no_apto
        then format('%s respondió que NO está en condiciones de trabajar (%s). Comunícate con él.', v_nombre, new.momento)
        else format('%s reportó una novedad de salud (%s). Revísala.', v_nombre, new.momento) end);
  elsif tg_table_name = 'preoperacionales' and cardinality(new.fallas) > 0 then
    insert into alertas (empresa_id, trabajador_id, tipo, mensaje)
    values (new.empresa_id, new.trabajador_id, 'preoperacional_falla',
      format('Preoperacional de %s con fallas en: %s. Revisar antes de salir.', v_nombre, array_to_string(new.fallas, ', ')));
  elsif tg_table_name = 'incidentes' then
    insert into alertas (empresa_id, trabajador_id, tipo, mensaje, ocurrida_en)
    values (new.empresa_id, new.trabajador_id, 'incidente',
      format('%s reportó un incidente: %s · %s', v_nombre, left(new.descripcion, 120),
        case when new.puede_continuar then 'puede continuar' else 'NO puede continuar' end),
      new.ocurrido_en);
  end if;
  return new;
end $$;
create trigger trg_alerta_salud after insert on reportes_salud for each row execute function alertar_jornada();
create trigger trg_alerta_preop after insert on preoperacionales for each row execute function alertar_jornada();
create trigger trg_alerta_incidente after insert on incidentes for each row execute function alertar_jornada();
-- La alerta "con sonido" en la web: el panel escucha la tabla alertas con Supabase Realtime y reproduce un sonido
-- para los tipos salud_no_apto, preoperacional_falla e incidente.

-- ---------- Formularios no diligenciados a tiempo (pg_cron cada 5 minutos) ----------
--   select cron.schedule('formularios-pendientes', '*/5 * * * *', 'select alertar_formularios_pendientes()');
create or replace function alertar_formularios_pendientes() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0; t record; v_hoy date := (now() at time zone 'America/Bogota')::date;
begin
  for t in
    select p.id, p.empresa_id, concat_ws(' ', p.nombres, p.apellidos) as nombre, hd.inicio,
           coalesce(c.limite_formularios_min, 30) as limite
    from perfiles p
    join trabajadores tr on tr.id = p.id
    left join configuracion_empresa c on c.empresa_id = p.empresa_id
    cross join lateral horario_del_dia(p.id, v_hoy) hd
    where p.activo and p.rol = 'trabajador'
      and now() >= hd.inicio + make_interval(mins => coalesce(c.limite_formularios_min, 30))
      and now() < hd.fin
      and (not exists (select 1 from reportes_salud s where s.trabajador_id = p.id and s.momento = 'inicio'
                         and (s.enviado_en at time zone 'America/Bogota')::date = v_hoy)
        or not exists (select 1 from preoperacionales o where o.trabajador_id = p.id
                         and (o.enviado_en at time zone 'America/Bogota')::date = v_hoy))
      and not exists (select 1 from alertas a where a.trabajador_id = p.id and a.tipo = 'formularios_pendientes'
                        and (a.ocurrida_en at time zone 'America/Bogota')::date = v_hoy)
  loop
    insert into alertas (empresa_id, trabajador_id, tipo, mensaje)
    values (t.empresa_id, t.id, 'formularios_pendientes',
      format('A los %s min del inicio, %s no ha diligenciado el estado de salud y/o el preoperacional. El GPS ya está activo.',
        t.limite, t.nombre));
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- Apagado manual del GPS ----------
-- Solo perfiles con el permiso web.gps.apagar; comentario obligatorio. Cierra la jornada, avisa al
-- trabajador (push) y su app detiene los recordatorios de reportes.
create or replace function apagar_gps(p_trabajador uuid, p_motivo text, p_origen text default 'otro')
returns apagados_gps language plpgsql security definer set search_path = public as $$
declare a apagados_gps; v_empresa uuid; v_jornada uuid; v_quien text;
begin
  select empresa_id into v_empresa from perfiles where id = p_trabajador;
  if v_empresa is distinct from mi_empresa() and mi_rol() <> 'superadmin' then raise exception 'sin_permiso'; end if;
  if not tiene_permiso('web.gps.apagar') then raise exception 'sin_permiso'; end if;
  if length(trim(coalesce(p_motivo, ''))) < 15 then raise exception 'comentario_obligatorio'; end if;

  select id into v_jornada from jornadas
  where trabajador_id = p_trabajador and fecha = (now() at time zone 'America/Bogota')::date;
  insert into apagados_gps (empresa_id, trabajador_id, jornada_id, motivo, origen)
  values (v_empresa, p_trabajador, v_jornada, trim(p_motivo), p_origen) returning * into a;

  update jornadas set fin = now() where id = v_jornada and fin is null;   -- se cierra la jornada
  select concat_ws(' ', nombres, apellidos) || ' (' || rol || ')' into v_quien from perfiles where id = auth.uid();
  insert into alertas (empresa_id, trabajador_id, tipo, mensaje, estado)
  values (v_empresa, p_trabajador, 'gps_apagado_manual', format('%s apagó el GPS. Motivo: %s', v_quien, a.motivo), 'vista');
  insert into notificaciones_trabajador (empresa_id, trabajador_id, titulo, cuerpo, datos)
  values (v_empresa, p_trabajador, 'Tu jornada fue cerrada', format('%s apagó tu GPS. Motivo: %s', v_quien, a.motivo),
    jsonb_build_object('tipo', 'gps_apagado', 'apagado_id', a.id));
  return a;
end $$;

-- Los reportes de horas excluidas o posteriores al apagado no se piden: marcar_no_reporto (0010) los omite
create or replace function franja_no_aplica(p_trabajador uuid, p_inicio timestamptz) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from franjas_excluidas e where e.trabajador_id = p_trabajador
                   and p_inicio < e.hasta and p_inicio + interval '1 hour' > e.desde)
      or exists (select 1 from apagados_gps a where a.trabajador_id = p_trabajador
                   and a.apagado_en <= p_inicio
                   and (a.apagado_en at time zone 'America/Bogota')::date = (p_inicio at time zone 'America/Bogota')::date)
$$;

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
      and not franja_no_aplica(j.trabajador_id, h)   -- 0014: horas excluidas o GPS apagado
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

-- ---------- Ausentismo ----------
create or replace view v_ausentismo with (security_invoker = true) as
select s.empresa_id, s.trabajador_id, (s.enviado_en at time zone 'America/Bogota')::date as fecha,
       s.enviado_en as hora, 'Salud: no apto' as novedad, s.respuestas::text as detalle, null::numeric as horas_perdidas
from reportes_salud s where s.no_apto
union all
select i.empresa_id, i.trabajador_id, (i.ocurrido_en at time zone 'America/Bogota')::date, i.ocurrido_en,
       'Incidente: no continúa', i.descripcion, null
from incidentes i where not i.puede_continuar
union all
select a.empresa_id, a.trabajador_id, (a.apagado_en at time zone 'America/Bogota')::date, a.apagado_en,
       'GPS apagado manualmente', a.motivo,
       round((extract(epoch from (select hd.fin from horario_del_dia(a.trabajador_id,
         (a.apagado_en at time zone 'America/Bogota')::date) hd) - a.apagado_en) / 3600)::numeric, 1)
from apagados_gps a;

-- ---------- Permisos (catálogo de 0012) ----------
insert into permisos_catalogo (clave, grupo, descripcion) values
  ('salud.reportar', 'Inicio de jornada', 'Reporte de estado de salud al iniciar y al terminar la jornada'),
  ('preoperacional.diligenciar', 'Inicio de jornada', 'Preoperacional del vehículo al iniciar la jornada'),
  ('perfil.picoPlaca.editar', 'Inicio de jornada', 'Configurar los días de pico y placa de su vehículo'),
  ('pausas.usar', 'Pausas', 'Marcar pausas y descansos (con alarma al terminar)'),
  ('incidentes.reportar', 'Incidentes', 'Reportar incidentes durante la jornada'),
  -- Web (para administrador, supervisor, SST y demás perfiles según se configuren)
  ('web.salud.verRespuestas', 'Web: novedades', 'Ver las respuestas del estado de salud (dato sensible)'),
  ('web.preoperacional.ver', 'Web: novedades', 'Ver los preoperacionales'),
  ('web.pausas.ver', 'Web: novedades', 'Ver las pausas y sus informes'),
  ('web.incidentes.ver', 'Web: novedades', 'Ver y atender incidentes'),
  ('web.gps.apagar', 'Web: novedades', 'Apagar manualmente el GPS de un trabajador (comentario obligatorio)'),
  ('web.ausentismo.ver', 'Web: novedades', 'Ver y descargar informes de ausentismo'),
  ('web.reportes.excluirHoras', 'Web: reportes', 'Excluir horas de reporte (capacitaciones) para no afectar la eficiencia'),
  ('web.configuracion.general', 'Web: configuración', 'Velocidad, eficiencia y geocercas'),
  ('web.formularios.configurar', 'Web: configuración', 'Configurar preguntas de salud y preoperacional'),
  ('web.pausas.configurar', 'Web: configuración', 'Configurar las pausas y descansos del trabajador')
on conflict (clave) do nothing;

-- Valores iniciales: el trabajador usa todo lo suyo; administrador, SST y supervisor ven las novedades
insert into permisos_rol (empresa_id, rol, permiso)
select e.id, 'trabajador', c from empresas e,
  unnest(array['salud.reportar', 'preoperacional.diligenciar', 'perfil.picoPlaca.editar', 'pausas.usar', 'incidentes.reportar']) c
on conflict do nothing;
insert into permisos_rol (empresa_id, rol, permiso)
select e.id, r::rol_usuario, c from empresas e,
  unnest(array['admin', 'sst', 'supervisor']) r,
  unnest(array['web.salud.verRespuestas', 'web.preoperacional.ver', 'web.pausas.ver', 'web.incidentes.ver',
               'web.gps.apagar', 'web.ausentismo.ver', 'web.reportes.excluirHoras']) c
on conflict do nothing;
insert into permisos_rol (empresa_id, rol, permiso)
select e.id, 'admin', c from empresas e,
  unnest(array['web.configuracion.general', 'web.formularios.configurar', 'web.pausas.configurar']) c
on conflict do nothing;
insert into permisos_rol (empresa_id, rol, permiso)
select e.id, 'sst', 'web.pausas.configurar' from empresas e on conflict do nothing;
