import { createContext, useContext, useState } from 'react';
import { api } from '../services/api';
import { ROLES_WEB } from '../config/permisos';

const SesionContext = createContext(null);

// Guarda quién inició sesión, la empresa seleccionada y la pantalla actual
export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [empresaId, setEmpresaId] = useState(api.getEmpresas()[0].id);
  const [pantalla, irA] = useState('mapa');

  const entrar = () =>
    setUsuario({ nombre: 'Admin Demo', iniciales: 'AD', rol: 'Superadministrador', rolClave: 'superadmin' });
  // Demo: ver el panel como otro perfil para probar los permisos (con Supabase el perfil viene del usuario)
  const cambiarPerfilDemo = (rolClave) =>
    setUsuario((u) => ({ ...u, rolClave, rol: ROLES_WEB.find((r) => r.id === rolClave)?.texto ?? rolClave }));
  const salir = () => {
    setUsuario(null);
    irA('mapa');
  };

  return (
    <SesionContext.Provider
      value={{ usuario, entrar, salir, cambiarPerfilDemo, empresaId, setEmpresaId, pantalla, irA }}
    >
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  return useContext(SesionContext);
}
