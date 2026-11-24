import { createContext, useContext, useState } from 'react';
import { FORMULARIOS_DEFECTO, normalizarPausas } from '../config/formularios';

const NovedadesContext = createContext(null);
const leer = (clave, defecto) => {
  try {
    return JSON.parse(localStorage.getItem(clave) ?? 'null') ?? defecto;
  } catch {
    return defecto;
  }
};
const escribir = (clave, valor) => {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // sin almacenamiento: queda solo mientras la página esté abierta
  }
};

// Configuración de formularios, GPS apagados manualmente y horas de reporte excluidas.
// En la demo se guarda en el navegador; con Supabase, en las tablas de la migración 0014.
export function NovedadesProvider({ children }) {
  const [formularios, setFormularios] = useState(() => {
    const f = { ...FORMULARIOS_DEFECTO, ...leer('miruta.formularios', {}) };
    return { ...f, tiposPausa: normalizarPausas(f.tiposPausa) };
  });
  const [apagados, setApagados] = useState(() => leer('miruta.apagados', []));
  const [exclusiones, setExclusiones] = useState(() => leer('miruta.exclusiones', []));

  const guardarFormularios = (f) => {
    setFormularios(f);
    escribir('miruta.formularios', f);
  };
  // Guarda solo una parte (p. ej. las pausas) sin tocar lo demás: cada parte tiene su propio permiso
  const guardarParte = (cambio) => guardarFormularios({ ...formularios, ...cambio });
  // Apagar el GPS de un trabajador: comentario obligatorio; queda quién, cuándo y por qué
  const apagarGps = (registro) => {
    const nuevos = [{ id: `ap-${Date.now()}`, hora: new Date().toISOString(), ...registro }, ...apagados];
    setApagados(nuevos);
    escribir('miruta.apagados', nuevos);
  };
  // Excluir horas de reporte (capacitaciones): no cuentan para la eficiencia
  const guardarExclusion = (ex) => {
    const nuevas = [{ id: `ex-${Date.now()}`, creadaEn: new Date().toISOString(), ...ex }, ...exclusiones];
    setExclusiones(nuevas);
    escribir('miruta.exclusiones', nuevas);
  };
  const quitarExclusion = (id) => {
    const nuevas = exclusiones.filter((e) => e.id !== id);
    setExclusiones(nuevas);
    escribir('miruta.exclusiones', nuevas);
  };

  return (
    <NovedadesContext.Provider
      value={{
        formularios,
        guardarFormularios,
        guardarParte,
        apagados,
        apagarGps,
        exclusiones,
        guardarExclusion,
        quitarExclusion,
      }}
    >
      {children}
    </NovedadesContext.Provider>
  );
}

export function useNovedades() {
  return useContext(NovedadesContext);
}
