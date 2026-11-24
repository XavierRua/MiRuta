import { createContext, useContext, useState } from 'react';
import { api } from '../services/api';

const SesionContext = createContext(null);

// Guarda quién inició sesión, la empresa seleccionada y la pantalla actual
export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [empresaId, setEmpresaId] = useState(api.getEmpresas()[0].id);
  const [pantalla, irA] = useState('mapa');

  const entrar = () => setUsuario({ nombre: 'Admin Demo', iniciales: 'AD', rol: 'Superadministrador' });
  const salir = () => {
    setUsuario(null);
    irA('mapa');
  };

  return (
    <SesionContext.Provider value={{ usuario, entrar, salir, empresaId, setEmpresaId, pantalla, irA }}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  return useContext(SesionContext);
}
