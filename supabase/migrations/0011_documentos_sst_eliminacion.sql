-- 0011 · Documentos del trabajador, rol SST y eliminación del perfil
--
-- Documentos del vehículo (SOAT, licencia, matrícula, técnico-mecánica): los sube el trabajador con la
-- cámara al registrarse y al renovarlos. Cada renovación es una VERSIÓN nueva; las anteriores se conservan.
-- Documentos adicionales (ARL, planilla, alturas, espacios confinados, exámenes médicos): los sube y
-- actualiza SOLO la persona de SST desde la web; el trabajador solo los ve.
-- Exámenes médicos: solo los ven el propio trabajador, SST y el administrador.
-- Avisos de vencimiento (15 días antes y al vencer) al trabajador, al administrador y a SST.
-- Eliminación del perfil: la solicita el trabajador y la aprueba el administrador.
--
-- La pantalla web de SST se hará más adelante; aquí queda lista la base de datos.

alter type rol_usuario add value if not exists 'sst';
alter type tipo_alerta add value if not exists 'documento_vencido';
alter type tipo_alerta add value if not exists 'eliminacion_solicitada';

create type tipo_documento as enum (
  'soat', 'licencia', 'matricula', 'tecnomecanica',               -- vehículo (los sube el trabajador)
  'arl', 'planilla', 'alturas', 'confinados', 'examenes'           -- adicionales (los sube SST)
);

create or replace function es_documento_vehiculo(t tipo_documento) returns boolean
language sql immutable as $$ select t in ('soat', 'licencia', 'matricula', 'tecnomecanica') $$;

-- ---------- Documentos con versiones ----------
create table documentos_trabajador (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  tipo tipo_documento not null,
  version integer not null,
  archivo_path text not null,        -- ruta en el bucket privado "documentos": empresa/trabajador/tipo/vN.jpg
  peso_kb integer,
  vence date,                        -- null = no vence (matrícula)
  detalle text,                      -- p. ej. "Sura · riesgo II" o "Examen periódico · apto"
  vigente boolean not null default true,  -- solo la última versión es la vigente
  subido_por uuid not null references perfiles(id) default auth.uid(),
  subido_en timestamptz not null default now(),
  aviso_15_enviado boolean not null default false,
  aviso_vencido_enviado boolean not null default false,
  unique (trabajador_id, tipo, version),
  check (tipo = 'matricula' or vence is not null)
);
create unique index documentos_vigente on documentos_trabajador (trabajador_id, tipo) where vigente;
create index documentos_vence on documentos_trabajador (vence) where vigente;

-- Al subir una versión nueva: número de versión y la anterior deja de ser la vigente (se conserva)
create or replace function nueva_version_documento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select coalesce(max(version), 0) + 1 into new.version
  from documentos_trabajador where trabajador_id = new.trabajador_id and tipo = new.tipo;
  update documentos_trabajador set vigente = false
  where trabajador_id = new.trabajador_id and tipo = new.tipo and vigente;
  new.vigente := true;
  new.subido_por := auth.uid();
  new.subido_en := now();
  return new;
end $$;
create trigger trg_nueva_version_documento before insert on documentos_trabajador
  for each row execute function nueva_version_documento();

-- ¿Puede el usuario actual VER este documento?
create or replace function puede_ver_documento(t_id uuid, t tipo_documento) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when mi_rol() = 'superadmin' then true
    when t_id = auth.uid() then true                                         -- el propio trabajador
    when mi_rol() in ('admin', 'sst') then
      exists (select 1 from perfiles p where p.id = t_id and p.empresa_id = mi_empresa())
    when mi_rol() = 'supervisor' and t <> 'examenes' then puede_ver_trabajador(t_id) -- nunca exámenes médicos
    else false
  end
$$;

-- ¿Puede el usuario actual SUBIR este documento?
create or replace function puede_subir_documento(t_id uuid, t tipo_documento) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when es_documento_vehiculo(t) then t_id = auth.uid()                     -- vehículo: solo el trabajador
    else mi_rol() = 'sst'                                                    -- adicionales: solo SST
         and exists (select 1 from perfiles p where p.id = t_id and p.empresa_id = mi_empresa())
  end
