import { createContext, useContext, useMemo } from 'react';
import { PERMISOS } from '../config/permisos';
import { api } from '../services/api';

const PermisosContext = createContext(null);

// Permisos del rol del usuario. Con Supabase se leen de permisos_rol (0012) al iniciar sesión.
export function PermisosProvider({ children }) {
  const activos = useMemo(() => new Set(api.getPermisos()), []);
  const puede = (clave) => {
    if (!PERMISOS[clave]) {
      console.warn(`[permisos] clave desconocida: ${clave}`); // función sin registrar en config/permisos.js
      return false;
    }
    return activos.has(clave);
  };
  return <PermisosContext.Provider value={{ puede }}>{children}</PermisosContext.Provider>;
}

export function usePermisos() {
  return useContext(PermisosContext);
}

// Muestra su contenido solo si el rol tiene el permiso: <Permiso clave="reportes.enviar">…</Permiso>
export function Permiso({ clave, children, sino = null }) {
  const { puede } = usePermisos();
  return puede(clave) ? children : sino;
}
