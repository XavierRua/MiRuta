-- =============================================================
-- MiRuta · Ingreso con celular vinculado + PIN (sin biometría)
-- Cada trabajador solo puede usar la app en un celular a la vez.
-- Requiere 0001 y 0002.
-- =============================================================

alter type tipo_alerta add value if not exists 'intento_otro_celular';
alter type tipo_alerta add value if not exists 'pin_bloqueado';

-- Celular vinculado (uno activo por trabajador)
create table dispositivos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  id_instalacion text not null,          -- identificador que crea la app al instalarse (no es un dato biométrico)
  modelo text,
  sistema text,
  vinculado_en timestamptz not null default now(),
  desvinculado_en timestamptz,
  desvinculado_por uuid references perfiles(id),
  activo boolean not null default true
);
create unique index un_celular_activo_por_trabajador on dispositivos (trabajador_id) where activo;

-- Códigos de activación: 6 dígitos, un solo uso, vencen en 24 h. Se guarda solo su huella.
create table codigos_activacion (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  huella text not null,                  -- sha256(codigo)
  creado_por uuid references perfiles(id),
  creado_en timestamptz not null default now(),
  vence_en timestamptz not null default now() + interval '24 hours',
  usado_en timestamptz
);

alter table dispositivos enable row level security;
alter table codigos_activacion enable row level security;
create policy dispositivos_leer on dispositivos for select using (puede_ver_trabajador(trabajador_id));
create policy dispositivos_admin on dispositivos for update
  using (mi_rol() in ('admin', 'superadmin') and (mi_rol() = 'superadmin' or empresa_id = mi_empresa()));
-- Los códigos solo los manejan las funciones de abajo (nadie los lee directamente)

-- ---------- Generar código (lo llama el administrador desde la web) ----------
create or replace function generar_codigo_activacion(p_trabajador uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_codigo text := lpad((floor(random() * 1000000))::int::text, 6, '0');
  v_empresa uuid;
begin
  select empresa_id into v_empresa from trabajadores where id = p_trabajador;
  if not (mi_rol() = 'superadmin' or (mi_rol() = 'admin' and v_empresa = mi_empresa())) then
    raise exception 'Sin permiso';
  end if;
  -- invalida códigos anteriores sin usar
  update codigos_activacion set usado_en = now() where trabajador_id = p_trabajador and usado_en is null;
  insert into codigos_activacion (empresa_id, trabajador_id, huella, creado_por)
  values (v_empresa, p_trabajador, encode(digest(v_codigo, 'sha256'), 'hex'), auth.uid());
  return v_codigo;  -- se muestra una sola vez al administrador
end $$;

-- ---------- Activar celular (lo llama la Edge Function "activar-celular") ----------
-- Devuelve el id del trabajador si todo está bien; si no, lanza un error con el motivo.
-- Si la cuenta ya tiene otro celular activo y el código no es válido, crea la alerta para el administrador.
create or replace function activar_celular(
  p_codigo_empresa text, p_cedula text, p_codigo text, p_id_instalacion text, p_modelo text, p_sistema text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_trab record;
  v_cod record;
  v_actual record;
begin
  select t.id, t.empresa_id into v_trab
  from trabajadores t join empresas e on e.id = t.empresa_id
  where e.codigo_acceso = upper(trim(p_codigo_empresa)) and t.cedula = regexp_replace(p_cedula, '\D', '', 'g');
  if not found then raise exception 'cuenta_no_encontrada'; end if;

  select * into v_actual from dispositivos where trabajador_id = v_trab.id and activo;

  select * into v_cod from codigos_activacion
  where trabajador_id = v_trab.id and usado_en is null and vence_en > now()
    and huella = encode(digest(p_codigo, 'sha256'), 'hex');

  if not found then
    if v_actual.id is not null and v_actual.id_instalacion <> p_id_instalacion then
      insert into alertas (empresa_id, trabajador_id, tipo, mensaje)
      values (v_trab.empresa_id, v_trab.id, 'intento_otro_celular',
        format('Intentaron activar su cuenta en otro celular (%s). Su celular vinculado es %s', p_modelo, v_actual.modelo));
      raise exception 'otro_celular';
    end if;
    raise exception 'codigo_invalido';
  end if;

  -- Código válido: desvincula el celular anterior (si había) y vincula este
  update codigos_activacion set usado_en = now() where id = v_cod.id;
  update dispositivos set activo = false, desvinculado_en = now() where trabajador_id = v_trab.id and activo;
  insert into dispositivos (empresa_id, trabajador_id, id_instalacion, modelo, sistema)
  values (v_trab.empresa_id, v_trab.id, p_id_instalacion, p_modelo, p_sistema);
  return v_trab.id;
end $$;

-- ---------- Solo el celular vinculado puede enviar datos ----------
-- La app envía el encabezado "x-miruta-celular" con su id de instalación en cada petición.
create or replace function celular_valido() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from dispositivos
    where trabajador_id = auth.uid() and activo
      and id_instalacion = coalesce(current_setting('request.headers', true)::json ->> 'x-miruta-celular', '')
  )
$$;

drop policy if exists puntos_insertar on puntos_gps;
create policy puntos_insertar on puntos_gps for insert
  with check (trabajador_id = auth.uid() and empresa_id = mi_empresa() and celular_valido());

drop policy if exists reportes_insertar on reportes_actividad;
create policy reportes_insertar on reportes_actividad for insert
  with check (trabajador_id = auth.uid() and empresa_id = mi_empresa() and estado <> 'no_enviado' and celular_valido());

-- ---------- Bloqueo por PIN (la app lo informa) ----------
create or replace function reportar_pin_bloqueado(p_modelo text) returns void
language sql security definer set search_path = public as $$
  insert into alertas (empresa_id, trabajador_id, tipo, mensaje)
  select empresa_id, id, 'pin_bloqueado',
         format('La app se bloqueó por 5 PIN incorrectos en %s. Genera un código de activación para reactivarla', p_modelo)
  from trabajadores where id = auth.uid();
$$;