$$;

alter table documentos_trabajador enable row level security;
create policy documentos_leer on documentos_trabajador for select using (puede_ver_documento(trabajador_id, tipo));
create policy documentos_subir on documentos_trabajador for insert
  with check (empresa_id = mi_empresa() and puede_subir_documento(trabajador_id, tipo));
-- Sin update ni delete: nadie modifica ni borra versiones (el historial queda completo).

-- ---------- Fotos y archivos: bucket privado "documentos" ----------
-- Ruta: {empresa_id}/{trabajador_id}/{tipo}/v{version}.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 1048576, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

create policy documentos_archivos_leer on storage.objects for select using (
  bucket_id = 'documentos'
  and puede_ver_documento(((storage.foldername(name))[2])::uuid, ((storage.foldername(name))[3])::tipo_documento)
);
create policy documentos_archivos_subir on storage.objects for insert with check (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1]::uuid = mi_empresa()
  and puede_subir_documento(((storage.foldername(name))[2])::uuid, ((storage.foldername(name))[3])::tipo_documento)
);

-- SST ve las alertas de documentos de su empresa (no las de GPS, velocidad, etc.)
create policy alertas_sst on alertas for select using (
  mi_rol() = 'sst' and empresa_id = mi_empresa() and tipo in ('documento_por_vencer', 'documento_vencido')
);

-- ---------- Avisos de vencimiento (pg_cron una vez al día) ----------
--   select cron.schedule('avisos-documentos', '0 12 * * *', 'select avisar_documentos()');  -- 7:00 a. m. Colombia
create or replace function avisar_documentos(p_dias integer default 15) returns integer
language plpgsql security definer set search_path = public as $$
declare
  d record;
  n integer := 0;
  v_hoy date := (now() at time zone 'America/Bogota')::date;
  v_nombre text;
begin
  for d in
    select dt.*, concat_ws(' ', p.nombres, p.apellidos) as persona,
      case dt.tipo
        when 'soat' then 'SOAT' when 'licencia' then 'licencia de conducción'
        when 'matricula' then 'matrícula' when 'tecnomecanica' then 'revisión técnico-mecánica'
        when 'arl' then 'ARL' when 'planilla' then 'planilla de seguridad social'
        when 'alturas' then 'certificado de trabajo en alturas'
        when 'confinados' then 'certificado de espacios confinados'
        when 'examenes' then 'exámenes médicos ocupacionales'
      end as nombre
    from documentos_trabajador dt join perfiles p on p.id = dt.trabajador_id
    where dt.vigente and dt.vence is not null
      and ((not dt.aviso_15_enviado and dt.vence <= v_hoy + p_dias and dt.vence >= v_hoy)
        or (not dt.aviso_vencido_enviado and dt.vence < v_hoy))
  loop
    if d.vence < v_hoy then
      -- Alerta para administrador y SST (la ven en la web) y notificación con sonido al trabajador
      insert into alertas (empresa_id, trabajador_id, tipo, mensaje)
      values (d.empresa_id, d.trabajador_id, 'documento_vencido',
        format('%s: %s vencido desde el %s', d.persona, d.nombre, to_char(d.vence, 'DD/MM/YYYY')));
      insert into notificaciones_trabajador (empresa_id, trabajador_id, titulo, cuerpo, datos)
      values (d.empresa_id, d.trabajador_id, 'Documento vencido',
        format('Tu %s venció el %s.%s', d.nombre, to_char(d.vence, 'DD/MM/YYYY'),
          case when es_documento_vehiculo(d.tipo) then ' Actualízalo en Mi perfil.' else ' SST lo actualizará.' end),
        jsonb_build_object('tipo', 'documento', 'documento', d.tipo));
      update documentos_trabajador set aviso_vencido_enviado = true, aviso_15_enviado = true where id = d.id;
    else
      insert into alertas (empresa_id, trabajador_id, tipo, mensaje)
      values (d.empresa_id, d.trabajador_id, 'documento_por_vencer',
        format('%s: %s vence el %s (en %s días)', d.persona, d.nombre, to_char(d.vence, 'DD/MM/YYYY'), d.vence - v_hoy));
      insert into notificaciones_trabajador (empresa_id, trabajador_id, titulo, cuerpo, datos)
      values (d.empresa_id, d.trabajador_id, 'Documento próximo a vencer',
        format('Tu %s vence el %s. Renuévalo a tiempo.', d.nombre, to_char(d.vence, 'DD/MM/YYYY')),
        jsonb_build_object('tipo', 'documento', 'documento', d.tipo));
      update documentos_trabajador set aviso_15_enviado = true where id = d.id;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- Eliminación del perfil (la aprueba el administrador) ----------
