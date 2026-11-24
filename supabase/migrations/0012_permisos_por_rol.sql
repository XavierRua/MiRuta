-- 0012 · Permisos por rol ("interruptores" de cada función)
-- Cada función de la app tiene una clave (apps/mobile/src/config/permisos.js). El administrador de cada
-- empresa enciende o apaga cada permiso por rol desde la web; la app lee los permisos de su rol al entrar.
-- Las claves del catálogo deben coincidir con config/permisos.js.

create table permisos_catalogo (
  clave text primary key,
  grupo text not null,
  descripcion text not null
);

insert into permisos_catalogo (clave, grupo, descripcion) values
  ('jornada.indicador.recorrido', 'Jornada', 'Ver el recorrido del día en vehículo (km)'),
  ('jornada.indicador.visitas', 'Jornada', 'Ver el indicador de visitas del día'),
  ('jornada.indicador.eficiencia', 'Jornada', 'Ver el indicador de eficiencia del día'),
  ('jornada.indicador.velocidad', 'Jornada', 'Ver la velocidad actual y el resumen de velocidad'),
  ('reportes.enviar', 'Reportes', 'Enviar el reporte de actividad de cada hora'),
  ('reportes.verDia', 'Reportes', 'Ver sus reportes del día'),
  ('horasExtra.usar', 'Horas extras', 'Iniciar y finalizar horas extras'),
  ('visitas.ver', 'Visitas', 'Ver sus visitas de hoy y su detalle'),
  ('visitas.verTodasMapa', 'Visitas', 'Ver todas las visitas del día en un mapa'),
  ('visitas.verUbicacion', 'Visitas', 'Ver la ubicación de una visita, su geocerca y la distancia'),
  ('visitas.comoLlegar', 'Visitas', 'Abrir la ruta en Google Maps o Waze'),
  ('historial.filtro.horasExtra', 'Historial', 'Filtro de horas extras del período'),
  ('historial.filtro.km', 'Historial', 'Filtro de kilometraje del período'),
  ('historial.filtro.eficiencia', 'Historial', 'Filtro de eficiencia del período'),
  ('historial.filtro.excesos', 'Historial', 'Filtro de excesos de velocidad del período'),
  ('historial.visitas', 'Historial', 'Ver el cumplimiento de visitas en el historial'),
  ('historial.reportes', 'Historial', 'Ver los reportes de días anteriores'),
  ('perfil.vehiculo.ver', 'Mi perfil', 'Ver su vehículo y los documentos del vehículo'),
  ('documentos.vehiculo.actualizar', 'Mi perfil', 'Actualizar los documentos del vehículo al renovarlos'),
  ('documentos.adicionales.ver', 'Mi perfil', 'Ver sus documentos adicionales (ARL, planilla, certificados, exámenes)'),
  ('perfil.horario.ver', 'Mi perfil', 'Ver su horario'),
  ('perfil.datos.ver', 'Mi perfil', 'Ver sus datos personales'),
  ('perfil.solicitarEliminacion', 'Mi perfil', 'Solicitar la eliminación de su perfil');

create table permisos_rol (
  empresa_id uuid not null references empresas(id) on delete cascade,
  rol rol_usuario not null,
  permiso text not null references permisos_catalogo(clave) on delete cascade,
  activo boolean not null default true,
  actualizado_por uuid references perfiles(id),
  actualizado_en timestamptz not null default now(),
  primary key (empresa_id, rol, permiso)
);

alter table permisos_catalogo enable row level security;
create policy permisos_catalogo_leer on permisos_catalogo for select using (auth.uid() is not null);

alter table permisos_rol enable row level security;
-- Cada usuario lee los permisos de su empresa (la app solo usa los de su rol)
create policy permisos_rol_leer on permisos_rol for select using (mi_rol() = 'superadmin' or empresa_id = mi_empresa());
-- Solo el administrador de la empresa (o el superadministrador) los cambia
create policy permisos_rol_admin on permisos_rol for all
  using (mi_rol() = 'superadmin' or (empresa_id = mi_empresa() and mi_rol() = 'admin'))
  with check (mi_rol() = 'superadmin' or (empresa_id = mi_empresa() and mi_rol() = 'admin'));

-- Permisos del usuario actual (los que usa la app al iniciar sesión)
create or replace function mis_permisos() returns setof text
language sql stable security definer set search_path = public as $$
  select permiso from permisos_rol
  where empresa_id = mi_empresa() and rol = mi_rol() and activo
$$;

-- Al crear una empresa: el trabajador arranca con todos los permisos encendidos
create or replace function permisos_iniciales() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into permisos_rol (empresa_id, rol, permiso)
  select new.id, 'trabajador', clave from permisos_catalogo
  on conflict do nothing;
  return new;
end $$;
create trigger trg_permisos_iniciales after insert on empresas
  for each row execute function permisos_iniciales();

-- Empresas que ya existían
insert into permisos_rol (empresa_id, rol, permiso)
select e.id, 'trabajador', c.clave from empresas e cross join permisos_catalogo c
on conflict do nothing;
