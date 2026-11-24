-- =============================================================
-- MiRuta · Esquema inicial (Supabase / Postgres + PostGIS)
-- Multiempresa: cada fila lleva empresa_id y se protege con RLS.
-- =============================================================

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ---------- Tipos ----------
create type rol_usuario as enum ('superadmin', 'admin', 'supervisor', 'trabajador');
create type tipo_vehiculo as enum ('moto', 'carro', 'camioneta', 'camion', 'otro');
create type propietario_vehiculo as enum ('empresa', 'trabajador');
create type tipo_documento_vehiculo as enum ('soat', 'tecnomecanica', 'tarjeta_propiedad', 'licencia_conduccion', 'otro');
create type tipo_geocerca as enum ('zona_permitida', 'punto_visita');
create type tipo_evento_geocerca as enum ('entrada', 'salida');
create type tipo_alerta as enum (
  'salida_geocerca', 'telefono_apagado_usuario', 'telefono_apagado_bateria',
  'telefono_reiniciado', 'sin_reporte', 'rastreo_no_iniciado', 'gps_desactivado',
  'bateria_baja', 'detenido', 'exceso_velocidad', 'ubicacion_falsa', 'documento_por_vencer'
);
create type estado_alerta as enum ('abierta', 'vista', 'cerrada');

-- ---------- Empresas y usuarios ----------
create table empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nit text,
  codigo_acceso text unique not null,          -- código que usa el trabajador al iniciar sesión
  zona_horaria text not null default 'America/Bogota',
  activa boolean not null default true,
  creada_en timestamptz not null default now()
);

create table grupos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nombre text not null
);

-- Un perfil por cada usuario de Supabase Auth
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid references empresas(id) on delete cascade,  -- null solo para superadmin
  rol rol_usuario not null,
  grupo_id uuid references grupos(id) on delete set null,     -- grupo que supervisa o al que pertenece
  nombres text not null,
  apellidos text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table trabajadores (
  id uuid primary key references perfiles(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  cedula text not null,
  telefono text,
  correo text,
  direccion text,
  foto_url text,
  cargo text,
  contacto_emergencia_nombre text,
  contacto_emergencia_telefono text,
  eps text,
  arl text,
  tipo_sangre text,
  licencia_categoria text,
  licencia_vencimiento date,
  fecha_ingreso date,
  unique (empresa_id, cedula)
);

-- ---------- Vehículos ----------
create table vehiculos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  placa text not null,
  tipo tipo_vehiculo not null default 'moto',
  marca text, modelo text, linea text, color text,
  cilindraje integer,
  propietario propietario_vehiculo not null default 'empresa',
  fotos text[] not null default '{}',
  activo boolean not null default true,
  unique (empresa_id, placa)
);

create table documentos_vehiculo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  vehiculo_id uuid not null references vehiculos(id) on delete cascade,
  tipo tipo_documento_vehiculo not null,
  numero text,
  fecha_vencimiento date,
  archivo_url text
);

create table asignaciones_vehiculo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  vehiculo_id uuid not null references vehiculos(id) on delete cascade,
  desde date not null default current_date,
  hasta date
);

-- ---------- Horarios (rastreo automático) ----------
create table horarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nombre text not null,                 -- p. ej. "Turno diurno"
  aplica_festivos boolean not null default false
);

create table horario_franjas (
  id uuid primary key default gen_random_uuid(),
  horario_id uuid not null references horarios(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 1 and 7),  -- 1 = lunes
  hora_inicio time not null,
  hora_fin time not null
);

-- Asignación del horario: a la empresa, a un grupo o a un trabajador (el más específico gana)
create table horario_asignaciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  horario_id uuid not null references horarios(id) on delete cascade,
  grupo_id uuid references grupos(id) on delete cascade,
  trabajador_id uuid references trabajadores(id) on delete cascade
);

create table festivos (
  fecha date primary key,
  nombre text not null
);

-- Horas extra autorizadas por la empresa
create table extensiones_jornada (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  inicio timestamptz not null,
  fin timestamptz not null,
  autorizado_por uuid references perfiles(id),
  motivo text
);