create type estado_eliminacion as enum ('pendiente', 'aprobada', 'rechazada', 'cancelada');

create table solicitudes_eliminacion (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references perfiles(id) on delete cascade,
  estado estado_eliminacion not null default 'pendiente',
  motivo text,
  solicitada_en timestamptz not null default now(),
  resuelta_por uuid references perfiles(id),
  resuelta_en timestamptz,
  nota_admin text
);
create unique index una_solicitud_pendiente on solicitudes_eliminacion (trabajador_id) where estado = 'pendiente';
alter table solicitudes_eliminacion enable row level security;
create policy eliminacion_leer on solicitudes_eliminacion for select using (puede_ver_trabajador(trabajador_id));
create policy eliminacion_solicitar on solicitudes_eliminacion for insert
  with check (trabajador_id = auth.uid() and empresa_id = mi_empresa() and estado = 'pendiente');
-- El trabajador solo puede cancelar su propia solicitud pendiente
create policy eliminacion_cancelar on solicitudes_eliminacion for update
  using (trabajador_id = auth.uid() and estado = 'pendiente')
  with check (estado = 'cancelada');

create or replace function avisar_solicitud_eliminacion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into alertas (empresa_id, trabajador_id, tipo, mensaje)
  values (new.empresa_id, new.trabajador_id, 'eliminacion_solicitada',
    'Solicitó eliminar su perfil. Revisa y aprueba o rechaza la solicitud.');
  return new;
end $$;
create trigger trg_solicitud_eliminacion after insert on solicitudes_eliminacion
  for each row execute function avisar_solicitud_eliminacion();

-- Aprobar o rechazar (solo el administrador de la empresa).
-- Al aprobar: se borran los datos personales y los documentos del vehículo, se desactiva la cuenta y se
-- desvincula el celular. Se CONSERVAN los registros que la ley exige guardar (p. ej. documentos de SST,
-- que el Decreto 1072 de 2015 pide conservar 20 años), sin datos de contacto.
-- Las fotos del bucket se borran con la Edge Function "borrar-archivos" al ver estado = 'aprobada'.
create or replace function resolver_eliminacion(p_solicitud uuid, p_aprobar boolean, p_nota text default null)
returns void language plpgsql security definer set search_path = public as $$
declare s solicitudes_eliminacion;
begin
  select * into s from solicitudes_eliminacion where id = p_solicitud and estado = 'pendiente' for update;
  if not found then raise exception 'solicitud_no_encontrada'; end if;
  if not (mi_rol() = 'superadmin' or (mi_rol() = 'admin' and s.empresa_id = mi_empresa())) then
    raise exception 'sin_permiso';
  end if;

  update solicitudes_eliminacion
  set estado = case when p_aprobar then 'aprobada'::estado_eliminacion else 'rechazada' end,
      resuelta_por = auth.uid(), resuelta_en = now(), nota_admin = p_nota
  where id = s.id;
  if not p_aprobar then return; end if;

  delete from documentos_trabajador where trabajador_id = s.trabajador_id and es_documento_vehiculo(tipo);
  update trabajadores set telefono = null, correo = null, direccion = null, foto_url = null,
    contacto_emergencia_nombre = null, contacto_emergencia_telefono = null, tipo_sangre = null
  where id = s.trabajador_id;
  update perfiles set activo = false where id = s.trabajador_id;
end $$;
