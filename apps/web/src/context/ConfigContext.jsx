import { createContext, useContext, useState } from 'react';
import { INDICADORES_DEFECTO } from '../config/indicadores';

const ConfigContext = createContext(null);
const CLAVE = 'miruta.indicadores';

// En la demo se guarda en el navegador. Con Supabase se guarda en la tabla configuracion_empresa.
function leer() {
  try {
    return { ...INDICADORES_DEFECTO, ...JSON.parse(localStorage.getItem(CLAVE) ?? '{}') };
  } catch {
    return INDICADORES_DEFECTO;
  }
}

export function ConfigProvider({ children }) {
  const [indicadores, setIndicadores] = useState(leer);
  // Logo de cada empresa (empresaId → imagen). Con Supabase: empresas.logo_url (bucket "logos", 0015)
  const [logos, setLogos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('miruta.logos') ?? '{}');
    } catch {
      return {};
    }
  });
  const guardarLogo = (empresaId, imagen) => {
    const nuevos = { ...logos };
    if (imagen) nuevos[empresaId] = imagen;
    else delete nuevos[empresaId];
    setLogos(nuevos);
    try {
      localStorage.setItem('miruta.logos', JSON.stringify(nuevos));
    } catch {
      // imagen muy pesada para el navegador: queda solo mientras la página esté abierta
    }
  };

  const guardarIndicadores = (nuevos) => {
    setIndicadores(nuevos);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(nuevos));
    } catch {
      // sin almacenamiento: queda solo mientras la página esté abierta
    }
  };

  return (
    <ConfigContext.Provider value={{ indicadores, guardarIndicadores, logos, guardarLogo }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