-- ---------- Jornadas, puntos y recorridos ----------
create table jornadas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  vehiculo_id uuid references vehiculos(id),
  fecha date not null,
  inicio timestamptz,
  fin timestamptz,
  km numeric(8,2) not null default 0,
  ruta_simplificada geography(LineString, 4326),   -- se guarda al cerrar la jornada
  unique (trabajador_id, fecha)
);

-- Puntos crudos: se conservan ~7 días y luego se borran (ver función limpiar_puntos_viejos)
create table puntos_gps (
  id bigint generated always as identity primary key,
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  jornada_id uuid references jornadas(id) on delete cascade,
  capturado_en timestamptz not null,               -- hora del celular
  recibido_en timestamptz not null default now(),  -- hora del servidor
  ubicacion geography(Point, 4326) not null,
  precision_m real,
  velocidad_kmh real,
  rumbo real,
  bateria smallint,
  es_simulada boolean not null default false        -- "mock location" detectada
);
create index puntos_gps_trab_fecha on puntos_gps (trabajador_id, capturado_en desc);
create index puntos_gps_ubicacion on puntos_gps using gist (ubicacion);

-- Última posición de cada trabajador (para el mapa en vivo)
create table ultima_posicion (
  trabajador_id uuid primary key references trabajadores(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  capturado_en timestamptz not null,
  ubicacion geography(Point, 4326) not null,
  velocidad_kmh real,
  bateria smallint
);

-- Eventos del dispositivo: apagado, encendido, GPS desactivado, etc.
create table eventos_dispositivo (
  id bigint generated always as identity primary key,
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  tipo text not null,           -- 'apagado', 'encendido', 'gps_off', 'gps_on', 'modo_avion', 'rastreo_iniciado', 'rastreo_detenido'
  ocurrido_en timestamptz not null,
  bateria smallint,
  detalle jsonb
);

-- ---------- Geocercas ----------
create table geocercas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nombre text not null,
  tipo tipo_geocerca not null default 'punto_visita',
  area geography(Polygon, 4326) not null,   -- los círculos se guardan como polígono
  margen_m integer not null default 40,     -- histéresis contra el "temblor" del GPS
  activa boolean not null default true
);
create index geocercas_area on geocercas using gist (area);

create table geocerca_asignaciones (
  geocerca_id uuid not null references geocercas(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  grupo_id uuid references grupos(id) on delete cascade,
  trabajador_id uuid references trabajadores(id) on delete cascade
);

create table eventos_geocerca (
  id bigint generated always as identity primary key,
  empresa_id uuid not null references empresas(id) on delete cascade,
  geocerca_id uuid not null references geocercas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  tipo tipo_evento_geocerca not null,
  ocurrido_en timestamptz not null      -- hora del punto GPS que confirmó el cambio
);
create index eventos_geocerca_trab on eventos_geocerca (trabajador_id, ocurrido_en desc);

-- ---------- Alertas ----------
create table alertas (
  id bigint generated always as identity primary key,
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid references trabajadores(id) on delete cascade,
  vehiculo_id uuid references vehiculos(id) on delete cascade,
  tipo tipo_alerta not null,
  mensaje text not null,
  ocurrida_en timestamptz not null default now(),
  estado estado_alerta not null default 'abierta',
  atendida_por uuid references perfiles(id)
);
create index alertas_empresa_estado on alertas (empresa_id, estado, ocurrida_en desc);

-- ---------- Consentimiento (Ley 1581 de 2012) ----------
create table autorizaciones_texto (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  version text not null,
  contenido text not null,
  vigente_desde timestamptz not null default now()
);

create table consentimientos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  autorizacion_id uuid not null references autorizaciones_texto(id),
  aceptado_en timestamptz not null default now(),
  dispositivo text
);

-- Registro de quién consultó historiales
create table auditoria_consultas (
  id bigint generated always as identity primary key,
  empresa_id uuid not null references empresas(id) on delete cascade,
  usuario_id uuid not null references perfiles(id),
  trabajador_id uuid references trabajadores(id),
  accion text not null,
  ocurrida_en timestamptz not null default now()
);

