import { createContext, useContext, useState } from 'react';
import { PERMISOS_WEB_POR_ROL, ROLES_CONFIGURABLES } from '../config/permisos';
import { useSesion } from './SesionContext';

const PermisosContext = createContext(null);
const CLAVE = 'miruta.permisosWeb';
const leer = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? 'null') ?? PERMISOS_WEB_POR_ROL;
  } catch {
    return PERMISOS_WEB_POR_ROL;
  }
};

// Permisos del perfil que inició sesión. puede('web.pausas.configurar') → true / false.
// En la demo se guardan en el navegador; con Supabase, en permisos_rol (y el servidor los vuelve a revisar).
export function PermisosProvider({ children }) {
  const { usuario } = useSesion();
  const [porRol, setPorRol] = useState(leer);
  const rol = usuario?.rolClave ?? 'admin';

  const puede = (clave) => rol === 'superadmin' || rol === 'admin' || (porRol[rol] ?? []).includes(clave);
  const tiene = (r, clave) => (porRol[r] ?? []).includes(clave);
  const esAdministrador = rol === 'superadmin' || rol === 'admin';

  // Solo el administrador enciende o apaga permisos de los demás perfiles
  const cambiarPermiso = (r, clave, encendido) => {
    if (!esAdministrador || !ROLES_CONFIGURABLES.includes(r)) return;
    const lista = new Set(porRol[r] ?? []);
    if (encendido) lista.add(clave);
    else lista.delete(clave);
    const nuevo = { ...porRol, [r]: [...lista] };
    setPorRol(nuevo);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(nuevo));
    } catch {
      // sin almacenamiento: queda solo mientras la página esté abierta
    }
  };

  return (
    <PermisosContext.Provider value={{ rol, puede, tiene, esAdministrador, cambiarPermiso }}>
      {children}
    </PermisosContext.Provider>
  );
}

export function usePermisos() {
  return useContext(PermisosContext);
}

// <Permiso clave="web.pausas.configurar">…</Permiso>: muestra su contenido solo si el perfil tiene el permiso
export function Permiso({ clave, children }) {
  const { puede } = usePermisos();
  return puede(clave) ? children : null;
}