-- =============================================================
-- Funciones auxiliares para RLS
-- =============================================================
create or replace function mi_empresa() returns uuid
language sql stable security definer set search_path = public as $$
  select empresa_id from perfiles where id = auth.uid()
$$;

create or replace function mi_rol() returns rol_usuario
language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid()
$$;

create or replace function mi_grupo() returns uuid
language sql stable security definer set search_path = public as $$
  select grupo_id from perfiles where id = auth.uid()
$$;

-- ¿Puede el usuario actual ver los datos de este trabajador?
create or replace function puede_ver_trabajador(t_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case mi_rol()
    when 'superadmin' then true
    when 'admin' then exists (select 1 from perfiles p where p.id = t_id and p.empresa_id = mi_empresa())
    when 'supervisor' then exists (select 1 from perfiles p where p.id = t_id and p.empresa_id = mi_empresa() and p.grupo_id = mi_grupo())
    when 'trabajador' then t_id = auth.uid()
  end
$$;

-- =============================================================
-- Row Level Security
-- =============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'grupos','vehiculos','documentos_vehiculo','asignaciones_vehiculo','horarios',
    'horario_asignaciones','geocercas','geocerca_asignaciones','autorizaciones_texto'
  ] loop
    execute format('alter table %I enable row level security', t);
    -- lectura: cualquier usuario de la misma empresa
    execute format($p$create policy %I on %I for select using (mi_rol() = 'superadmin' or empresa_id = mi_empresa())$p$, t || '_leer', t);
    -- escritura: administradores de la empresa
    execute format($p$create policy %I on %I for all using (mi_rol() = 'superadmin' or (empresa_id = mi_empresa() and mi_rol() = 'admin')) with check (mi_rol() = 'superadmin' or (empresa_id = mi_empresa() and mi_rol() = 'admin'))$p$, t || '_admin', t);
  end loop;

  foreach t in array array[
    'trabajadores','jornadas','puntos_gps','ultima_posicion','eventos_dispositivo',
    'eventos_geocerca','alertas','consentimientos','extensiones_jornada'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy %I on %I for select using (puede_ver_trabajador(%s))$p$,
      t || '_leer', t, case when t = 'trabajadores' then 'id' else 'trabajador_id' end);
  end loop;
end $$;

-- El trabajador solo inserta sus propios puntos, eventos y consentimientos
create policy puntos_insertar on puntos_gps for insert
  with check (trabajador_id = auth.uid() and empresa_id = mi_empresa());
create policy eventos_insertar on eventos_dispositivo for insert
  with check (trabajador_id = auth.uid() and empresa_id = mi_empresa());
create policy consentimiento_insertar on consentimientos for insert
  with check (trabajador_id = auth.uid() and empresa_id = mi_empresa());

-- Administradores gestionan trabajadores y alertas de su empresa
create policy trabajadores_admin on trabajadores for all
  using (mi_rol() = 'superadmin' or (empresa_id = mi_empresa() and mi_rol() = 'admin'))
  with check (mi_rol() = 'superadmin' or (empresa_id = mi_empresa() and mi_rol() = 'admin'));
create policy alertas_atender on alertas for update
  using (puede_ver_trabajador(trabajador_id) and mi_rol() in ('admin', 'supervisor', 'superadmin'));

alter table empresas enable row level security;
create policy empresas_leer on empresas for select using (mi_rol() = 'superadmin' or id = mi_empresa());
create policy empresas_superadmin on empresas for all using (mi_rol() = 'superadmin') with check (mi_rol() = 'superadmin');

alter table perfiles enable row level security;
create policy perfiles_leer on perfiles for select using (id = auth.uid() or puede_ver_trabajador(id) or (mi_rol() in ('admin','superadmin') and (mi_rol() = 'superadmin' or empresa_id = mi_empresa())));

-- =============================================================
-- Limpieza: borrar puntos crudos con más de 7 días (programar con pg_cron)
-- select cron.schedule('limpiar-puntos', '0 3 * * *', 'select limpiar_puntos_viejos()');
-- =============================================================
create or replace function limpiar_puntos_viejos() returns void
language sql security definer set search_path = public as $$
  delete from puntos_gps where capturado_en < now() - interval '7 days';
$$;
